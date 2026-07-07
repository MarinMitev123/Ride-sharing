package com.example.carpool.report;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class UserReportDto {
    Long id;
    Long reporterId;
    String reporterName;
    String reporterEmail;
    Long reportedUserId;
    String reportedUserName;
    String reportedUserEmail;
    Long rideId;
    String rideFromCity;
    String rideToCity;
    ReportReason reason;
    String justification;
    ReportStatus status;
    String adminNote;
    LocalDateTime createdAt;
    LocalDateTime reviewedAt;
}
