package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ValidatePointResponse {
    boolean valid;
    Double suggestedLat;
    Double suggestedLng;
    String message;
}
