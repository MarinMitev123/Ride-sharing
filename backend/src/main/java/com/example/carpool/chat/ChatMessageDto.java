package com.example.carpool.chat;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ChatMessageDto {
    Long id;
    Long rideId;
    Long senderId;
    String senderName;
    Long receiverId;
    String receiverName;
    String content;
    LocalDateTime sentAt;
}
