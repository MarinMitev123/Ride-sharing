package com.example.carpool.booking;

import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<BookingDto> createBooking(@AuthenticationPrincipal UserDetails userDetails,
                                                    @Valid @RequestBody BookingCreateRequest request) {
        Long passengerId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.createBooking(request.rideId(), passengerId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingDto>> getMyBookings(@AuthenticationPrincipal UserDetails userDetails) {
        Long passengerId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.getMyBookings(passengerId));
    }

    @GetMapping("/for-my-rides")
    public ResponseEntity<List<BookingDto>> getBookingsForMyRides(@AuthenticationPrincipal UserDetails userDetails) {
        Long driverId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.getBookingsForMyRides(driverId));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<BookingDto> approve(@AuthenticationPrincipal UserDetails userDetails,
                                              @PathVariable Long id) {
        Long driverId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.approve(id, driverId));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<BookingDto> reject(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable Long id) {
        Long driverId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.reject(id, driverId));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingDto> cancel(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable Long id) {
        Long passengerId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(bookingService.cancel(id, passengerId));
    }

    @PatchMapping("/{id}/pickup")
    public ResponseEntity<BookingDto> setPickupLocation(@AuthenticationPrincipal UserDetails userDetails,
                                                       @PathVariable Long id,
                                                       @Valid @RequestBody BookingPickupRequest request) {
        Long passengerId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        String address = request.pickupAddress() != null ? request.pickupAddress() : "";
        return ResponseEntity.ok(bookingService.setPickupLocation(id, passengerId,
                request.pickupLat(), request.pickupLng(), address));
    }
}
