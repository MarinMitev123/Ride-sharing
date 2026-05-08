package com.example.carpool.ride;

import jakarta.validation.constraints.NotNull;

public record DriverLocationUpdateRequest(
        Double latitude,
        Double longitude,
        @NotNull Long targetPassengerId,
        @NotNull Boolean isActive
) {
}
