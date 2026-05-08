package com.example.carpool.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<ConversationEntity, Long> {
    Optional<ConversationEntity> findByRide_IdAndDriver_IdAndPassenger_Id(Long rideId, Long driverId, Long passengerId);
    List<ConversationEntity> findByDriver_IdOrPassenger_IdOrderByCreatedAtDesc(Long driverId, Long passengerId);
}
