package com.example.carpool.ride;

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
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<RideDto>> getAllRides() {
        return ResponseEntity.ok(rideService.getAllRides());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RideDto> getRideById(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRideById(id));
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

