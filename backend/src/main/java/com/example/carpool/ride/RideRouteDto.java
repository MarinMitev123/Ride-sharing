package com.example.carpool.ride;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class RideRouteDto {
    List<double[]> coordinates;
    List<RideStopDto> stops;
}
