package com.example.carpool.geocode;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class GeocodeController {

    private final GeocodeService geocodeService;

    @GetMapping("/geocode")
    public ResponseEntity<List<GeocodingResultDto>> search(@RequestParam("q") String query) {
        String q = query != null ? query.trim() : "";
        List<GeocodingResultDto> results = geocodeService.search(q);
        return ResponseEntity.ok(results);
    }
}
