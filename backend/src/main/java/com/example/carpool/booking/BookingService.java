package com.example.carpool.booking;

import com.example.carpool.chat.ConversationService;
import com.example.carpool.notification.NotificationService;
import com.example.carpool.notification.NotificationType;
import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.ride.RideStatus;
import com.example.carpool.ride.RideStopEntity;
import com.example.carpool.ride.RideStopRepository;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RideRepository rideRepository;
    private final RideStopRepository rideStopRepository;
    private final UserRepository userRepository;
    private final ConversationService conversationService;
    private final NotificationService notificationService;

    @Transactional
    public BookingDto create(Long rideId, Long passengerId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        UserEntity passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (ride.getDriver() != null && ride.getDriver().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Driver cannot book own ride");
        }
        if (bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, passengerId, List.of(BookingStatus.PENDING, BookingStatus.PENDING_PAYMENT, BookingStatus.APPROVED))) {
            throw new IllegalArgumentException("Already booked");
        }
        if (ride.getAvailableSeats() == null || ride.getAvailableSeats() <= 0) {
            throw new IllegalArgumentException("No available seats");
        }
        BookingEntity entity = BookingEntity.builder()
                .ride(ride)
                .passenger(passenger)
                .status(BookingStatus.PENDING)
                .build();
        entity = bookingRepository.save(entity);
        conversationService.ensureConversationForBooking(ride.getId(), ride.getDriver().getId(), passenger.getId());
        notifyDriverForBookingRequest(ride, passenger, entity);
        return BookingMapper.toDto(entity);
    }

    @Transactional
    public BookingDto createWithStops(Long rideId, Long passengerId, Long pickupStopId, Long dropoffStopId, int seatsReserved,
                                      PaymentMethod paymentMethod, Double passengerPickupLat, Double passengerPickupLng) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        UserEntity passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (ride.getDriver() != null && ride.getDriver().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Driver cannot book own ride");
        }
        if (bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, passengerId, List.of(BookingStatus.PENDING, BookingStatus.PENDING_PAYMENT, BookingStatus.APPROVED))) {
            throw new IllegalArgumentException("Already booked");
        }
        int available = ride.getAvailableSeats() != null ? ride.getAvailableSeats() : 0;
        if (available < seatsReserved) {
            throw new IllegalArgumentException("Not enough available seats");
        }
        RideStopEntity pickupStop = rideStopRepository.findById(pickupStopId)
                .orElseThrow(() -> new IllegalArgumentException("Pickup stop not found"));
        RideStopEntity dropoffStop = rideStopRepository.findById(dropoffStopId)
                .orElseThrow(() -> new IllegalArgumentException("Dropoff stop not found"));
        if (!pickupStop.getRide().getId().equals(rideId) || !dropoffStop.getRide().getId().equals(rideId)) {
            throw new IllegalArgumentException("Stops do not belong to this ride");
        }
        PaymentMethod safePaymentMethod = paymentMethod != null ? paymentMethod : PaymentMethod.CASH;
        PaymentStatus paymentStatus = safePaymentMethod == PaymentMethod.CARD ? PaymentStatus.PENDING : PaymentStatus.CASH_ON_RIDE;
        BookingEntity entity = BookingEntity.builder()
                .ride(ride)
                .passenger(passenger)
                .status(BookingStatus.PENDING)
                .paymentMethod(safePaymentMethod)
                .paymentStatus(paymentStatus)
                .pickupStop(pickupStop)
                .dropoffStop(dropoffStop)
                .seatsReserved(seatsReserved)
                .pickupLat(passengerPickupLat != null ? passengerPickupLat : pickupStop.getLatitude())
                .pickupLng(passengerPickupLng != null ? passengerPickupLng : pickupStop.getLongitude())
                .pickupAddress(pickupStop.getName())
                .build();
        entity = bookingRepository.save(entity);
        conversationService.ensureConversationForBooking(ride.getId(), ride.getDriver().getId(), passenger.getId());
        notifyDriverForBookingRequest(ride, passenger, entity);
        return BookingMapper.toDto(entity);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getBookingsForRide(Long rideId) {
        return bookingRepository.findByRide_IdOrderByIdAsc(rideId).stream()
                .map(BookingMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getMyBookings(Long passengerId) {
        return bookingRepository.findByPassenger_IdOrderByIdDesc(passengerId).stream()
                .map(BookingMapper::toDto)
                .collect(Collectors.toList());
    }

    /** Пътуванията се показват само до 2 часа след зададения час на тръгване; след това не влизат в списъка. */
    private static final int HOURS_AFTER_DEPARTURE_VISIBLE = 2;

    @Transactional(readOnly = true)
    public List<BookingDto> getPendingBookingsForDriver(Long driverId) {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(HOURS_AFTER_DEPARTURE_VISIBLE);
        return bookingRepository.findPendingByDriverId(driverId, BookingStatus.PENDING, cutoff).stream()
                .map(BookingMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getActiveBookingsForDriver(Long driverId) {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(HOURS_AFTER_DEPARTURE_VISIBLE);
        return bookingRepository.findActiveByDriverId(
                        driverId,
                        BookingStatus.PENDING,
                        BookingStatus.APPROVED,
                        BookingStatus.PENDING_PAYMENT,
                        cutoff
                ).stream()
                .map(BookingMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingDto setPickupLocation(Long bookingId, Long userId, Double lat, Double lng, String address,
                                        String pickupNeighborhood, String passengerNote) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!entity.getPassenger().getId().equals(userId)) {
            throw new IllegalArgumentException("Not your booking");
        }
        entity.setPickupLat(lat);
        entity.setPickupLng(lng);
        entity.setPickupAddress(address != null ? address.substring(0, Math.min(address.length(), 500)) : null);
        entity.setPickupNeighborhood(pickupNeighborhood != null ? pickupNeighborhood.substring(0, Math.min(pickupNeighborhood.length(), 255)) : null);
        entity.setPassengerNote(passengerNote != null ? passengerNote.substring(0, Math.min(passengerNote.length(), 1000)) : null);
        entity = bookingRepository.save(entity);
        return BookingMapper.toDto(entity);
    }

    @Transactional
    public BookingDto approve(Long bookingId, Long driverId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        RideEntity ride = entity.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("Not driver of this ride");
        }
        if (entity.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Booking not pending");
        }
        if (entity.getPaymentMethod() == PaymentMethod.CARD) {
            entity.setStatus(BookingStatus.PENDING_PAYMENT);
            entity.setPaymentStatus(PaymentStatus.PENDING);
            notificationService.create(
                    entity.getPassenger().getId(),
                    NotificationType.PAYMENT_REQUIRED,
                    "Резервацията е одобрена - необходимо е плащане",
                    "Вашата резервация беше одобрена. Моля, платете с карта.",
                    entity,
                    ride
            );
        } else {
            entity.setStatus(BookingStatus.APPROVED);
            notificationService.create(
                    entity.getPassenger().getId(),
                    NotificationType.BOOKING_APPROVED,
                    "Резервацията е одобрена",
                    "Вашата резервация беше одобрена",
                    entity,
                    ride
            );
        }
        entity = bookingRepository.save(entity);
        int seats = entity.getSeatsReserved() != null ? entity.getSeatsReserved() : 1;
        ride.setAvailableSeats(ride.getAvailableSeats() - seats);
        if (ride.getAvailableSeats() <= 0) {
            ride.setStatus(RideStatus.FULL);
        }
        rideRepository.save(ride);
        return BookingMapper.toDto(entity);
    }

    @Transactional
    public BookingDto reject(Long bookingId, Long driverId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        RideEntity ride = entity.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("Not driver of this ride");
        }
        if (entity.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Booking not pending");
        }
        entity.setStatus(BookingStatus.REJECTED);
        entity = bookingRepository.save(entity);
        notificationService.create(
                entity.getPassenger().getId(),
                NotificationType.BOOKING_REJECTED,
                "Резервацията е отказана",
                "Вашата заявка за резервация беше отказана",
                entity,
                ride
        );
        return BookingMapper.toDto(entity);
    }

    @Transactional
    public void cancel(Long bookingId, Long userId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!entity.getPassenger().getId().equals(userId)) {
            throw new IllegalArgumentException("Not your booking");
        }
        boolean wasApproved = entity.getStatus() == BookingStatus.APPROVED;
        boolean wasPaidByCard = entity.getPaymentMethod() == PaymentMethod.CARD
                && entity.getPaymentStatus() == PaymentStatus.PAID;
        entity.setStatus(BookingStatus.CANCELED);
        if (wasPaidByCard) {
            entity.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        bookingRepository.save(entity);
        if (wasApproved) {
            RideEntity ride = entity.getRide();
            int seats = entity.getSeatsReserved() != null ? entity.getSeatsReserved() : 1;
            ride.setAvailableSeats(ride.getAvailableSeats() + seats);
            if (ride.getStatus() == RideStatus.FULL) {
                ride.setStatus(RideStatus.OPEN);
            }
            rideRepository.save(ride);
        }
    }

    @Transactional
    public void removePassengerByDriver(Long bookingId, Long driverId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        RideEntity ride = entity.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("Not driver of this ride");
        }
        if (entity.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Can only remove approved passengers");
        }
        boolean wasPaidByCard = entity.getPaymentMethod() == PaymentMethod.CARD
                && entity.getPaymentStatus() == PaymentStatus.PAID;
        entity.setStatus(BookingStatus.CANCELED);
        if (wasPaidByCard) {
            entity.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        bookingRepository.save(entity);
        int seats = entity.getSeatsReserved() != null ? entity.getSeatsReserved() : 1;
        ride.setAvailableSeats(ride.getAvailableSeats() + seats);
        if (ride.getStatus() == RideStatus.FULL) {
            ride.setStatus(RideStatus.OPEN);
        }
        rideRepository.save(ride);
    }

    @Transactional
    public BookingDto payByCard(Long bookingId, Long passengerId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (!entity.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Not your booking");
        }
        if (entity.getStatus() == BookingStatus.CANCELED || entity.getStatus() == BookingStatus.REJECTED) {
            throw new IllegalArgumentException("Cannot pay canceled/rejected booking");
        }
        entity.setPaymentMethod(PaymentMethod.CARD);
        entity.setPaymentStatus(PaymentStatus.PENDING);
        return BookingMapper.toDto(bookingRepository.save(entity));
    }

    @Transactional
    public BookingDto markCashPaidByDriver(Long bookingId, Long driverId) {
        BookingEntity entity = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        RideEntity ride = entity.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("Not driver of this ride");
        }
        if (entity.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Cash can be marked paid only for approved booking");
        }
        entity.setPaymentMethod(PaymentMethod.CASH);
        entity.setPaymentStatus(PaymentStatus.PAID);
        return BookingMapper.toDto(bookingRepository.save(entity));
    }

    private void notifyDriverForBookingRequest(RideEntity ride, UserEntity passenger, BookingEntity booking) {
        if (ride.getDriver() == null || ride.getDriver().getId() == null) {
            return;
        }
        String passengerName = passenger.getName() != null && !passenger.getName().isBlank()
                ? passenger.getName()
                : "Пътник";
        String message = passengerName + " иска да запази място за "
                + ride.getFromCity() + " → " + ride.getToCity();
        notificationService.create(
                ride.getDriver().getId(),
                NotificationType.BOOKING_REQUEST,
                "Нова заявка за резервация",
                message,
                booking,
                ride
        );
    }
}
