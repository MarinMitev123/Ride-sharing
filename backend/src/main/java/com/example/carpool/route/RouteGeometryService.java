package com.example.carpool.route;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Геометрия върху полилиния: разстояние от точка до маршрут,
 * най-близка точка по маршрута, прогрес/ред по маршрута.
 */
@Service
public class RouteGeometryService {

    /**
     * Разстояние в км от точка до най-близката точка на полилинията.
     */
    public double distanceFromPointToRoute(double lat, double lng, List<double[]> polyline) {
        if (polyline == null || polyline.isEmpty()) return 0;
        double minDist = Double.MAX_VALUE;
        for (int i = 0; i < polyline.size() - 1; i++) {
            double[] a = polyline.get(i);
            double[] b = polyline.get(i + 1);
            double d = distanceToSegmentKm(lat, lng, a[0], a[1], b[0], b[1]);
            if (d < minDist) minDist = d;
        }
        return minDist == Double.MAX_VALUE ? 0 : minDist;
    }

    /**
     * Най-близка точка на полилинията до дадената точка (проекция върху сегмента).
     * Връща [lat, lng]. При празна полилиния връща входните lat, lng.
     */
    public double[] nearestPointOnRoute(double lat, double lng, List<double[]> polyline) {
        if (polyline == null || polyline.size() < 2) return new double[]{lat, lng};
        double minDist = Double.MAX_VALUE;
        double[] best = new double[]{lat, lng};
        for (int i = 0; i < polyline.size() - 1; i++) {
            double[] a = polyline.get(i);
            double[] b = polyline.get(i + 1);
            double dx = b[1] - a[1];
            double dy = b[0] - a[0];
            double t = ((lng - a[1]) * dx + (lat - a[0]) * dy) / (dx * dx + dy * dy + 1e-20);
            t = Math.max(0, Math.min(1, t));
            double pLng = a[1] + t * dx;
            double pLat = a[0] + t * dy;
            double d = haversineKm(lat, lng, pLat, pLng);
            if (d < minDist) {
                minDist = d;
                best[0] = pLat;
                best[1] = pLng;
            }
        }
        return best;
    }

    /**
     * Прогрес по маршрута в км от началото до най-близката точка до (lat, lng).
     * Използва се за подреждане на спирки (pickup преди dropoff).
     */
    public double orderAlongRoute(double lat, double lng, List<double[]> polyline) {
        if (polyline == null || polyline.size() < 2) return 0;
        double minDist = Double.MAX_VALUE;
        double bestOrder = 0;
        double cumulative = 0;
        for (int i = 0; i < polyline.size() - 1; i++) {
            double[] a = polyline.get(i);
            double[] b = polyline.get(i + 1);
            double segLen = haversineKm(a[0], a[1], b[0], b[1]);
            double dx = b[1] - a[1];
            double dy = b[0] - a[0];
            double t = ((lng - a[1]) * dx + (lat - a[0]) * dy) / (dx * dx + dy * dy + 1e-20);
            t = Math.max(0, Math.min(1, t));
            double d = haversineKm(lat, lng, a[0] + t * dy, a[1] + t * dx);
            if (d < minDist) {
                minDist = d;
                bestOrder = cumulative + t * segLen;
            }
            cumulative += segLen;
        }
        return bestOrder;
    }

    private static double distanceToSegmentKm(double lat, double lng, double aLat, double aLng, double bLat, double bLng) {
        double dx = bLng - aLng;
        double dy = bLat - aLat;
        double t = ((lng - aLng) * dx + (lat - aLat) * dy) / (dx * dx + dy * dy + 1e-20);
        t = Math.max(0, Math.min(1, t));
        double projLng = aLng + t * dx;
        double projLat = aLat + t * dy;
        return haversineKm(lat, lng, projLat, projLng);
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c;
    }
}
