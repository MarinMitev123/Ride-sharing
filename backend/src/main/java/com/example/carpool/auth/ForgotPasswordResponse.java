package com.example.carpool.auth;

public record ForgotPasswordResponse(
        String message,
        String resetLink
) {
}
