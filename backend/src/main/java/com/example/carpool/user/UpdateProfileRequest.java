package com.example.carpool.user;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 1, max = 200) String name,
        @Size(max = 50) String phone
) {}
