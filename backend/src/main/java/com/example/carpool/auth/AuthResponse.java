package com.example.carpool.auth;

import com.example.carpool.user.UserDto;

public record AuthResponse(
        String token,
        UserDto user
) {
}

