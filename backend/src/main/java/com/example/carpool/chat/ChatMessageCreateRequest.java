package com.example.carpool.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChatMessageCreateRequest(
        @NotNull Long rideId,
        @NotNull Long receiverId,
        @NotBlank @Size(max = 1000) String content
) {}
