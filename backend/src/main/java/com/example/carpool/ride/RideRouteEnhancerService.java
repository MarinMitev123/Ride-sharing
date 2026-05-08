package com.example.carpool.ride;

import com.example.carpool.geocode.CityCenterCoordinates;
import com.example.carpool.geocode.GeocodeService;
import com.example.carpool.geocode.GeocodingResultDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Runs in its own write transaction so that lazy geocode + route persistence
 * works when called from read-only getRouteWithStops (self-invocation would
 * otherwise run in the same read-only transaction).
 */
@Service
@RequiredArgsConstructor
public class RideRouteEnhancerService {

    private final RideRepository rideRepository;
    private final GeocodeService geocodeService;
    private final RideService rideService;

    /**
     * If ride has fromCity/toCity but no coordinates, resolve them (city center first, else geocode) and persist
     * route + START/END stops. Must run in a new transaction to allow writes.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureRouteAndStopsFromGeocode(Long rideId) {
        RideEntity ride = rideRepository.findById(rideId).orElse(null);
        if (ride == null) return;
        if (ride.getFromLat() != null && ride.getFromLng() != null) return;
        String fromCity = ride.getFromCity();
        String toCity = ride.getToCity();
        if (fromCity == null || fromCity.isBlank() || toCity == null || toCity.isBlank()) return;

        double fromLat;
        double fromLng;
        double toLat;
        double toLng;

        var fromOpt = CityCenterCoordinates.getLatLng(fromCity);
        if (fromOpt.isPresent()) {
            double[] c = fromOpt.get();
            fromLat = c[0];
            fromLng = c[1];
        } else {
            List<GeocodingResultDto> fromResults = geocodeService.search(fromCity + ", Bulgaria");
            if (fromResults.isEmpty()) return;
            fromLat = fromResults.get(0).getLat();
            fromLng = fromResults.get(0).getLng();
        }

        var toOpt = CityCenterCoordinates.getLatLng(toCity);
        if (toOpt.isPresent()) {
            double[] c = toOpt.get();
            toLat = c[0];
            toLng = c[1];
        } else {
            List<GeocodingResultDto> toResults = geocodeService.search(toCity + ", Bulgaria");
            if (toResults.isEmpty()) return;
            toLat = toResults.get(0).getLat();
            toLng = toResults.get(0).getLng();
        }

        ride.setFromLat(fromLat);
        ride.setFromLng(fromLng);
        ride.setToLat(toLat);
        ride.setToLng(toLng);
        rideRepository.save(ride);
        rideService.ensureRouteAndStopsForRide(rideId);
    }
}
