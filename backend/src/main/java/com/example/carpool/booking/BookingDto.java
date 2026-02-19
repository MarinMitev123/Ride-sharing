package com.example.carpool.booking;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class BookingDto {
    Long id;
    Long rideId;
    Long passengerId;
    String passengerName;
    BookingStatus status;
    String fromCity;
    String toCity;
    LocalDateTime departureTime;
    Double pickupLat;
    Double pickupLng;
    String pickupAddress;
    String pickupNeighborhood;
    String passengerNote;
}
