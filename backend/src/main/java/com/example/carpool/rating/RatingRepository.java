package com.example.carpool.rating;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RatingRepository extends JpaRepository<RatingEntity, Long> {

    List<RatingEntity> findByToUser_IdOrderByIdDesc(Long toUserId);

    boolean existsByRide_IdAndFromUser_Id(Long rideId, Long fromUserId);

    @Query("SELECT AVG(r.score) FROM RatingEntity r WHERE r.toUser.id = :toUserId")
    Optional<Double> averageScoreByToUserId(@Param("toUserId") Long toUserId);
}

