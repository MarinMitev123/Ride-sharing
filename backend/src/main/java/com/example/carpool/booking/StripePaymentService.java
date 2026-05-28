package com.example.carpool.booking;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private static final Logger log = LoggerFactory.getLogger(StripePaymentService.class);

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    /** Env има приоритет; иначе application-local.yml (app.payment.stripe.secret-key). */
    @Value("${STRIPE_SECRET_KEY:${app.payment.stripe.secret-key:}}")
    private String stripeSecretKey;

    @Value("${app.payment.stripe.success-url:http://localhost:5173/payment-success}")
    private String successUrl;

    @Value("${app.payment.stripe.cancel-url:http://localhost:5173/payment-cancel}")
    private String cancelUrl;

    @Value("${STRIPE_WEBHOOK_SECRET:${app.payment.stripe.webhook-secret:}}")
    private String webhookSecret;

    @Value("${app.payment.stripe.currency:eur}")
    private String stripeCurrency;

    /** Точни HTTPS origin-и на фронтенда през тунел (ngrok и т.н.), запетая-разделени. */
    @Value("${app.payment.stripe.extra-frontend-origins:}")
    private String extraFrontendOriginsCsv;

    private final Set<String> allowedTunnelFrontendOrigins = new HashSet<>();

    @PostConstruct
    void trimStripeConfig() {
        if (stripeSecretKey != null) {
            stripeSecretKey = stripeSecretKey.trim();
        }
        if (stripeCurrency != null) {
            stripeCurrency = stripeCurrency.trim().toLowerCase();
        }
        allowedTunnelFrontendOrigins.clear();
        if (extraFrontendOriginsCsv != null && !extraFrontendOriginsCsv.isBlank()) {
            for (String part : extraFrontendOriginsCsv.split(",")) {
                String o = normalizeFrontendOrigin(part);
                if (!o.isEmpty()) {
                    allowedTunnelFrontendOrigins.add(o);
                }
            }
        }
    }

    @Transactional
    public CreateCheckoutSessionResponse createCheckoutSession(Long bookingId, Long passengerId, String frontendOrigin) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe secret key is missing.");
        }
        if (!stripeSecretKey.startsWith("sk_test_") && !stripeSecretKey.startsWith("sk_live_")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Невалиден Stripe secret key. Използвайте sk_test_... от Dashboard, не publishable key (pk_test_).");
        }
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!booking.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Not your booking");
        }
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            throw new IllegalArgumentException("Booking is already paid");
        }
        boolean statusAllowsPayment = booking.getStatus() == BookingStatus.PENDING_PAYMENT
                && booking.getPaymentStatus() == PaymentStatus.PENDING;
        if (!statusAllowsPayment) {
            throw new IllegalArgumentException(
                    "Резервацията не е готова за плащане. Очаква се статус PENDING_PAYMENT след одобрение от шофьора (сега: "
                            + booking.getStatus() + ", плащане: " + booking.getPaymentStatus() + ").");
        }
        if (booking.getStatus() == BookingStatus.CANCELED || booking.getStatus() == BookingStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot pay canceled/rejected booking");
        }

        long amountCents = toCents(booking.getRide().getPrice(), booking.getSeatsReserved());
        long minCents = minimumChargeCents(stripeCurrency);
        if (amountCents < minCents) {
            throw new IllegalArgumentException(
                    "Сумата за плащане е твърде малка (" + amountCents + " стотинки). "
                            + "Задайте цена на пътуването поне " + (minCents / 100.0) + " "
                            + stripeCurrency.toUpperCase() + ".");
        }
        Stripe.apiKey = stripeSecretKey;

        String successWithSession = buildSuccessUrl(frontendOrigin);
        String cancelWithBase = buildCancelUrl(frontendOrigin);

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successWithSession)
                .setCancelUrl(cancelWithBase)
                .putMetadata("bookingId", booking.getId().toString())
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(stripeCurrency)
                                                .setUnitAmount(amountCents)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName("Carpool booking #" + booking.getId())
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                )
                .build();

        try {
            Session session = createStripeSession(params);
            booking.setPaymentMethod(PaymentMethod.CARD);
            booking.setPaymentStatus(PaymentStatus.PENDING);
            booking.setPaymentReference(session.getId());
            bookingRepository.save(booking);

            PaymentEntity payment = PaymentEntity.builder()
                    .bookingId(booking.getId())
                    .amount(toAmount(booking.getRide().getPrice(), booking.getSeatsReserved()))
                    .status(PaymentRecordStatus.PENDING)
                    .sessionId(session.getId())
                    .createdAt(LocalDateTime.now())
                    .build();
            paymentRepository.save(payment);
            return new CreateCheckoutSessionResponse(session.getId());
        } catch (StripeException e) {
            log.warn("Stripe checkout failed for booking {}: {}", bookingId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe error: " + e.getMessage());
        }
    }

    /** Локален dev (http + порт 5173) или изрично зададени HTTPS origin-и от тунел. */
    private String resolveAllowedFrontendOrigin(String frontendOrigin) {
        if (frontendOrigin == null || frontendOrigin.isBlank()) {
            return null;
        }
        String t = normalizeFrontendOrigin(frontendOrigin);
        if (t.isEmpty()) {
            return null;
        }
        if (!allowedTunnelFrontendOrigins.isEmpty() && allowedTunnelFrontendOrigins.contains(t)) {
            return t;
        }
        if (!t.startsWith("http://")) {
            return null;
        }
        try {
            URI u = URI.create(t);
            if (u.getPort() != 5173) {
                return null;
            }
            String host = u.getHost();
            if (host == null) {
                return null;
            }
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) {
                return t;
            }
            if (isPrivateLanIpv4(host)) {
                return t;
            }
        } catch (IllegalArgumentException ignored) {
            return null;
        }
        return null;
    }

    private static String normalizeFrontendOrigin(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().replaceAll("/+$", "");
    }

    private static boolean isPrivateLanIpv4(String host) {
        if (!host.matches("^\\d{1,3}(\\.\\d{1,3}){3}$")) {
            return false;
        }
        String[] p = host.split("\\.");
        int a = Integer.parseInt(p[0]);
        int b = Integer.parseInt(p[1]);
        if (a == 10) {
            return true;
        }
        if (a == 172 && b >= 16 && b <= 31) {
            return true;
        }
        return a == 192 && b == 168;
    }

    private String buildSuccessUrl(String frontendOrigin) {
        String allowed = resolveAllowedFrontendOrigin(frontendOrigin);
        String base = allowed != null ? allowed + "/payment-success" : (successUrl != null ? successUrl.trim() : "");
        if (!base.contains("{CHECKOUT_SESSION_ID}")) {
            String sep = base.contains("?") ? "&" : "?";
            base = base + sep + "session_id={CHECKOUT_SESSION_ID}";
        }
        return base;
    }

    private String buildCancelUrl(String frontendOrigin) {
        String allowed = resolveAllowedFrontendOrigin(frontendOrigin);
        if (allowed != null) {
            return allowed + "/payment-cancel";
        }
        return cancelUrl != null ? cancelUrl.trim() : "";
    }

    /**
     * След успешен Checkout браузърът се връща с ?session_id=… – потвърждаваме с Stripe API,
     * за да обновим резервацията без да разчитаме само на webhook (полезно при localhost).
     */
    @Transactional
    public BookingDto confirmCheckoutSession(String sessionId, Long passengerId) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe secret key is missing.");
        }
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("Липсва session_id.");
        }
        Stripe.apiKey = stripeSecretKey;
        Session session;
        try {
            session = Session.retrieve(sessionId.trim());
        } catch (StripeException e) {
            log.warn("Stripe retrieve session failed: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe error: " + e.getMessage());
        }
        String paymentStatus = session.getPaymentStatus();
        if (paymentStatus == null || !"paid".equalsIgnoreCase(paymentStatus)) {
            throw new IllegalArgumentException(
                    "Плащането все още не е потвърдено в Stripe (статус: " + paymentStatus + "). Опреснете след малко.");
        }
        Long bookingId = parseBookingId(session.getMetadata());
        if (bookingId == null) {
            throw new IllegalArgumentException("Липсва bookingId в метаданните на сесията.");
        }
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!booking.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Not your booking");
        }
        if (booking.getPaymentStatus() == PaymentStatus.PAID) {
            return BookingMapper.toDto(booking);
        }

        final BookingEntity b = booking;
        PaymentEntity payment = paymentRepository.findBySessionId(session.getId())
                .or(() -> paymentRepository.findTopByBookingIdOrderByIdDesc(bookingId))
                .orElseGet(() -> PaymentEntity.builder()
                        .bookingId(bookingId)
                        .amount(toAmount(b.getRide().getPrice(), b.getSeatsReserved()))
                        .createdAt(LocalDateTime.now())
                        .build());
        payment.setSessionId(session.getId());
        payment.setStatus(PaymentRecordStatus.PAID);
        paymentRepository.save(payment);

        b.setPaymentMethod(PaymentMethod.CARD);
        b.setPaymentStatus(PaymentStatus.PAID);
        b.setPaymentReference(session.getId());
        b.setStatus(BookingStatus.APPROVED);
        BookingEntity saved = bookingRepository.save(b);
        log.info("Checkout session {} confirmed for booking {}", session.getId(), bookingId);
        return BookingMapper.toDto(saved);
    }

    private static long minimumChargeCents(String currency) {
        if ("eur".equalsIgnoreCase(currency)) {
            return 50L; // 0.50 EUR (Stripe minimum)
        }
        return 50L;
    }

    @Transactional
    public void handleWebhook(String payload, String signature) {
        try {
            if (webhookSecret == null || webhookSecret.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "STRIPE_WEBHOOK_SECRET is missing.");
            }
            if (signature == null || signature.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe signature header is missing.");
            }
            Event event = constructStripeEvent(payload, signature, webhookSecret);

            String type = event.getType();
            if (!"checkout.session.completed".equals(type)
                    && !"checkout.session.expired".equals(type)
                    && !"checkout.session.async_payment_failed".equals(type)) {
                return;
            }

            Session session = (Session) event.getDataObjectDeserializer()
                    .getObject().orElse(null);
            if (session == null) return;

            Long bookingId = parseBookingId(session.getMetadata());
            if (bookingId == null) return;

            BookingEntity booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking == null) return;
            if (booking.getPaymentStatus() == PaymentStatus.PAID) return;

            PaymentRecordStatus paymentRecordStatus =
                    "checkout.session.completed".equals(type) ? PaymentRecordStatus.PAID : PaymentRecordStatus.FAILED;
            PaymentStatus bookingPaymentStatus =
                    "checkout.session.completed".equals(type) ? PaymentStatus.PAID : PaymentStatus.FAILED;

            PaymentEntity payment = paymentRepository.findBySessionId(session.getId())
                    .or(() -> paymentRepository.findTopByBookingIdOrderByIdDesc(bookingId))
                    .orElseGet(() -> PaymentEntity.builder()
                            .bookingId(bookingId)
                            .amount(toAmount(booking.getRide().getPrice(), booking.getSeatsReserved()))
                            .createdAt(LocalDateTime.now())
                            .build());
            if (payment.getStatus() == PaymentRecordStatus.PAID) return;
            payment.setSessionId(session.getId());
            payment.setStatus(paymentRecordStatus);
            paymentRepository.save(payment);

            booking.setPaymentMethod(PaymentMethod.CARD);
            booking.setPaymentStatus(bookingPaymentStatus);
            booking.setPaymentReference(session.getId());
            if (bookingPaymentStatus == PaymentStatus.PAID) {
                booking.setStatus(BookingStatus.APPROVED);
            }
            bookingRepository.save(booking);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ignored) {
            // webhook should be resilient and non-blocking
        }
    }

    private Long parseBookingId(Map<String, String> metadata) {
        if (metadata == null) return null;
        String bookingIdStr = metadata.get("bookingId");
        if (bookingIdStr == null || bookingIdStr.isBlank()) return null;
        try {
            return Long.parseLong(bookingIdStr);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static BigDecimal toAmount(BigDecimal amount, Integer seats) {
        BigDecimal total = amount != null ? amount : BigDecimal.ZERO;
        int s = seats != null && seats > 0 ? seats : 1;
        return total.multiply(BigDecimal.valueOf(s));
    }

    private static long toCents(BigDecimal amount, Integer seats) {
        return toAmount(amount, seats)
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();
    }

    Session createStripeSession(SessionCreateParams params) throws StripeException {
        return Session.create(params);
    }

    Event constructStripeEvent(String payload, String signature, String secret) {
        try {
            return Webhook.constructEvent(payload, signature, secret);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid Stripe webhook signature", ex);
        }
    }
}

