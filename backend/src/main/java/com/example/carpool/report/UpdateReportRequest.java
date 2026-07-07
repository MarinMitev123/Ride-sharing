package com.example.carpool.report;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateReportRequest(
        @NotNull ReportStatus status,
        @Size(max = 500) String adminNote
) {}
