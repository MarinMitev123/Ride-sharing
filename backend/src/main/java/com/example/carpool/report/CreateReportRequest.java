package com.example.carpool.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(
        @NotNull Long reportedUserId,
        @NotNull Long rideId,
        @NotNull ReportReason reason,
        @NotBlank @Size(min = 20, max = 1000) String justification
) {}
