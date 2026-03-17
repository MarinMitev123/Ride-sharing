package com.example.carpool.route;

import lombok.Value;

import java.util.List;

@Value
public class RouteDto {
    /** Списък от точки [lat, lng] по пътя за кола */
    List<double[]> coordinates;
}
