package com.example.carpool.report;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserReportRepository extends JpaRepository<UserReportEntity, Long> {

    boolean existsByReporter_IdAndReportedUser_IdAndRide_Id(Long reporterId, Long reportedUserId, Long rideId);

    List<UserReportEntity> findByReporter_IdOrderByCreatedAtDesc(Long reporterId);

    List<UserReportEntity> findByReporter_IdAndRide_IdOrderByCreatedAtDesc(Long reporterId, Long rideId);

    List<UserReportEntity> findByStatusOrderByCreatedAtDesc(ReportStatus status);

    List<UserReportEntity> findAllByOrderByCreatedAtDesc();

    long countByStatus(ReportStatus status);
}
