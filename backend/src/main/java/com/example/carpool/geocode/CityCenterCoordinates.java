package com.example.carpool.geocode;

import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Известни координати на центровете на областните градове в България.
 * Използва се при показване на маршрут, за да не се показва село/друго място от геокодирането.
 */
public final class CityCenterCoordinates {

    private static final Map<String, double[]> CITY_LAT_LNG = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

    static {
        // Областни градове – приблизителен център (lat, lng)
        put("Благоевград", 42.0167, 23.1000);
        put("Бургас", 42.5048, 27.4626);
        put("Варна", 43.2141, 27.9147);
        put("Велико Търново", 43.0812, 25.6290);
        put("Видин", 43.9900, 22.8725);
        put("Враца", 43.2100, 23.5625);
        put("Габрово", 42.8747, 25.3342);
        put("Добрич", 43.5667, 27.8333);
        put("Кърджали", 41.6500, 25.3667);
        put("Кюстендил", 42.2839, 22.6911);
        put("Ловеч", 43.1333, 24.7167);
        put("Монтана", 43.4125, 23.2250);
        put("Пазарджик", 42.1928, 24.3336);
        put("Перник", 42.6000, 23.0333);
        put("Плевен", 43.4167, 24.6167);
        put("Пловдив", 42.1354, 24.7453);
        put("Разград", 43.5333, 26.5167);
        put("Русе", 43.8476, 25.9532);
        put("Силистра", 44.1167, 27.2667);
        put("Сливен", 42.6814, 26.3228);
        put("Смолян", 41.5833, 24.7167);
        put("София", 42.6977, 23.3219);
        put("Стара Загора", 42.4258, 25.6342);
        put("Търговище", 43.2500, 26.5833);
        put("Хасково", 41.9344, 25.5556);
        put("Шумен", 43.2700, 26.9233);
        put("Ямбол", 42.4833, 26.5000);
    }

    private static void put(String city, double lat, double lng) {
        CITY_LAT_LNG.put(city.trim(), new double[]{lat, lng});
    }

    /**
     * Връща координатите на центъра на града, ако градът е в списъка с известни.
     * Сравнението е без значение на регистъра и без водещи/завършващи интервали.
     */
    public static Optional<double[]> getLatLng(String cityName) {
        if (cityName == null || cityName.isBlank()) return Optional.empty();
        double[] coords = CITY_LAT_LNG.get(cityName.trim());
        return coords != null ? Optional.of(coords) : Optional.empty();
    }
}
