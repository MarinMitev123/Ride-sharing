package com.example.carpool.route;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteService {

    private static final String OSRM_URL_TWO = "https://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=full&geometries=geojson";
    private static final String OSRM_URL_WAYPOINTS = "https://router.project-osrm.org/route/v1/driving/%s?overview=full&geometries=geojson";
    /** OSRM Trip API – оптимизира реда на точките (TSP). source=first, destination=last. */
    private static final String OSRM_URL_TRIP = "https://router.project-osrm.org/trip/v1/driving/%s?source=first&destination=last&geometries=geojson&overview=full";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Връща маршрут по пътища (като с кола) между две точки.
     * Използва OSRM (Open Source Routing Machine). При грешка връща права линия между точките.
     */
    public RouteDto getDrivingRoute(double fromLat, double fromLng, double toLat, double toLng) {
        String url = String.format(OSRM_URL_TWO, fromLng, fromLat, toLng, toLat);
        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) return fallbackRoute(fromLat, fromLng, toLat, toLng);

            JsonNode root = objectMapper.readTree(json);
            JsonNode routes = root.get("routes");
            if (routes == null || !routes.isArray() || routes.isEmpty()) {
                return fallbackRoute(fromLat, fromLng, toLat, toLng);
            }
            JsonNode geometry = routes.get(0).get("geometry");
            if (geometry == null) return fallbackRoute(fromLat, fromLng, toLat, toLng);
            JsonNode coords = geometry.get("coordinates");
            if (coords == null || !coords.isArray()) return fallbackRoute(fromLat, fromLng, toLat, toLng);

            List<double[]> coordinates = new ArrayList<>();
            for (JsonNode point : coords) {
                if (point.isArray() && point.size() >= 2) {
                    double lng = point.get(0).asDouble();
                    double lat = point.get(1).asDouble();
                    coordinates.add(new double[]{lat, lng});
                }
            }
            if (coordinates.isEmpty()) return fallbackRoute(fromLat, fromLng, toLat, toLng);
            return new RouteDto(coordinates);
        } catch (Exception e) {
            log.warn("OSRM route failed, using straight line: {}", e.getMessage());
            return fallbackRoute(fromLat, fromLng, toLat, toLng);
        }
    }

    /**
     * Маршрут по пътища през множество точки (напр. старт → качване 1 → качване 2 → край).
     * Всеки waypoint е [lat, lng]. При грешка връща права линия между първа и последна точка.
     */
    public RouteDto getDrivingRouteWithWaypoints(List<double[]> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            return waypoints != null && waypoints.size() == 1
                    ? new RouteDto(List.of(waypoints.get(0), waypoints.get(0)))
                    : new RouteDto(List.of());
        }
        String coords = waypoints.stream()
                .map(w -> w.length >= 2 ? w[1] + "," + w[0] : null)
                .filter(s -> s != null)
                .reduce((a, b) -> a + ";" + b)
                .orElse("");
        if (coords.isEmpty()) return fallbackRouteFromList(waypoints);
        String url = String.format(OSRM_URL_WAYPOINTS, coords);
        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) return fallbackRouteFromList(waypoints);

            JsonNode root = objectMapper.readTree(json);
            JsonNode routes = root.get("routes");
            if (routes == null || !routes.isArray() || routes.isEmpty()) {
                return fallbackRouteFromList(waypoints);
            }
            JsonNode geometry = routes.get(0).get("geometry");
            if (geometry == null) return fallbackRouteFromList(waypoints);
            JsonNode coordsNode = geometry.get("coordinates");
            if (coordsNode == null || !coordsNode.isArray()) return fallbackRouteFromList(waypoints);

            List<double[]> coordinates = new ArrayList<>();
            for (JsonNode point : coordsNode) {
                if (point.isArray() && point.size() >= 2) {
                    double lng = point.get(0).asDouble();
                    double lat = point.get(1).asDouble();
                    coordinates.add(new double[]{lat, lng});
                }
            }
            if (coordinates.isEmpty()) return fallbackRouteFromList(waypoints);
            return new RouteDto(coordinates);
        } catch (Exception e) {
            log.warn("OSRM route with waypoints failed: {}", e.getMessage());
            return fallbackRouteFromList(waypoints);
        }
    }

    private static RouteDto fallbackRouteFromList(List<double[]> waypoints) {
        if (waypoints == null || waypoints.size() < 2) return new RouteDto(List.of());
        return new RouteDto(List.of(waypoints.get(0), waypoints.get(waypoints.size() - 1)));
    }

    private static RouteDto fallbackRoute(double fromLat, double fromLng, double toLat, double toLng) {
        return new RouteDto(List.of(
                new double[]{fromLat, fromLng},
                new double[]{toLat, toLng}
        ));
    }

    /**
     * Резултат от OSRM Trip: координати на маршрута и ред на точките (индекси в оригиналния списък).
     * orderedWaypointIndices.get(i) = оригинален индекс на i-тата точка в оптимизирания маршрут.
     */
    public static class OptimizedTripResult {
        public final List<double[]> coordinates;
        public final List<Integer> orderedWaypointIndices;

        public OptimizedTripResult(List<double[]> coordinates, List<Integer> orderedWaypointIndices) {
            this.coordinates = coordinates;
            this.orderedWaypointIndices = orderedWaypointIndices;
        }
    }

    /**
     * Оптимизиран маршрут през всички waypoints (най-кратък ред за посещение).
     * waypoints: [start, stop1, stop2, ..., end]. Връща координати и реда на индексите.
     */
    public OptimizedTripResult getOptimizedTrip(List<double[]> waypoints) {
        if (waypoints == null || waypoints.size() < 2) {
            List<Integer> order = new ArrayList<>();
            for (int i = 0; i < (waypoints != null ? waypoints.size() : 0); i++) order.add(i);
            return new OptimizedTripResult(
                    waypoints != null && !waypoints.isEmpty() ? List.of(waypoints.get(0), waypoints.get(0)) : List.of(),
                    order);
        }
        String coords = waypoints.stream()
                .map(w -> w.length >= 2 ? w[1] + "," + w[0] : null)
                .filter(s -> s != null)
                .reduce((a, b) -> a + ";" + b)
                .orElse("");
        if (coords.isEmpty()) return fallbackOptimizedTrip(waypoints);
        String url = String.format(OSRM_URL_TRIP, coords);
        try {
            String json = restTemplate.getForObject(url, String.class);
            if (json == null) return fallbackOptimizedTrip(waypoints);

            JsonNode root = objectMapper.readTree(json);
            JsonNode waypointsNode = root.get("waypoints");
            List<Integer> orderedIndices = new ArrayList<>();
            if (waypointsNode != null && waypointsNode.isArray()) {
                for (JsonNode wp : waypointsNode) {
                    JsonNode idx = wp.get("waypoint_index");
                    if (idx != null && idx.isInt()) orderedIndices.add(idx.asInt());
                }
            }
            if (orderedIndices.isEmpty()) {
                for (int i = 0; i < waypoints.size(); i++) orderedIndices.add(i);
            }

            JsonNode trips = root.get("trips");
            if (trips == null || !trips.isArray() || trips.isEmpty()) {
                return new OptimizedTripResult(expandWaypointsInOrder(waypoints, orderedIndices), orderedIndices);
            }
            JsonNode geometry = trips.get(0).get("geometry");
            if (geometry == null) {
                return new OptimizedTripResult(expandWaypointsInOrder(waypoints, orderedIndices), orderedIndices);
            }
            JsonNode coordsNode = geometry.get("coordinates");
            if (coordsNode == null || !coordsNode.isArray()) {
                return new OptimizedTripResult(expandWaypointsInOrder(waypoints, orderedIndices), orderedIndices);
            }
            List<double[]> coordinates = new ArrayList<>();
            for (JsonNode point : coordsNode) {
                if (point.isArray() && point.size() >= 2) {
                    double lng = point.get(0).asDouble();
                    double lat = point.get(1).asDouble();
                    coordinates.add(new double[]{lat, lng});
                }
            }
            if (coordinates.isEmpty()) coordinates = expandWaypointsInOrder(waypoints, orderedIndices);
            return new OptimizedTripResult(coordinates, orderedIndices);
        } catch (Exception e) {
            log.warn("OSRM trip failed, using fallback order: {}", e.getMessage());
            return fallbackOptimizedTrip(waypoints);
        }
    }

    private static OptimizedTripResult fallbackOptimizedTrip(List<double[]> waypoints) {
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < waypoints.size(); i++) order.add(i);
        return new OptimizedTripResult(expandWaypointsInOrder(waypoints, order), order);
    }

    private static List<double[]> expandWaypointsInOrder(List<double[]> waypoints, List<Integer> order) {
        List<double[]> out = new ArrayList<>();
        for (Integer idx : order) {
            if (idx >= 0 && idx < waypoints.size()) out.add(waypoints.get(idx));
        }
        return out.size() >= 2 ? out : (waypoints.size() >= 2 ? List.of(waypoints.get(0), waypoints.get(waypoints.size() - 1)) : waypoints);
    }
}
