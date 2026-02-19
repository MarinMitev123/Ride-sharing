package com.example.carpool.booking;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BookingPickupRequest(
        @NotNull Double pickupLat,
        @NotNull Double pickupLng,
        @Size(max = 500) String pickupAddress,
        @Size(max = 255) String pickupNeighborhood,
        @Size(max = 1000) String passengerNote
) {}
