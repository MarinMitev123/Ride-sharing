package com.example.carpool.report;

import com.example.carpool.booking.BookingRepository;
import com.example.carpool.booking.BookingStatus;
import com.example.carpool.notification.NotificationService;
import com.example.carpool.notification.NotificationType;
import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import com.example.carpool.user.UserRole;
import com.example.carpool.user.UserStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final UserReportRepository userReportRepository;
    private final UserRepository userRepository;
    private final RideRepository rideRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    @Transactional
    public UserReportDto createReport(CreateReportRequest request, Long reporterId) {
        if (reporterId.equals(request.reportedUserId())) {
            throw new IllegalArgumentException("Не можете да докладвате собствения си профил");
        }

        UserEntity reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        UserEntity reportedUser = userRepository.findById(request.reportedUserId())
                .orElseThrow(() -> new IllegalArgumentException("Докладваният потребител не е намерен"));
        RideEntity ride = rideRepository.findById(request.rideId())
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));

        if (reportedUser.getRole() == UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Не можете да докладвате администратор");
        }

        if (!isParticipant(request.rideId(), ride, reporterId)) {
            throw new IllegalArgumentException("Можете да докладвате само потребители от общо пътуване");
        }
        if (!isParticipant(request.rideId(), ride, request.reportedUserId())) {
            throw new IllegalArgumentException("Докладваният потребител не участва в това пътуване");
        }

        if (userReportRepository.existsByReporter_IdAndReportedUser_IdAndRide_Id(
                reporterId, request.reportedUserId(), request.rideId())) {
            throw new IllegalArgumentException("Вече сте подали доклад за този потребител за това пътуване");
        }

        String justification = request.justification().trim();
        if (justification.length() < 20) {
            throw new IllegalArgumentException("Обосновката трябва да е поне 20 символа");
        }

        UserReportEntity saved = userReportRepository.save(UserReportEntity.builder()
                .reporter(reporter)
                .reportedUser(reportedUser)
                .ride(ride)
                .reason(request.reason())
                .justification(justification)
                .status(ReportStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build());

        notifyAdmins(reporter, reportedUser, ride, saved);
        return UserReportMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<UserReportDto> getMyReports(Long reporterId, Long rideId) {
        List<UserReportEntity> reports = rideId != null
                ? userReportRepository.findByReporter_IdAndRide_IdOrderByCreatedAtDesc(reporterId, rideId)
                : userReportRepository.findByReporter_IdOrderByCreatedAtDesc(reporterId);
        return reports.stream().map(UserReportMapper::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserReportDto> getAllReports(ReportStatus status) {
        List<UserReportEntity> reports = status != null
                ? userReportRepository.findByStatusOrderByCreatedAtDesc(status)
                : userReportRepository.findAllByOrderByCreatedAtDesc();
        return reports.stream().map(UserReportMapper::toDto).collect(Collectors.toList());
    }

    @Transactional
    public UserReportDto updateReport(Long reportId, UpdateReportRequest request) {
        UserReportEntity report = userReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Докладът не е намерен"));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("Докладът вече е прегледан");
        }
        if (request.status() != ReportStatus.DISMISSED && request.status() != ReportStatus.REVIEWED) {
            throw new IllegalArgumentException("Невалиден статус за актуализация");
        }

        report.setStatus(request.status());
        if (request.adminNote() != null) {
            report.setAdminNote(request.adminNote().trim().isEmpty() ? null : request.adminNote().trim());
        }
        report.setReviewedAt(LocalDateTime.now());
        return UserReportMapper.toDto(userReportRepository.save(report));
    }

    @Transactional
    public UserReportDto blockReportedUser(Long reportId) {
        UserReportEntity report = userReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Докладът не е намерен"));

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new IllegalArgumentException("Докладът вече е прегледан");
        }

        UserEntity reportedUser = report.getReportedUser();
        if (reportedUser.getRole() == UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Не можете да блокирате администратор");
        }

        reportedUser.setStatus(UserStatus.BLOCKED);
        userRepository.save(reportedUser);

        report.setStatus(ReportStatus.REVIEWED);
        if (report.getAdminNote() == null || report.getAdminNote().isBlank()) {
            report.setAdminNote("Потребителят е блокиран след преглед на доклада.");
        }
        report.setReviewedAt(LocalDateTime.now());
        return UserReportMapper.toDto(userReportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public long countPendingReports() {
        return userReportRepository.countByStatus(ReportStatus.PENDING);
    }

    private void notifyAdmins(UserEntity reporter, UserEntity reportedUser, RideEntity ride, UserReportEntity report) {
        String title = "Нов доклад за блокиране";
        String message = String.format(
                "%s докладва %s (%s) за пътуване %s → %s. Причина: %s",
                reporter.getName(),
                reportedUser.getName(),
                reportedUser.getEmail(),
                ride.getFromCity(),
                ride.getToCity(),
                report.getReason().name()
        );
        userRepository.findByRole(UserRole.ROLE_ADMIN).forEach(admin ->
                notificationService.create(
                        admin.getId(),
                        NotificationType.USER_REPORT,
                        title,
                        message,
                        null,
                        ride
                )
        );
    }

    private boolean isParticipant(Long rideId, RideEntity ride, Long userId) {
        if (ride.getDriver() != null && ride.getDriver().getId().equals(userId)) {
            return true;
        }
        return bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, userId, Collections.singletonList(BookingStatus.APPROVED));
    }
}
