package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class DriverLocationDto {
    Long rideId;
    Long driverId;
    Long targetPassengerId;
    Double latitude;
    Double longitude;
    Boolean isActive;
    LocalDateTime updatedAt;
}
