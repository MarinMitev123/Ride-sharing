package com.example.carpool.ride;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RideRepository extends JpaRepository<RideEntity, Long> {

    @Query("SELECT r FROM RideEntity r WHERE (:fromCity IS NULL OR :fromCity = '' OR r.fromCity = :fromCity) " +
            "AND (:toCity IS NULL OR :toCity = '' OR r.toCity = :toCity) " +
            "AND (:dateStart IS NULL OR (r.departureTime >= :dateStart AND r.departureTime < :dateEnd)) " +
            "AND r.status = 'OPEN'")
    Page<RideEntity> findFiltered(
            @Param("fromCity") String fromCity,
            @Param("toCity") String toCity,
            @Param("dateStart") LocalDateTime dateStart,
            @Param("dateEnd") LocalDateTime dateEnd,
            Pageable pageable);

    @Query("SELECT r FROM RideEntity r WHERE r.driver.id = :driverId ORDER BY r.departureTime DESC")
    List<RideEntity> findByDriverIdOrderByDepartureTimeDesc(@Param("driverId") Long driverId);
}

