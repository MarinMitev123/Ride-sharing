package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class RideDto {
    Long id;
    Long driverId;
    String fromCity;
    String fromDistrict;
    String toCity;
    String toDistrict;
    Boolean cardPaymentAvailable;
    Double fromLat;
    Double fromLng;
    Double toLat;
    Double toLng;
    LocalDateTime departureTime;
    Integer availableSeats;
    BigDecimal price;
    String carDetails;
    RideStatus status;
}

