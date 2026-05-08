package com.example.carpool.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MessageCreateRequest(
        @NotBlank @Size(max = 1000) String content
) {
}
