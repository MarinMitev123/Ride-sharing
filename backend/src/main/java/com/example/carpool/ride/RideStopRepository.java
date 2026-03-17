package com.example.carpool.ride;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RideStopRepository extends JpaRepository<RideStopEntity, Long> {

    List<RideStopEntity> findByRide_IdOrderByStopOrderAsc(Long rideId);
}
