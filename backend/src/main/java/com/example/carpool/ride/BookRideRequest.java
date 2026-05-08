package com.example.carpool.ride;

import jakarta.validation.constraints.NotNull;
import com.example.carpool.booking.PaymentMethod;
import lombok.Value;

@Value
public class BookRideRequest {
    @NotNull Double pickupLat;
    @NotNull Double pickupLng;
    @NotNull Double dropoffLat;
    @NotNull Double dropoffLng;
    Integer seatsReserved;
    PaymentMethod paymentMethod;
}
