package com.example.carpool.booking;

import jakarta.validation.constraints.NotNull;

public record CreateCheckoutSessionRequest(@NotNull Long bookingId) {
}
