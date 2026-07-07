package com.example.carpool.rating;

import com.example.carpool.booking.BookingRepository;
import com.example.carpool.booking.BookingStatus;
import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository ratingRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public RatingDto createRating(Long toUserId, Long rideId, int score, String comment, Long fromUserId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        UserEntity fromUser = userRepository.findById(fromUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        UserEntity toUser = userRepository.findById(toUserId)
                .orElseThrow(() -> new IllegalArgumentException("User to rate not found"));
        if (ratingRepository.existsByRide_IdAndFromUser_Id(rideId, fromUserId)) {
            throw new IllegalArgumentException("You have already rated for this ride");
        }
        if (!isParticipant(rideId, ride, fromUserId)) {
            throw new IllegalArgumentException("You were not part of this ride");
        }
        if (!isParticipant(rideId, ride, toUserId)) {
            throw new IllegalArgumentException("User was not part of this ride");
        }
        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("You cannot rate yourself");
        }
        RatingEntity rating = RatingEntity.builder()
                .fromUser(fromUser)
                .toUser(toUser)
                .ride(ride)
                .score(score)
                .comment(comment)
                .build();
        RatingEntity saved = ratingRepository.save(rating);
        refreshUserRatingAverage(toUserId);
        return RatingMapper.toDto(saved);
    }

    private void refreshUserRatingAverage(Long toUserId) {
        BigDecimal average = ratingRepository.averageScoreByToUserId(toUserId)
                .map(avg -> BigDecimal.valueOf(avg).setScale(1, RoundingMode.HALF_UP))
                .orElse(null);
        UserEntity ratedUser = userRepository.findById(toUserId)
                .orElseThrow(() -> new IllegalArgumentException("User to rate not found"));
        ratedUser.setRatingAverage(average);
        userRepository.save(ratedUser);
    }

    @Transactional(readOnly = true)
    public List<RatingDto> getRatingsForUser(Long toUserId) {
        return ratingRepository.findByToUser_IdOrderByIdDesc(toUserId)
                .stream()
                .map(RatingMapper::toDto)
                .collect(Collectors.toList());
    }

    private boolean isParticipant(Long rideId, RideEntity ride, Long userId) {
        if (ride.getDriver() != null && ride.getDriver().getId().equals(userId)) {
            return true;
        }
        return bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, userId, Collections.singletonList(BookingStatus.APPROVED));
    }
}
