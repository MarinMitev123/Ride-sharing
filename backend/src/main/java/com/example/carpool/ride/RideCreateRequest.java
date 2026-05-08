package com.example.carpool.ride;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RideCreateRequest(
        @NotBlank String fromCity,
        String fromDistrict,
        @NotBlank String toCity,
        String toDistrict,
        Double fromLat,
        Double fromLng,
        Double toLat,
        Double toLng,
        @NotNull @Future LocalDateTime departureTime,
        @NotNull @Min(1) Integer availableSeats,
        @NotNull @Min(0) BigDecimal price,
        String carDetails
) {
}

