package com.example.carpool.chat;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class ConversationDto {
    Long id;
    LocalDateTime createdAt;
    OtherUserDto otherUser;
    RideSummaryDto ride;

    @Value
    @Builder
    public static class OtherUserDto {
        Long id;
        String firstName;
        String lastName;
        String username;
    }

    @Value
    @Builder
    public static class RideSummaryDto {
        Long id;
        String origin;
        String destination;
        LocalDateTime departureTime;
    }
}
