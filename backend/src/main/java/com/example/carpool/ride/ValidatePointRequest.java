package com.example.carpool.ride;

import jakarta.validation.constraints.NotNull;
import lombok.Value;

@Value
public class ValidatePointRequest {
    @NotNull Double lat;
    @NotNull Double lng;
    @NotNull String type;
}
