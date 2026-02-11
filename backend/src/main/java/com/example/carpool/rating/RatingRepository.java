package com.example.carpool.rating;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RatingRepository extends JpaRepository<RatingEntity, Long> {

    List<RatingEntity> findByToUser_IdOrderByIdDesc(Long toUserId);

    boolean existsByRide_IdAndFromUser_Id(Long rideId, Long fromUserId);
}

