package com.example.carpool.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 8) String newPassword,
        @NotBlank @Size(min = 8) String confirmPassword
) {
}
