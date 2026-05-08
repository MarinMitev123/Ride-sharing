package com.example.carpool.notification;

public class NotificationMapper {

    private NotificationMapper() {
    }

    public static NotificationDto toDto(NotificationEntity entity) {
        if (entity == null) {
            return null;
        }
        return NotificationDto.builder()
                .id(entity.getId())
                .recipientUserId(entity.getRecipientUser() != null ? entity.getRecipientUser().getId() : null)
                .type(entity.getType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .bookingId(entity.getBooking() != null ? entity.getBooking().getId() : null)
                .rideId(entity.getRide() != null ? entity.getRide().getId() : null)
                .isRead(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
