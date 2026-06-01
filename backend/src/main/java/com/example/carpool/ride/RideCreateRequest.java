package com.example.carpool.ride;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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
        @NotNull @DecimalMin(value = "0.01", message = "Цената трябва да е поне 0.01 €")
        BigDecimal price,
        @NotBlank @Size(max = 255) String carDetails
) {
}

