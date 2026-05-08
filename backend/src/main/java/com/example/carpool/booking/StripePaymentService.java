package com.example.carpool.booking;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Value("${app.payment.stripe.secret-key:}")
    private String stripeSecretKey;

    @Value("${app.payment.stripe.success-url:http://localhost:5173/payment-success}")
    private String successUrl;

    @Value("${app.payment.stripe.cancel-url:http://localhost:5173/payment-cancel}")
    private String cancelUrl;

    @Value("${app.payment.stripe.webhook-secret:}")
    private String webhookSecret;

    @Transactional
    public CreateCheckoutSessionResponse createCheckoutSession(Long bookingId, Long passengerId) {
        if (stripeSecretKey == null || stripeSecretKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe secret key is missing.");
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
            throw new IllegalArgumentException("Booking is not in payable state");
        }
        if (booking.getStatus() == BookingStatus.CANCELED || booking.getStatus() == BookingStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot pay canceled/rejected booking");
        }

        long amountCents = toCents(booking.getRide().getPrice(), booking.getSeatsReserved());
        Stripe.apiKey = stripeSecretKey;

        SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .putMetadata("bookingId", booking.getId().toString())
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency("eur")
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Stripe error: " + e.getMessage());
        }
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

