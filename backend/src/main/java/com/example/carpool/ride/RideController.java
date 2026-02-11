package com.example.carpool.ride;

import com.example.carpool.booking.BookingDto;
import com.example.carpool.booking.BookingService;
import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;
    private final BookingService bookingService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<RideDto>> getAllRides(
            @RequestParam(required = false) String fromCity,
            @RequestParam(required = false) String toCity,
            @RequestParam(required = false) java.time.LocalDate date) {
        if ((fromCity != null && !fromCity.isBlank()) || (toCity != null && !toCity.isBlank()) || date != null) {
            return ResponseEntity.ok(rideService.searchRides(fromCity, toCity, date));
        }
        return ResponseEntity.ok(rideService.getAllRides());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RideDto> getRideById(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRideById(id));
    }

    @GetMapping("/{id}/bookings")
    public ResponseEntity<List<BookingDto>> getBookingsForRide(@AuthenticationPrincipal UserDetails userDetails,
                                                               @PathVariable Long id) {
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.getBookingsByRideId(id, userId));
    }

    @PostMapping
    public ResponseEntity<RideDto> createRide(@AuthenticationPrincipal UserDetails userDetails,
                                              @Valid @RequestBody RideCreateRequest request) {
        Long driverId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        RideDto created = rideService.createRide(driverId, request);
        return ResponseEntity.ok(created);
    }
}

