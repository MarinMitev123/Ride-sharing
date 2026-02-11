package com.example.carpool.rating;

import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<RatingDto> createRating(@AuthenticationPrincipal UserDetails userDetails,
                                                  @Valid @RequestBody RatingCreateRequest request) {
        Long fromUserId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        String comment = request.comment() != null ? request.comment() : "";
        return ResponseEntity.ok(ratingService.createRating(
                request.toUserId(), request.rideId(), request.score(), comment, fromUserId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RatingDto>> getRatingsForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ratingService.getRatingsForUser(userId));
    }
}
