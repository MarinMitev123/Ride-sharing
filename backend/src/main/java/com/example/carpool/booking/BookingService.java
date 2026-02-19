package com.example.carpool.booking;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.ride.RideStatus;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RideRepository rideRepository;
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

    @Transactional(readOnly = true)
    public List<BookingDto> getPendingBookingsForDriver(Long driverId) {
        return bookingRepository.findPendingByDriverId(driverId, BookingStatus.PENDING).stream()
                .map(BookingMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getActiveBookingsForDriver(Long driverId) {
        return bookingRepository.findActiveByDriverId(driverId, BookingStatus.PENDING, BookingStatus.APPROVED).stream()
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
        ride.setAvailableSeats(ride.getAvailableSeats() - 1);
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
            ride.setAvailableSeats(ride.getAvailableSeats() + 1);
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
        ride.setAvailableSeats(ride.getAvailableSeats() + 1);
        if (ride.getStatus() == RideStatus.FULL) {
            ride.setStatus(RideStatus.OPEN);
        }
        rideRepository.save(ride);
    }
}
