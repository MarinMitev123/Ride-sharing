package com.example.carpool.notification;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class NotificationDto {
    Long id;
    Long recipientUserId;
    NotificationType type;
    String title;
    String message;
    Long bookingId;
    Long rideId;
    boolean isRead;
    LocalDateTime createdAt;
}
