package com.example.carpool.chat;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class MessageDto {
    Long id;
    Long conversationId;
    Long senderId;
    String senderName;
    String content;
    LocalDateTime createdAt;
}
