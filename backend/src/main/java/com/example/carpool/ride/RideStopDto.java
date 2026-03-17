package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RideStopDto {
    Long id;
    Long rideId;
    String name;
    Double latitude;
    Double longitude;
    Integer stopOrder;
    StopType type;
}
