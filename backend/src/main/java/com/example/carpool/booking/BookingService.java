package com.example.carpool.booking;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.ride.RideStatus;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    @Transactional
    public BookingDto createBooking(Long rideId, Long passengerId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (ride.getStatus() != RideStatus.OPEN) {
            throw new IllegalArgumentException("Ride is not open for bookings");
        }
        if (ride.getAvailableSeats() == null || ride.getAvailableSeats() <= 0) {
            throw new IllegalArgumentException("No available seats");
        }
        if (bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, passengerId, Arrays.asList(BookingStatus.PENDING, BookingStatus.APPROVED))) {
            throw new IllegalArgumentException("You already have a pending or approved booking for this ride");
        }
        UserEntity passenger = userRepository.findById(passengerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        BookingEntity booking = BookingEntity.builder()
                .ride(ride)
                .passenger(passenger)
                .status(BookingStatus.PENDING)
                .build();
        BookingEntity saved = bookingRepository.save(booking);
        return BookingMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getMyBookings(Long passengerId) {
        return bookingRepository.findByPassenger_IdOrderByIdDesc(passengerId)
                .stream()
                .map(BookingMapper::toDtoWithRideInfo)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getBookingsForMyRides(Long driverId) {
        return bookingRepository.findByRide_Driver_IdOrderByIdDesc(driverId)
                .stream()
                .map(BookingMapper::toDtoWithPassengerInfo)
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingDto approve(Long bookingId, Long driverId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Booking is not pending");
        }
        RideEntity ride = booking.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("You are not the driver of this ride");
        }
        if (ride.getAvailableSeats() == null || ride.getAvailableSeats() <= 0) {
            throw new IllegalArgumentException("No available seats");
        }
        booking.setStatus(BookingStatus.APPROVED);
        bookingRepository.save(booking);
        ride.setAvailableSeats(ride.getAvailableSeats() - 1);
        if (ride.getAvailableSeats() <= 0) {
            ride.setStatus(RideStatus.FULL);
        }
        rideRepository.save(ride);
        return BookingMapper.toDto(booking);
    }

    @Transactional
    public BookingDto reject(Long bookingId, Long driverId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Booking is not pending");
        }
        RideEntity ride = booking.getRide();
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new IllegalArgumentException("You are not the driver of this ride");
        }
        booking.setStatus(BookingStatus.REJECTED);
        bookingRepository.save(booking);
        return BookingMapper.toDto(booking);
    }

    @Transactional
    public BookingDto cancel(Long bookingId, Long passengerId) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getPassenger() == null || !booking.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("You are not the passenger of this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Booking cannot be canceled");
        }
        if (booking.getStatus() == BookingStatus.APPROVED) {
            RideEntity ride = booking.getRide();
            ride.setAvailableSeats(ride.getAvailableSeats() + 1);
            if (ride.getStatus() == RideStatus.FULL) {
                ride.setStatus(RideStatus.OPEN);
            }
            rideRepository.save(ride);
        }
        booking.setStatus(BookingStatus.CANCELED);
        bookingRepository.save(booking);
        return BookingMapper.toDto(booking);
    }

    @Transactional
    public BookingDto setPickupLocation(Long bookingId, Long passengerId, Double pickupLat, Double pickupLng, String pickupAddress) {
        BookingEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (booking.getPassenger() == null || !booking.getPassenger().getId().equals(passengerId)) {
            throw new IllegalArgumentException("You are not the passenger of this booking");
        }
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Cannot set pickup for this booking");
        }
        booking.setPickupLat(pickupLat);
        booking.setPickupLng(pickupLng);
        booking.setPickupAddress(pickupAddress != null ? pickupAddress : "");
        bookingRepository.save(booking);
        return BookingMapper.toDtoWithRideInfo(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingDto> getBookingsByRideId(Long rideId, Long currentUserId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Only the driver can view bookings for this ride");
        }
        return bookingRepository.findByRide_IdOrderByIdDesc(rideId)
                .stream()
                .map(BookingMapper::toDtoWithPassengerInfo)
                .collect(Collectors.toList());
    }
}
