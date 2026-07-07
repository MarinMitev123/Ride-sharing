package com.example.carpool.ride;

import com.example.carpool.user.UserEntity;

public class RideMapper {

    private RideMapper() {
    }

    public static RideDto toDto(RideEntity entity) {
        if (entity == null) {
            return null;
        }
        Long driverId = entity.getDriver() != null ? entity.getDriver().getId() : null;
        String driverName = entity.getDriver() != null ? entity.getDriver().getName() : null;
        java.math.BigDecimal driverRatingAverage = entity.getDriver() != null
                ? entity.getDriver().getRatingAverage()
                : null;
        // Stripe Checkout не изисква IBAN на шофьора – картово плащане е налично за всяко пътуване.
        boolean cardPaymentAvailable = entity.getDriver() != null;
        return RideDto.builder()
                .id(entity.getId())
                .driverId(driverId)
                .driverName(driverName)
                .driverRatingAverage(driverRatingAverage)
                .fromCity(entity.getFromCity())
                .fromDistrict(entity.getFromDistrict())
                .toCity(entity.getToCity())
                .toDistrict(entity.getToDistrict())
                .cardPaymentAvailable(cardPaymentAvailable)
                .fromLat(entity.getFromLat())
                .fromLng(entity.getFromLng())
                .toLat(entity.getToLat())
                .toLng(entity.getToLng())
                .departureTime(entity.getDepartureTime())
                .availableSeats(entity.getAvailableSeats())
                .price(entity.getPrice())
                .carDetails(entity.getCarDetails())
                .status(entity.getStatus())
                .build();
    }

    public static RideEntity fromCreateRequest(RideCreateRequest request, UserEntity driver) {
        return RideEntity.builder()
                .driver(driver)
                .fromCity(request.fromCity())
                .fromDistrict(request.fromDistrict())
                .toCity(request.toCity())
                .toDistrict(request.toDistrict())
                .fromLat(request.fromLat())
                .fromLng(request.fromLng())
                .toLat(request.toLat())
                .toLng(request.toLng())
                .departureTime(request.departureTime())
                .availableSeats(request.availableSeats())
                .totalSeats(request.availableSeats())
                .price(request.price())
                .carDetails(request.carDetails())
                .status(RideStatus.OPEN)
                .build();
    }
}

