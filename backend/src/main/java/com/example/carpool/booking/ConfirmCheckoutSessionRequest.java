package com.example.carpool.booking;

import jakarta.validation.constraints.NotBlank;

public record ConfirmCheckoutSessionRequest(@NotBlank String sessionId) {
}
