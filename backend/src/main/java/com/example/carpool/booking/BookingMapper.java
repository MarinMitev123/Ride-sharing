package com.example.carpool.booking;

import com.example.carpool.ride.RideEntity;

public class BookingMapper {

    private BookingMapper() {
    }

    public static BookingDto toDto(BookingEntity entity) {
        return toDto(entity, true, true);
    }

    public static BookingDto toDtoWithRideInfo(BookingEntity entity) {
        return toDto(entity, true, false);
    }

    public static BookingDto toDtoWithPassengerInfo(BookingEntity entity) {
        return toDto(entity, false, true);
    }

    public static BookingDto toDto(BookingEntity entity, boolean includeRideInfo, boolean includePassengerInfo) {
        if (entity == null) {
            return null;
        }
        Long rideId = entity.getRide() != null ? entity.getRide().getId() : null;
        Long passengerId = entity.getPassenger() != null ? entity.getPassenger().getId() : null;
        String passengerName = includePassengerInfo && entity.getPassenger() != null ? entity.getPassenger().getName() : null;
        String fromCity = null;
        String toCity = null;
        java.time.LocalDateTime departureTime = null;
        if (includeRideInfo && entity.getRide() != null) {
            RideEntity ride = entity.getRide();
            fromCity = ride.getFromCity();
            toCity = ride.getToCity();
            departureTime = ride.getDepartureTime();
        }
        return BookingDto.builder()
                .id(entity.getId())
                .rideId(rideId)
                .passengerId(passengerId)
                .passengerName(passengerName)
                .status(entity.getStatus())
                .fromCity(fromCity)
                .toCity(toCity)
                .departureTime(departureTime)
                .pickupLat(entity.getPickupLat())
                .pickupLng(entity.getPickupLng())
                .pickupAddress(entity.getPickupAddress())
                .pickupNeighborhood(entity.getPickupNeighborhood())
                .passengerNote(entity.getPassengerNote())
                .build();
    }
}
