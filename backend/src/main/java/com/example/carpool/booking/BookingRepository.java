package com.example.carpool.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingRepository extends JpaRepository<BookingEntity, Long> {

    boolean existsByRide_IdAndPassenger_IdAndStatusIn(Long rideId, Long passengerId, List<BookingStatus> statuses);

    List<BookingEntity> findByRide_IdOrderByIdAsc(Long rideId);

    List<BookingEntity> findByPassenger_IdOrderByIdDesc(Long passengerId);

    @Query("SELECT b FROM BookingEntity b JOIN FETCH b.ride r JOIN FETCH b.passenger WHERE r.driver.id = :driverId AND b.status = :status ORDER BY b.id DESC")
    List<BookingEntity> findPendingByDriverId(@Param("driverId") Long driverId, @Param("status") BookingStatus status);

    @Query("SELECT DISTINCT b FROM BookingEntity b JOIN FETCH b.ride r JOIN FETCH b.passenger p WHERE r.driver.id = :driverId AND (b.status = :s1 OR b.status = :s2) ORDER BY b.id DESC")
    List<BookingEntity> findActiveByDriverId(@Param("driverId") Long driverId, @Param("s1") BookingStatus s1, @Param("s2") BookingStatus s2);
}

