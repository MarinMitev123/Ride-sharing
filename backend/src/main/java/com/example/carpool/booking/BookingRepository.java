package com.example.carpool.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

    List<BookingEntity> findByPassenger_IdOrderByIdDesc(Long passengerId);

    List<BookingEntity> findByRide_Driver_IdOrderByIdDesc(Long driverId);

    List<BookingEntity> findByRide_IdOrderByIdDesc(Long rideId);

    boolean existsByRide_IdAndPassenger_IdAndStatusIn(Long rideId, Long passengerId, List<BookingStatus> statuses);
}

