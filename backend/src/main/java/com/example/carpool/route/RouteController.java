package com.example.carpool.route;

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
public class RouteController {

    private final RouteService routeService;

    @GetMapping("/route")
    public ResponseEntity<RouteDto> getDrivingRoute(
            @RequestParam double fromLat,
            @RequestParam double fromLng,
            @RequestParam double toLat,
            @RequestParam double toLng) {
        RouteDto route = routeService.getDrivingRoute(fromLat, fromLng, toLat, toLng);
        return ResponseEntity.ok(route);
    }
}
