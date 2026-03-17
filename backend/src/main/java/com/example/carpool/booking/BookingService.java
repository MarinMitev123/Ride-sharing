package com.example.carpool.booking;

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
                rideId, passengerId, List.of(BookingStatus.PENDING, BookingStatus.APPROVED))) {
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
        return BookingMapper.toDto(entity);
    }

    @Transactional
    public BookingDto createWithStops(Long rideId, Long passengerId, Long pickupStopId, Long dropoffStopId, int seatsReserved) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        UserEntity passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (ride.getDriver() != null && ride.getDriver().getId().equals(passengerId)) {
            throw new IllegalArgumentException("Driver cannot book own ride");
        }
        if (bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, passengerId, List.of(BookingStatus.PENDING, BookingStatus.APPROVED))) {
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
        BookingEntity entity = BookingEntity.builder()
                .ride(ride)
                .passenger(passenger)
                .status(BookingStatus.PENDING)
                .pickupStop(pickupStop)
                .dropoffStop(dropoffStop)
                .seatsReserved(seatsReserved)
                .pickupLat(pickupStop.getLatitude())
                .pickupLng(pickupStop.getLongitude())
                .pickupAddress(pickupStop.getName())
                .build();
        entity = bookingRepository.save(entity);
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
        return bookingRepository.findActiveByDriverId(driverId, BookingStatus.PENDING, BookingStatus.APPROVED, cutoff).stream()
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
        entity.setStatus(BookingStatus.APPROVED);
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
        entity.setStatus(BookingStatus.CANCELED);
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
        entity.setStatus(BookingStatus.CANCELED);
        bookingRepository.save(entity);
        int seats = entity.getSeatsReserved() != null ? entity.getSeatsReserved() : 1;
        ride.setAvailableSeats(ride.getAvailableSeats() + seats);
        if (ride.getStatus() == RideStatus.FULL) {
            ride.setStatus(RideStatus.OPEN);
        }
        rideRepository.save(ride);
    }
}
