package com.example.carpool.ride;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DriverLocationRepository extends JpaRepository<DriverLocationEntity, Long> {
    Optional<DriverLocationEntity> findByRide_IdAndDriver_IdAndTargetPassenger_Id(Long rideId, Long driverId, Long targetPassengerId);
    Optional<DriverLocationEntity> findFirstByRide_IdAndActiveTrueOrderByUpdatedAtDesc(Long rideId);
    List<DriverLocationEntity> findByRide_IdAndDriver_IdAndActiveTrue(Long rideId, Long driverId);
}
