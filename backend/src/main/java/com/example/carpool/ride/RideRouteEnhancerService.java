package com.example.carpool.ride;

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
     * If ride has fromCity/toCity but no coordinates, geocode them and persist
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
        List<GeocodingResultDto> fromResults = geocodeService.search(fromCity + ", Bulgaria");
        List<GeocodingResultDto> toResults = geocodeService.search(toCity + ", Bulgaria");
        if (fromResults.isEmpty() || toResults.isEmpty()) return;
        double fromLat = fromResults.get(0).getLat();
        double fromLng = fromResults.get(0).getLng();
        double toLat = toResults.get(0).getLat();
        double toLng = toResults.get(0).getLng();
        ride.setFromLat(fromLat);
        ride.setFromLng(fromLng);
        ride.setToLat(toLat);
        ride.setToLng(toLng);
        rideRepository.save(ride);
        rideService.ensureRouteAndStopsForRide(rideId);
    }
}
