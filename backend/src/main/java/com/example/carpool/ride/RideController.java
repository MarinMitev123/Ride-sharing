package com.example.carpool.ride;

import com.example.carpool.booking.BookingDto;
import com.example.carpool.route.RouteDto;
import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getRides(
            @RequestParam(required = false) String fromCity,
            @RequestParam(required = false) String toCity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir) {
        boolean useFilter = (fromCity != null && !fromCity.isBlank())
                || (toCity != null && !toCity.isBlank())
                || date != null
                || (page != null && page > 0)
                || (size != null && size > 0)
                || (sortBy != null && !sortBy.isBlank())
                || (sortDir != null && !sortDir.isBlank());
        if (useFilter) {
            int p = page != null ? page : 0;
            int s = size != null && size > 0 ? size : 20;
            Page<RideDto> result = rideService.getRidesFiltered(fromCity, toCity, date, p, s, sortBy, sortDir);
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.ok(rideService.getAllRides());
    }

    @GetMapping("/my-as-driver")
    public ResponseEntity<List<RideDto>> getMyRidesAsDriver(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null || userDetails.getUsername().isBlank()) {
            return ResponseEntity.status(401).build();
        }
        Long driverId = userRepository.findByEmail(userDetails.getUsername())
                .map(com.example.carpool.user.UserEntity::getId)
                .orElse(null);
        if (driverId == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(rideService.getRidesByDriverId(driverId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RideDto> getRideById(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRideById(id));
    }

    @GetMapping("/{id}/driver-route")
    public ResponseEntity<RouteDto> getDriverRoute(@PathVariable Long id,
                                                    @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(rideService.getDriverRoute(id, userId));
    }

    @GetMapping("/{id}/route")
    public ResponseEntity<RideRouteDto> getRoute(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRouteWithStops(id));
    }

    @GetMapping("/{id}/stops")
    public ResponseEntity<List<RideStopDto>> getStops(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getStops(id));
    }

    @PostMapping("/{id}/validate-point")
    public ResponseEntity<ValidatePointResponse> validatePoint(@PathVariable Long id,
                                                               @Valid @RequestBody ValidatePointRequest request) {
        return ResponseEntity.ok(rideService.validatePoint(id, request));
    }

    @PostMapping("/{id}/validate-points")
    public ResponseEntity<ValidatePointsResponse> validatePoints(@PathVariable Long id,
                                                                 @Valid @RequestBody ValidatePointsRequest request) {
        return ResponseEntity.ok(rideService.validatePoints(id, request));
    }

    @PostMapping("/{id}/book")
    public ResponseEntity<BookingDto> bookRide(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails userDetails,
                                               @Valid @RequestBody BookRideRequest request) {
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(rideService.bookRide(id, userId, request));
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

