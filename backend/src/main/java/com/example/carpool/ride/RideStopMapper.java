package com.example.carpool.ride;

public class RideStopMapper {

    private RideStopMapper() {
    }

    public static RideStopDto toDto(RideStopEntity entity) {
        if (entity == null) return null;
        Long rideId = entity.getRide() != null ? entity.getRide().getId() : null;
        return RideStopDto.builder()
                .id(entity.getId())
                .rideId(rideId)
                .name(entity.getName())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .stopOrder(entity.getStopOrder())
                .type(entity.getType())
                .build();
    }
}
