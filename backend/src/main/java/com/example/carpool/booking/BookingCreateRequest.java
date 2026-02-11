package com.example.carpool.booking;

import jakarta.validation.constraints.NotNull;

public record BookingCreateRequest(
        @NotNull Long rideId
) {
}
