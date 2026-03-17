package com.example.carpool.route;

import lombok.Value;

import java.util.List;

@Value
public class OptimizedRouteDto {
    /** Точки по пътя за рисуване на линията (lat, lng). */
    List<double[]> coordinates;
    /** Редът на минаване: за всяка позиция (1, 2, 3...) какъв е bookingId (null за старт/край). */
    List<OrderedStopDto> orderedStops;

    @Value
    public static class OrderedStopDto {
        int orderIndex;
        Long bookingId;
        String passengerName;
        String pickupAddress;
        Double pickupLat;
        Double pickupLng;
    }
}
