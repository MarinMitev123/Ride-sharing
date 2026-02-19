package com.example.carpool.geocode;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class GeocodingResultDto {
    double lat;
    double lng;
    String displayName;
    @Builder.Default String provider = null;
    @Builder.Default String osmType = null;
}
