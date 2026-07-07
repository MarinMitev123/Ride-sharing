package com.example.carpool.report;

public final class UserReportMapper {

    private UserReportMapper() {
    }

    public static UserReportDto toDto(UserReportEntity entity) {
        if (entity == null) {
            return null;
        }
        return UserReportDto.builder()
                .id(entity.getId())
                .reporterId(entity.getReporter() != null ? entity.getReporter().getId() : null)
                .reporterName(entity.getReporter() != null ? entity.getReporter().getName() : null)
                .reporterEmail(entity.getReporter() != null ? entity.getReporter().getEmail() : null)
                .reportedUserId(entity.getReportedUser() != null ? entity.getReportedUser().getId() : null)
                .reportedUserName(entity.getReportedUser() != null ? entity.getReportedUser().getName() : null)
                .reportedUserEmail(entity.getReportedUser() != null ? entity.getReportedUser().getEmail() : null)
                .rideId(entity.getRide() != null ? entity.getRide().getId() : null)
                .rideFromCity(entity.getRide() != null ? entity.getRide().getFromCity() : null)
                .rideToCity(entity.getRide() != null ? entity.getRide().getToCity() : null)
                .reason(entity.getReason())
                .justification(entity.getJustification())
                .status(entity.getStatus())
                .adminNote(entity.getAdminNote())
                .createdAt(entity.getCreatedAt())
                .reviewedAt(entity.getReviewedAt())
                .build();
    }
}
