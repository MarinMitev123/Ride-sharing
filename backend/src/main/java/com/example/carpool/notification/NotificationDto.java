package com.example.carpool.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("isRead")
    boolean isRead;
    LocalDateTime createdAt;
}
