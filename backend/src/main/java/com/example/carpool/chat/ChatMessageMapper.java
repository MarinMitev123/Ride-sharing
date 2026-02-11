package com.example.carpool.chat;

import com.example.carpool.user.UserEntity;

public class ChatMessageMapper {

    private ChatMessageMapper() {
    }

    public static ChatMessageDto toDto(ChatMessageEntity entity) {
        if (entity == null) {
            return null;
        }
        Long rideId = entity.getRide() != null ? entity.getRide().getId() : null;
        Long senderId = entity.getSender() != null ? entity.getSender().getId() : null;
        String senderName = entity.getSender() != null ? entity.getSender().getName() : null;
        Long receiverId = entity.getReceiver() != null ? entity.getReceiver().getId() : null;
        String receiverName = entity.getReceiver() != null ? entity.getReceiver().getName() : null;
        return ChatMessageDto.builder()
                .id(entity.getId())
                .rideId(rideId)
                .senderId(senderId)
                .senderName(senderName)
                .receiverId(receiverId)
                .receiverName(receiverName)
                .content(entity.getContent())
                .sentAt(entity.getSentAt())
                .build();
    }
}
