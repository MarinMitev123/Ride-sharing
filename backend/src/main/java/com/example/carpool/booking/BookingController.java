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
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    private Long currentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }

    @PostMapping("/bookings")
    public ResponseEntity<BookingDto> create(@AuthenticationPrincipal UserDetails userDetails,
                                             @Valid @RequestBody BookingCreateRequest request) {
        Long passengerId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.create(request.rideId(), passengerId));
    }

    @GetMapping("/rides/{rideId}/bookings")
    public ResponseEntity<List<BookingDto>> getBookingsForRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(bookingService.getBookingsForRide(rideId));
    }

    @GetMapping("/bookings/my")
    public ResponseEntity<List<BookingDto>> getMyBookings(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.getMyBookings(userId));
    }

    @GetMapping("/bookings/pending-for-driver")
    public ResponseEntity<List<BookingDto>> getPendingBookingsForDriver(@AuthenticationPrincipal UserDetails userDetails) {
        Long driverId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.getPendingBookingsForDriver(driverId));
    }

    @GetMapping("/bookings/active-for-driver")
    public ResponseEntity<List<BookingDto>> getActiveBookingsForDriver(@AuthenticationPrincipal UserDetails userDetails) {
        Long driverId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.getActiveBookingsForDriver(driverId));
    }

    @PatchMapping("/bookings/{id}/pickup")
    public ResponseEntity<BookingDto> setPickupLocation(@AuthenticationPrincipal UserDetails userDetails,
                                                        @PathVariable Long id,
                                                        @Valid @RequestBody BookingPickupRequest request) {
        Long userId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.setPickupLocation(id, userId,
                request.pickupLat(), request.pickupLng(), request.pickupAddress(),
                request.pickupNeighborhood(), request.passengerNote()));
    }

    @PatchMapping("/bookings/{id}/approve")
    public ResponseEntity<BookingDto> approve(@AuthenticationPrincipal UserDetails userDetails,
                                              @PathVariable Long id) {
        Long driverId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.approve(id, driverId));
    }

    @PatchMapping("/bookings/{id}/reject")
    public ResponseEntity<BookingDto> reject(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable Long id) {
        Long driverId = currentUserId(userDetails);
        return ResponseEntity.ok(bookingService.reject(id, driverId));
    }

    @DeleteMapping("/bookings/{id}")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal UserDetails userDetails,
                                       @PathVariable Long id) {
        Long userId = currentUserId(userDetails);
        bookingService.cancel(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/bookings/{id}/remove")
    public ResponseEntity<Void> removePassenger(@AuthenticationPrincipal UserDetails userDetails,
                                                @PathVariable Long id) {
        Long driverId = currentUserId(userDetails);
        bookingService.removePassengerByDriver(id, driverId);
        return ResponseEntity.noContent().build();
    }
}
