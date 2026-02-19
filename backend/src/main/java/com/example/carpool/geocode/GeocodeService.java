package com.example.carpool.geocode;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class GeocodeService {

    private static final Logger log = LoggerFactory.getLogger(GeocodeService.class);
    private static final String NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
    private static final String PHOTON_URL = "https://photon.komoot.io/api/";
    private static final String USER_AGENT = "CarpoolDiplomna/1.0 (Bulgarian carpool; contact: carpool@example.com)";
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    /** GeoJSON uses [longitude, latitude] order in coordinates array. */
    private static final Pattern HOUSE_NUMBER_PATTERN = Pattern.compile("\\b\\d+[a-zA-Z]?\\b");

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private final ConcurrentHashMap<String, CachedResults> cache = new ConcurrentHashMap<>();

    public List<GeocodingResultDto> search(String query) {
        String trimmed = query != null ? query.trim() : "";
        if (trimmed.isEmpty()) return List.of();

        CachedResults cached = cache.get(trimmed.toLowerCase());
        if (cached != null && cached.expiresAt > Instant.now().toEpochMilli()) {
            return cached.results;
        }

        boolean queryHasNumber = queryHasHouseNumber(trimmed);
        String numberFromQuery = extractHouseNumberFromQuery(trimmed);

        List<GeocodingResultDto> results;

        if (queryHasNumber) {
            List<PhotonSearchResult> photonResults = searchPhotonRaw(trimmed);
            boolean photonHasAnyHousenumber = photonResults.stream().anyMatch(PhotonSearchResult::hasHousenumber);
            if (!photonHasAnyHousenumber) {
                results = searchNominatimOnly(trimmed, numberFromQuery);
            } else {
                results = toDtoList(photonResults, numberFromQuery);
            }
        } else {
            results = searchPhoton(trimmed, null);
            if (results.isEmpty()) {
                results = searchNominatim(trimmed, true, null);
            }
            if (results.isEmpty()) {
                results = searchNominatim(trimmed, false, null);
            }
        }

        if (!results.isEmpty()) {
            cache.put(trimmed.toLowerCase(), new CachedResults(results, System.currentTimeMillis() + CACHE_TTL_MS));
        }
        return results;
    }

    private static boolean queryHasHouseNumber(String query) {
        return query != null && HOUSE_NUMBER_PATTERN.matcher(query).find();
    }

    private static String extractHouseNumberFromQuery(String query) {
        if (query == null) return null;
        var matcher = HOUSE_NUMBER_PATTERN.matcher(query);
        return matcher.find() ? matcher.group() : null;
    }

    private List<GeocodingResultDto> searchNominatimOnly(String trimmed, String numberFromQuery) {
        List<GeocodingResultDto> results = searchNominatimStructured(trimmed, numberFromQuery);
        if (results.isEmpty()) {
            results = searchNominatim(trimmed, true, numberFromQuery);
        }
        if (results.isEmpty()) {
            results = searchNominatim(trimmed, false, numberFromQuery);
        }
        return results;
    }

    private List<GeocodingResultDto> searchNominatimStructured(String trimmed, String numberFromQuery) {
        String street = trimmed;
        String city = "";
        String country = "Bulgaria";
        int lastComma = trimmed.lastIndexOf(',');
        if (lastComma > 0) {
            street = trimmed.substring(0, lastComma).trim();
            String rest = trimmed.substring(lastComma + 1).trim();
            int prev = rest.lastIndexOf(',');
            if (prev > 0) {
                city = rest.substring(0, prev).trim();
                country = rest.substring(prev + 1).trim();
            } else {
                city = rest;
            }
        }
        try {
            var builder = UriComponentsBuilder.fromHttpUrl(NOMINATIM_URL)
                    .queryParam("street", street)
                    .queryParam("city", city)
                    .queryParam("country", country)
                    .queryParam("format", "json")
                    .queryParam("limit", 5)
                    .queryParam("addressdetails", "1")
                    .queryParam("countrycodes", "bg");
            URI uri = builder.build().encode().toUri();
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);
            headers.set("Referer", "http://localhost:8080/");
            ResponseEntity<String> res = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String body = res.getBody();
            if (body == null || body.isBlank()) return List.of();
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) return List.of();
            List<GeocodingResultDto> list = new ArrayList<>();
            for (JsonNode item : root) {
                String latStr = item.path("lat").asText(null);
                String lonStr = item.path("lon").asText(null);
                if (latStr == null || lonStr == null) continue;
                double lat = Double.parseDouble(latStr);
                double lon = Double.parseDouble(lonStr);
                String displayName = item.path("display_name").asText("");
                if (numberFromQuery != null && !displayName.contains(numberFromQuery)) {
                    displayName = numberFromQuery + " " + displayName;
                }
                list.add(GeocodingResultDto.builder().lat(lat).lng(lon).displayName(displayName).provider("nominatim").osmType(null).build());
                if (list.size() >= 5) break;
            }
            return list;
        } catch (Exception e) {
            log.warn("[geocode] Nominatim structured error for '{}': {}", trimmed, e.getMessage());
            return List.of();
        }
    }

    private List<PhotonSearchResult> searchPhotonRaw(String trimmed) {
        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(PHOTON_URL)
                    .queryParam("q", trimmed)
                    .queryParam("limit", 5)
                    .queryParam("lang", "en")
                    .build().encode().toUri();
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);
            ResponseEntity<String> res = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String body = res.getBody();
            if (body == null || body.isBlank()) return List.of();
            JsonNode root = objectMapper.readTree(body);
            JsonNode features = root.path("features");
            if (!features.isArray()) return List.of();
            List<PhotonSearchResult> list = new ArrayList<>();
            for (JsonNode f : features) {
                JsonNode coords = f.path("geometry").path("coordinates");
                if (!coords.isArray() || coords.size() < 2) continue;
                double lon = coords.get(0).asDouble();
                double lat = coords.get(1).asDouble();
                JsonNode props = f.path("properties");
                String street = props.path("street").asText("");
                String housenumber = props.path("housenumber").asText("");
                if (housenumber.isEmpty()) housenumber = props.path("house_number").asText("");
                String city = props.path("city").asText("");
                String country = props.path("country").asText("");
                List<String> parts = new ArrayList<>();
                if (!street.isEmpty()) parts.add(street);
                if (!housenumber.isEmpty()) parts.add(housenumber);
                if (!city.isEmpty()) parts.add(city);
                if (!country.isEmpty()) parts.add(country);
                String displayName = parts.isEmpty() ? (lat + ", " + lon) : String.join(", ", parts);
                list.add(new PhotonSearchResult(lat, lon, displayName, props.path("osm_type").asText(null), !housenumber.isEmpty()));
                if (list.size() >= 5) break;
            }
            return list;
        } catch (Exception e) {
            log.warn("[geocode] Photon error for '{}': {}", trimmed, e.getMessage());
            return List.of();
        }
    }

    private List<GeocodingResultDto> toDtoList(List<PhotonSearchResult> raw, String numberFromQuery) {
        List<GeocodingResultDto> list = new ArrayList<>();
        for (PhotonSearchResult r : raw) {
            String displayName = r.displayName;
            if (numberFromQuery != null && !r.hasHousenumber && !displayName.contains(numberFromQuery)) {
                displayName = numberFromQuery + " " + displayName;
            }
            list.add(GeocodingResultDto.builder()
                    .lat(r.lat).lng(r.lng).displayName(displayName)
                    .provider("photon").osmType(r.osmType).build());
        }
        return list;
    }

    private List<GeocodingResultDto> searchPhoton(String trimmed, String numberFromQuery) {
        List<PhotonSearchResult> raw = searchPhotonRaw(trimmed);
        return toDtoList(raw, numberFromQuery);
    }

    private List<GeocodingResultDto> searchNominatim(String trimmed, boolean restrictBg, String numberFromQuery) {
        try {
            var builder = UriComponentsBuilder.fromHttpUrl(NOMINATIM_URL)
                    .queryParam("q", trimmed)
                    .queryParam("format", "json")
                    .queryParam("limit", 5)
                    .queryParam("addressdetails", "0");
            if (restrictBg) builder.queryParam("countrycodes", "bg");
            URI uri = builder.build().encode().toUri();
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", USER_AGENT);
            headers.set("Referer", "http://localhost:8080/");
            ResponseEntity<String> res = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            String body = res.getBody();
            if (body == null || body.isBlank()) return List.of();
            JsonNode root = objectMapper.readTree(body);
            if (!root.isArray()) return List.of();
            List<GeocodingResultDto> list = new ArrayList<>();
            for (JsonNode item : root) {
                String latStr = item.path("lat").asText(null);
                String lonStr = item.path("lon").asText(null);
                if (latStr == null || lonStr == null) continue;
                double lat = Double.parseDouble(latStr);
                double lon = Double.parseDouble(lonStr);
                String displayName = item.path("display_name").asText("");
                if (numberFromQuery != null && !displayName.contains(numberFromQuery)) {
                    displayName = numberFromQuery + " " + displayName;
                }
                list.add(GeocodingResultDto.builder().lat(lat).lng(lon).displayName(displayName).provider("nominatim").build());
                if (list.size() >= 5) break;
            }
            return list;
        } catch (Exception e) {
            log.warn("[geocode] Nominatim error for '{}': {}", trimmed, e.getMessage());
            return List.of();
        }
    }

    private record PhotonSearchResult(double lat, double lng, String displayName, String osmType, boolean hasHousenumber) {}
    private record CachedResults(List<GeocodingResultDto> results, long expiresAt) {}
}
