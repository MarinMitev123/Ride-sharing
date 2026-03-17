package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ValidatePointsResponse {
    boolean valid;
    Double suggestedPickupLat;
    Double suggestedPickupLng;
    Double suggestedDropoffLat;
    Double suggestedDropoffLng;
    String message;
}
