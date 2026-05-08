package com.example.carpool.ride;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface RideRepository extends JpaRepository<RideEntity, Long> {

    /** OPEN и FULL – пътуването е видимо при търсене; CANCELED/FINISHED не се показват.
     *  Сравнението на градовете е case-insensitive и trim-нато, за да не пропуска обяви при разлики в интервали/регистър.
     */
    @Query("SELECT r FROM RideEntity r WHERE (:fromCity IS NULL OR :fromCity = '' OR LOWER(TRIM(r.fromCity)) = LOWER(TRIM(:fromCity))) " +
            "AND (:toCity IS NULL OR :toCity = '' OR LOWER(TRIM(r.toCity)) = LOWER(TRIM(:toCity))) " +
            "AND (:dateStart IS NULL OR (r.departureTime >= :dateStart AND r.departureTime < :dateEnd)) " +
            "AND (r.status = 'OPEN' OR r.status = 'FULL')")
    Page<RideEntity> findFiltered(
            @Param("fromCity") String fromCity,
            @Param("toCity") String toCity,
            @Param("dateStart") LocalDateTime dateStart,
            @Param("dateEnd") LocalDateTime dateEnd,
            Pageable pageable);

    @Query("SELECT r FROM RideEntity r WHERE r.driver.id = :driverId ORDER BY r.departureTime DESC")
    List<RideEntity> findByDriverIdOrderByDepartureTimeDesc(@Param("driverId") Long driverId);
}

