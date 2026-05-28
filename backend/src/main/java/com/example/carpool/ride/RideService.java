package com.example.carpool.ride;

import com.example.carpool.booking.BookingDto;
import com.example.carpool.booking.BookingRepository;
import com.example.carpool.booking.BookingStatus;
import com.example.carpool.booking.BookingService;
import com.example.carpool.booking.PaymentMethod;
import com.example.carpool.geocode.CityCenterCoordinates;
import com.example.carpool.geocode.GeocodeService;
import com.example.carpool.geocode.GeocodingResultDto;
import com.example.carpool.route.RouteDto;
import com.example.carpool.route.RouteGeometryService;
import com.example.carpool.route.RouteService;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final RideStopRepository rideStopRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final DriverLocationRepository driverLocationRepository;
    private final RouteService routeService;
    private final RouteGeometryService routeGeometryService;
    private final GeocodeService geocodeService;

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;
    private static final double DEFAULT_MAX_DETOUR_KM = 5.0;
    private static final double KM_PER_DEGREE_APPROX = 111.0;
    /** Границите на календарния ден за филтър да съвпадат с датата от браузъра (България), не с UTC на сървъра */
    private static final ZoneId FILTER_DAY_ZONE = ZoneId.of("Europe/Sofia");

    @Transactional(readOnly = false)
    public RideDto createRide(Long driverId, RideCreateRequest request) {
        UserEntity driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        RideEntity ride = RideMapper.fromCreateRequest(request, driver);
        // Попълваме центъра на града само ако клиентът не е подал координати (напр. за квартал).
        if (ride.getFromLat() == null || ride.getFromLng() == null) {
            CityCenterCoordinates.getLatLng(ride.getFromCity()).ifPresent(c -> {
                ride.setFromLat(c[0]);
                ride.setFromLng(c[1]);
            });
        }
        if (ride.getToLat() == null || ride.getToLng() == null) {
            CityCenterCoordinates.getLatLng(ride.getToCity()).ifPresent(c -> {
                ride.setToLat(c[0]);
                ride.setToLng(c[1]);
            });
        }
        RideEntity saved = rideRepository.save(ride);
        ensureRouteAndStops(saved);
        return RideMapper.toDto(rideRepository.findById(saved.getId()).orElse(saved));
    }

    /** Compute route polyline and create START/END stops if ride has coordinates. */
    private void ensureRouteAndStops(RideEntity ride) {
        Double fromLat = ride.getFromLat();
        Double fromLng = ride.getFromLng();
        Double toLat = ride.getToLat();
        Double toLng = ride.getToLng();
        if (fromLat == null || fromLng == null || toLat == null || toLng == null) return;
        if (ride.getRoutePolyline() != null && !ride.getRoutePolyline().isEmpty()) return;
        RouteDto route = routeService.getDrivingRoute(fromLat, fromLng, toLat, toLng);
        if (route.getCoordinates().isEmpty()) return;
        ride.setRoutePolyline(polylineToString(route.getCoordinates()));
        rideRepository.save(ride);
        List<RideStopEntity> existing = rideStopRepository.findByRide_IdOrderByStopOrderAsc(ride.getId());
        if (!existing.isEmpty()) return;
        RideStopEntity start = RideStopEntity.builder()
                .ride(ride).name(ride.getFromCity()).latitude(fromLat).longitude(fromLng).stopOrder(0).type(StopType.START).build();
        RideStopEntity end = RideStopEntity.builder()
                .ride(ride).name(ride.getToCity()).latitude(toLat).longitude(toLng).stopOrder(1000).type(StopType.END).build();
        rideStopRepository.save(start);
        rideStopRepository.save(end);
    }

    @Transactional(readOnly = true)
    public List<RideDto> getAllRides() {
        return rideRepository.findAll()
                .stream()
                .map(RideMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RideDto> getRidesByDriverId(Long driverId) {
        return rideRepository.findByDriverIdOrderByDepartureTimeDesc(driverId)
                .stream()
                .map(RideMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<RideDto> getRidesFiltered(String fromCity, String toCity, LocalDate date,
                                          int page, int size, String sortBy, String sortDir) {
        int safeSize = Math.min(Math.max(1, size), MAX_PAGE_SIZE);
        int safePage = Math.max(0, page);
        Sort sort = parseSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        String from = (fromCity != null && !fromCity.isBlank()) ? fromCity.trim() : null;
        String to = (toCity != null && !toCity.isBlank()) ? toCity.trim() : null;
        LocalDateTime dateStart = date != null ? date.atStartOfDay(FILTER_DAY_ZONE).toLocalDateTime() : null;
        LocalDateTime dateEnd = date != null ? date.plusDays(1).atStartOfDay(FILTER_DAY_ZONE).toLocalDateTime() : null;

        return rideRepository.findFiltered(from, to, dateStart, dateEnd, pageable)
                .map(RideMapper::toDto);
    }

    private static Sort parseSort(String sortBy, String sortDir) {
        String property = (sortBy != null && !sortBy.isBlank()) ? sortBy : "departureTime";
        if (!"price".equals(property) && !"departureTime".equals(property) && !"fromCity".equals(property)) {
            property = "departureTime";
        }
        boolean asc = !"desc".equalsIgnoreCase(sortDir != null ? sortDir : "asc");
        return Sort.by(asc ? Sort.Direction.ASC : Sort.Direction.DESC, property);
    }

    @Transactional(readOnly = true)
    public RideDto getRideById(Long id) {
        RideEntity entity = rideRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        RideDto dto = RideMapper.toDto(entity);
        return withResolvedCoordinates(entity, dto);
    }

    @Transactional(readOnly = false)
    public RideDto finishRide(Long rideId, Long driverId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new AccessDeniedException("Only the driver can finish this ride");
        }
        if (ride.getStatus() == RideStatus.CANCELED) {
            throw new IllegalArgumentException("Canceled ride cannot be finished");
        }
        ride.setStatus(RideStatus.FINISHED);
        RideEntity saved = rideRepository.save(ride);
        return RideMapper.toDto(saved);
    }

    @Transactional
    public DriverLocationDto upsertDriverLocation(Long rideId, Long driverId, DriverLocationUpdateRequest request) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driverId)) {
            throw new AccessDeniedException("Only ride driver can update location");
        }
        UserEntity targetPassenger = userRepository.findById(request.targetPassengerId())
                .orElseThrow(() -> new IllegalArgumentException("Target passenger not found"));
        boolean passengerInRide = bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId,
                request.targetPassengerId(),
                List.of(BookingStatus.APPROVED, BookingStatus.PENDING_PAYMENT)
        );
        if (!passengerInRide) {
            throw new AccessDeniedException("Target passenger is not an active passenger for this ride");
        }
        if (Boolean.TRUE.equals(request.isActive()) && (request.latitude() == null || request.longitude() == null)) {
            throw new IllegalArgumentException("Latitude and longitude are required when sharing is active");
        }

        DriverLocationEntity entity = driverLocationRepository
                .findByRide_IdAndDriver_IdAndTargetPassenger_Id(rideId, driverId, request.targetPassengerId())
                .orElseGet(() -> DriverLocationEntity.builder()
                        .ride(ride)
                        .driver(ride.getDriver())
                        .targetPassenger(targetPassenger)
                        .latitude(request.latitude() != null ? request.latitude() : 0.0d)
                        .longitude(request.longitude() != null ? request.longitude() : 0.0d)
                        .active(false)
                        .updatedAt(LocalDateTime.now())
                        .build());

        if (Boolean.TRUE.equals(request.isActive())) {
            driverLocationRepository.findByRide_IdAndDriver_IdAndActiveTrue(rideId, driverId).stream()
                    .filter(active -> !active.getTargetPassenger().getId().equals(request.targetPassengerId()))
                    .forEach(active -> {
                        active.setActive(false);
                        active.setUpdatedAt(LocalDateTime.now());
                        driverLocationRepository.save(active);
                    });
            entity.setLatitude(request.latitude());
            entity.setLongitude(request.longitude());
        }

        entity.setActive(Boolean.TRUE.equals(request.isActive()));
        entity.setUpdatedAt(LocalDateTime.now());
        DriverLocationEntity saved = driverLocationRepository.save(entity);
        return toDriverLocationDto(saved);
    }

    /**
     * Липсата на активно споделяне не е грешка (пътникът полинва преди шофьорът да пусне GPS) —
     * връща празен Optional; контролерът отговаря с 204 No Content.
     */
    @Transactional(readOnly = true)
    public Optional<DriverLocationDto> getDriverLocation(Long rideId, Long userId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        Optional<DriverLocationEntity> activeOpt = driverLocationRepository
                .findFirstByRide_IdAndActiveTrueOrderByUpdatedAtDesc(rideId);
        if (activeOpt.isEmpty()) {
            return Optional.empty();
        }
        DriverLocationEntity active = activeOpt.get();
        boolean isDriver = ride.getDriver() != null && ride.getDriver().getId().equals(userId);
        boolean isTargetPassenger = active.getTargetPassenger() != null && active.getTargetPassenger().getId().equals(userId);
        if (!isDriver && !isTargetPassenger) {
            throw new AccessDeniedException("You do not have access to this driver location");
        }
        return Optional.of(toDriverLocationDto(active));
    }

    private DriverLocationDto toDriverLocationDto(DriverLocationEntity entity) {
        return DriverLocationDto.builder()
                .rideId(entity.getRide() != null ? entity.getRide().getId() : null)
                .driverId(entity.getDriver() != null ? entity.getDriver().getId() : null)
                .targetPassengerId(entity.getTargetPassenger() != null ? entity.getTargetPassenger().getId() : null)
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .isActive(entity.isActive())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    /** Ако липсват координати, попълва с центъра на града за известни градове. */
    private RideDto withResolvedCoordinates(RideEntity entity, RideDto dto) {
        Double fromLat = dto.getFromLat();
        Double fromLng = dto.getFromLng();
        Double toLat = dto.getToLat();
        Double toLng = dto.getToLng();
        var fromOpt = entity.getFromCity() != null && !entity.getFromCity().isBlank()
                ? CityCenterCoordinates.getLatLng(entity.getFromCity()) : Optional.<double[]>empty();
        var toOpt = entity.getToCity() != null && !entity.getToCity().isBlank()
                ? CityCenterCoordinates.getLatLng(entity.getToCity()) : Optional.<double[]>empty();
        if ((fromLat == null || fromLng == null) && fromOpt.isPresent()) {
            double[] c = fromOpt.get();
            fromLat = c[0];
            fromLng = c[1];
        }
        if ((toLat == null || toLng == null) && toOpt.isPresent()) {
            double[] c = toOpt.get();
            toLat = c[0];
            toLng = c[1];
        }
        if (java.util.Objects.equals(fromLat, dto.getFromLat())
                && java.util.Objects.equals(fromLng, dto.getFromLng())
                && java.util.Objects.equals(toLat, dto.getToLat())
                && java.util.Objects.equals(toLng, dto.getToLng())) return dto;
        return RideDto.builder()
                .id(dto.getId())
                .driverId(dto.getDriverId())
                .fromCity(dto.getFromCity())
                .fromDistrict(dto.getFromDistrict())
                .toCity(dto.getToCity())
                .toDistrict(dto.getToDistrict())
                .cardPaymentAvailable(dto.getCardPaymentAvailable())
                .fromLat(fromLat)
                .fromLng(fromLng)
                .toLat(toLat)
                .toLng(toLng)
                .departureTime(dto.getDepartureTime())
                .availableSeats(dto.getAvailableSeats())
                .price(dto.getPrice())
                .carDetails(dto.getCarDetails())
                .status(dto.getStatus())
                .build();
    }

    /**
     * Маршрут за шофьора: старт → точки за качване (сортирани по разстояние от старта) → край.
     * Само шофьорът на пътуването може да вика този метод.
     */
    @Transactional(readOnly = true)
    public RouteDto getDriverRoute(Long rideId, Long driverId) {
        RideDto ride = getRideById(rideId);
        if (!ride.getDriverId().equals(driverId)) {
            throw new AccessDeniedException("Only the driver can request driver route");
        }
        List<double[]> waypoints = new ArrayList<>();
        Double fromLat = ride.getFromLat();
        Double fromLng = ride.getFromLng();
        Double toLat = ride.getToLat();
        Double toLng = ride.getToLng();
        if (fromLat != null && fromLng != null) {
            waypoints.add(new double[]{fromLat, fromLng});
        }
        // Включваме реалните точки за качване И слизане (по stopOrder), не само snap към основната линия.
        List<BookingDto> activeBookings = bookingService.getBookingsForRide(rideId).stream()
                .filter(b -> b.getStatus() == com.example.carpool.booking.BookingStatus.APPROVED
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING_PAYMENT)
                .collect(Collectors.toList());
        java.util.Set<Long> activeStopIds = new java.util.HashSet<>();
        for (BookingDto b : activeBookings) {
            if (b.getPickupStopId() != null) activeStopIds.add(b.getPickupStopId());
            if (b.getDropoffStopId() != null) activeStopIds.add(b.getDropoffStopId());
        }
        List<RideStopEntity> orderedStops = rideStopRepository.findByRide_IdOrderByStopOrderAsc(rideId).stream()
                .filter(s -> activeStopIds.contains(s.getId()))
                .sorted(Comparator.comparingInt(RideStopEntity::getStopOrder))
                .collect(Collectors.toList());
        for (RideStopEntity s : orderedStops) {
            if (s.getLatitude() != null && s.getLongitude() != null) {
                waypoints.add(new double[]{s.getLatitude(), s.getLongitude()});
            }
        }
        if (toLat != null && toLng != null) {
            waypoints.add(new double[]{toLat, toLng});
        }
        if (waypoints.isEmpty() && fromLat != null && fromLng != null) {
            waypoints.add(new double[]{fromLat, fromLng});
        }
        if (waypoints.isEmpty() && toLat != null && toLng != null) {
            waypoints.add(new double[]{toLat, toLng});
        }
        return routeService.getDrivingRouteWithWaypoints(waypoints);
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return 6371 * c;
    }

    private static String polylineToString(List<double[]> coords) {
        if (coords == null || coords.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < coords.size(); i++) {
            double[] p = coords.get(i);
            if (p.length >= 2) {
                if (i > 0) sb.append(';');
                sb.append(p[0]).append(',').append(p[1]);
            }
        }
        return sb.toString();
    }

    private static List<double[]> parsePolyline(String s) {
        List<double[]> out = new ArrayList<>();
        if (s == null || s.isBlank()) return out;
        for (String part : s.split(";")) {
            String[] xy = part.trim().split(",");
            if (xy.length >= 2) {
                try {
                    double lat = Double.parseDouble(xy[0].trim());
                    double lng = Double.parseDouble(xy[1].trim());
                    out.add(new double[]{lat, lng});
                } catch (NumberFormatException ignored) { }
            }
        }
        return out;
    }

    /** Returns polyline coordinates for a ride (from stored polyline or computed in-memory). Does not persist. */
    private List<double[]> getPolylineForRide(RideEntity ride) {
        List<double[]> polyline = parsePolyline(ride.getRoutePolyline());
        if (!polyline.isEmpty()) return polyline;
        if (ride.getFromLat() != null && ride.getFromLng() != null && ride.getToLat() != null && ride.getToLng() != null) {
            RouteDto route = routeService.getDrivingRoute(ride.getFromLat(), ride.getFromLng(), ride.getToLat(), ride.getToLng());
            return route.getCoordinates();
        }
        return List.of();
    }

    /**
     * Полилиния за валидиране – същата като на картата (fromCity → toCity), с попълване от градове ако няма записани координати.
     * Ако записаната полилиния е в обратна посока спрямо от/до град, обърни я.
     */
    private List<double[]> getPolylineForRideForValidation(RideEntity ride) {
        List<double[]> polyline = getPolylineForRide(ride);
        if (polyline.size() < 2) {
            polyline = resolvePolylineFromCities(ride);
            if (!polyline.isEmpty()) return polyline;
            return List.of();
        }
        Optional<double[]> fromOpt = ride.getFromCity() != null && !ride.getFromCity().isBlank()
                ? CityCenterCoordinates.getLatLng(ride.getFromCity()) : Optional.empty();
        Optional<double[]> toOpt = ride.getToCity() != null && !ride.getToCity().isBlank()
                ? CityCenterCoordinates.getLatLng(ride.getToCity()) : Optional.empty();
        if (fromOpt.isPresent() && toOpt.isPresent()) {
            double[] fromC = fromOpt.get();
            double[] toC = toOpt.get();
            double[] first = polyline.get(0);
            double[] last = polyline.get(polyline.size() - 1);
            double distFirstToFrom = haversineKm(first[0], first[1], fromC[0], fromC[1]);
            double distFirstToTo = haversineKm(first[0], first[1], toC[0], toC[1]);
            if (distFirstToTo < distFirstToFrom) {
                List<double[]> reversed = new ArrayList<>(polyline);
                java.util.Collections.reverse(reversed);
                return reversed;
            }
        }
        return polyline;
    }

    private List<double[]> resolvePolylineFromCities(RideEntity ride) {
        double fromLat = ride.getFromLat() != null ? ride.getFromLat() : 0;
        double fromLng = ride.getFromLng() != null ? ride.getFromLng() : 0;
        double toLat = ride.getToLat() != null ? ride.getToLat() : 0;
        double toLng = ride.getToLng() != null ? ride.getToLng() : 0;
        if (fromLat == 0 && fromLng == 0 && ride.getFromCity() != null && !ride.getFromCity().isBlank()) {
            Optional<double[]> fromOpt = CityCenterCoordinates.getLatLng(ride.getFromCity());
            if (fromOpt.isPresent()) {
                double[] f = fromOpt.get();
                fromLat = f[0]; fromLng = f[1];
            } else {
                List<GeocodingResultDto> fromResults = geocodeService.search(ride.getFromCity() + ", Bulgaria");
                if (!fromResults.isEmpty()) {
                    fromLat = fromResults.get(0).getLat();
                    fromLng = fromResults.get(0).getLng();
                }
            }
        }
        if (toLat == 0 && toLng == 0 && ride.getToCity() != null && !ride.getToCity().isBlank()) {
            Optional<double[]> toOpt = CityCenterCoordinates.getLatLng(ride.getToCity());
            if (toOpt.isPresent()) {
                double[] t = toOpt.get();
                toLat = t[0]; toLng = t[1];
            } else {
                List<GeocodingResultDto> toResults = geocodeService.search(ride.getToCity() + ", Bulgaria");
                if (!toResults.isEmpty()) {
                    toLat = toResults.get(0).getLat();
                    toLng = toResults.get(0).getLng();
                }
            }
        }
        if ((fromLat != 0 || fromLng != 0) && (toLat != 0 || toLng != 0)) {
            RouteDto route = routeService.getDrivingRoute(fromLat, fromLng, toLat, toLng);
            if (!route.getCoordinates().isEmpty()) return route.getCoordinates();
            return List.of(new double[]{fromLat, fromLng}, new double[]{toLat, toLng});
        }
        return List.of();
    }

    /** Called when creating a ride or from RideRouteEnhancerService; computes and persists route + START/END stops. */
    public void ensureRouteAndStopsForRide(Long rideId) {
        RideEntity ride = rideRepository.findById(rideId).orElse(null);
        if (ride != null) ensureRouteAndStops(ride);
    }

    /**
     * Returns route and stops. If ride has no persisted coordinates but has fromCity/toCity,
     * geocodes and computes route in-memory only (no DB write) to avoid read-only connection errors.
     */
    @Transactional(readOnly = true)
    public RideRouteDto getRouteWithStops(Long rideId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        List<double[]> coords = getPolylineForRide(ride);
        List<RideStopDto> allStops = rideStopRepository.findByRide_IdOrderByStopOrderAsc(rideId).stream()
                .map(RideStopMapper::toDto)
                .collect(Collectors.toList());
        // Показваме само активни pickup/dropoff точки (PENDING/APPROVED), за да изчезват след отмяна.
        java.util.Set<Long> activeStopIds = bookingService.getBookingsForRide(rideId).stream()
                .filter(b -> b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING_PAYMENT
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.APPROVED)
                .flatMap(b -> java.util.stream.Stream.of(b.getPickupStopId(), b.getDropoffStopId()))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        List<RideStopDto> stops = allStops.stream()
                .filter(s -> s.getType() == StopType.START
                        || s.getType() == StopType.END
                        || activeStopIds.contains(s.getId()))
                .collect(Collectors.toList());

        // Ако липсват координати, допълваме с център на града за известни градове.
        double fromLat = ride.getFromLat() != null ? ride.getFromLat() : 0;
        double fromLng = ride.getFromLng() != null ? ride.getFromLng() : 0;
        double toLat = ride.getToLat() != null ? ride.getToLat() : 0;
        double toLng = ride.getToLng() != null ? ride.getToLng() : 0;

        if ((fromLat == 0 && fromLng == 0) && ride.getFromCity() != null && !ride.getFromCity().isBlank()) {
            Optional<double[]> fromOpt = CityCenterCoordinates.getLatLng(ride.getFromCity());
            if (fromOpt.isPresent()) {
                double[] f = fromOpt.get();
                fromLat = f[0];
                fromLng = f[1];
            } else {
                List<GeocodingResultDto> fromResults = geocodeService.search(ride.getFromCity() + ", Bulgaria");
                if (!fromResults.isEmpty()) {
                    fromLat = fromResults.get(0).getLat();
                    fromLng = fromResults.get(0).getLng();
                }
            }
        }
        if ((toLat == 0 && toLng == 0) && ride.getToCity() != null && !ride.getToCity().isBlank()) {
            Optional<double[]> toOpt = CityCenterCoordinates.getLatLng(ride.getToCity());
            if (toOpt.isPresent()) {
                double[] t = toOpt.get();
                toLat = t[0];
                toLng = t[1];
            } else {
                List<GeocodingResultDto> toResults = geocodeService.search(ride.getToCity() + ", Bulgaria");
                if (!toResults.isEmpty()) {
                    toLat = toResults.get(0).getLat();
                    toLng = toResults.get(0).getLng();
                }
            }
        }

        boolean hasStartEnd = (fromLat != 0 || fromLng != 0) && (toLat != 0 || toLng != 0);
        if (hasStartEnd && coords.isEmpty()) {
            coords = List.of(new double[]{fromLat, fromLng}, new double[]{toLat, toLng});
        }
        if (hasStartEnd && coords.size() >= 2) {
            RouteDto route = routeService.getDrivingRoute(fromLat, fromLng, toLat, toLng);
            if (!route.getCoordinates().isEmpty()) {
                coords = route.getCoordinates();
            }
            boolean hasStops = stops.stream().anyMatch(s -> s.getType() == StopType.START || s.getType() == StopType.END);
            if (!hasStops) {
                stops = List.of(
                        RideStopDto.builder().id(null).rideId(rideId).name(ride.getFromCity())
                                .latitude(fromLat).longitude(fromLng).stopOrder(0).type(StopType.START).build(),
                        RideStopDto.builder().id(null).rideId(rideId).name(ride.getToCity())
                                .latitude(toLat).longitude(toLng).stopOrder(1000).type(StopType.END).build());
            }
        }

        return RideRouteDto.builder().coordinates(coords).stops(stops).build();
    }

    @Transactional(readOnly = true)
    public List<RideStopDto> getStops(Long rideId) {
        rideRepository.findById(rideId).orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        return rideStopRepository.findByRide_IdOrderByStopOrderAsc(rideId).stream()
                .map(RideStopMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Validates a single point (pickup or dropoff) against the route: within maxDetour.
     * Returns suggested point (projection onto route) if too far. Used for Uber-style instant feedback.
     */
    @Transactional(readOnly = true)
    public ValidatePointResponse validatePoint(Long rideId, ValidatePointRequest request) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        List<double[]> polyline = getPolylineForRide(ride);
        if (polyline.isEmpty() && ride.getFromLat() != null && ride.getToLat() != null) {
            polyline = List.of(
                    new double[]{ride.getFromLat(), ride.getFromLng()},
                    new double[]{ride.getToLat(), ride.getToLng()});
        }
        if (polyline.isEmpty()) {
            return ValidatePointResponse.builder().valid(true).message(null).build();
        }
        double maxDetourKm = ride.getMaxDetourKm() != null ? ride.getMaxDetourKm() : DEFAULT_MAX_DETOUR_KM;
        double lat = request.getLat();
        double lng = request.getLng();
        double distKm = routeGeometryService.distanceFromPointToRoute(lat, lng, polyline);
        if (distKm <= maxDetourKm) {
            double[] suggested = routeGeometryService.nearestPointOnRoute(lat, lng, polyline);
            return ValidatePointResponse.builder()
                    .valid(true)
                    .suggestedLat(suggested[0])
                    .suggestedLng(suggested[1])
                    .build();
        }
        double[] suggested = routeGeometryService.nearestPointOnRoute(lat, lng, polyline);
        String typeLabel = "DROPOFF".equalsIgnoreCase(request.getType()) ? "слизане" : "качване";
        return ValidatePointResponse.builder()
                .valid(false)
                .suggestedLat(suggested[0])
                .suggestedLng(suggested[1])
                .message("Мястото за " + typeLabel + " е твърде далеч от маршрута (макс. " + maxDetourKm + " км). Използвайте предложената точка.")
                .build();
    }

    /**
     * Validates pickup/dropoff points against the route: within maxDetour, pickup before dropoff, segment capacity.
     */
    @Transactional(readOnly = true)
    public ValidatePointsResponse validatePoints(Long rideId, ValidatePointsRequest request) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        List<double[]> polyline = getPolylineForRideForValidation(ride);
        double maxDetourKm = ride.getMaxDetourKm() != null ? ride.getMaxDetourKm() : DEFAULT_MAX_DETOUR_KM;
        int seatsRequested = request.getSeatsRequested() != null && request.getSeatsRequested() > 0
                ? request.getSeatsRequested() : 1;

        double[] pickup = new double[]{request.getPickupLat(), request.getPickupLng()};
        double[] dropoff = new double[]{request.getDropoffLat(), request.getDropoffLng()};

        double distPickup = routeGeometryService.distanceFromPointToRoute(pickup[0], pickup[1], polyline);
        if (distPickup > maxDetourKm) {
            return ValidatePointsResponse.builder()
                    .valid(false)
                    .message("Мястото за качване е твърде далеч от маршрута (макс. " + maxDetourKm + " км).")
                    .build();
        }
        double distDropoff = routeGeometryService.distanceFromPointToRoute(dropoff[0], dropoff[1], polyline);
        if (distDropoff > maxDetourKm) {
            return ValidatePointsResponse.builder()
                    .valid(false)
                    .message("Мястото за слизане е твърде далеч от маршрута (макс. " + maxDetourKm + " км).")
                    .build();
        }

        // Показваме реално избраните точки; не ги "snap"-ваме към линията.
        double[] suggestedPickup = new double[]{pickup[0], pickup[1]};
        double[] suggestedDropoff = new double[]{dropoff[0], dropoff[1]};
        double orderPickup = 0;
        double orderDropoff = 1;
        if (polyline.size() >= 2) {
            orderPickup = routeGeometryService.orderAlongRoute(pickup[0], pickup[1], polyline);
            orderDropoff = routeGeometryService.orderAlongRoute(dropoff[0], dropoff[1], polyline);
            if (orderPickup >= orderDropoff - 0.05) {
                return ValidatePointsResponse.builder()
                        .valid(false)
                        .suggestedPickupLat(suggestedPickup[0])
                        .suggestedPickupLng(suggestedPickup[1])
                        .suggestedDropoffLat(suggestedDropoff[0])
                        .suggestedDropoffLng(suggestedDropoff[1])
                        .message("Мястото за качване трябва да е преди мястото за слизане по маршрута.")
                        .build();
            }
        }

        Integer totalSeatsVal = ride.getTotalSeats() != null ? ride.getTotalSeats() : ride.getAvailableSeats();
        int totalSeats = totalSeatsVal != null ? totalSeatsVal : 10;
        List<SegmentOrder> segmentOrders = buildSegmentOrdersWithCandidates(rideId, orderPickup, orderDropoff,
                suggestedPickup, suggestedDropoff);
        for (SegmentOrder seg : segmentOrders) {
            int occupancy = segmentOccupancy(rideId, seg.startOrder, seg.endOrder);
            if (occupancy + seatsRequested > totalSeats) {
                return ValidatePointsResponse.builder()
                        .valid(false)
                        .suggestedPickupLat(suggestedPickup[0])
                        .suggestedPickupLng(suggestedPickup[1])
                        .suggestedDropoffLat(suggestedDropoff[0])
                        .suggestedDropoffLng(suggestedDropoff[1])
                        .message("Няма достатъчно свободни места за този сегмент от маршрута.")
                        .build();
            }
        }

        return ValidatePointsResponse.builder()
                .valid(true)
                .suggestedPickupLat(suggestedPickup[0])
                .suggestedPickupLng(suggestedPickup[1])
                .suggestedDropoffLat(suggestedDropoff[0])
                .suggestedDropoffLng(suggestedDropoff[1])
                .build();
    }

    /**
     * Book a ride with pickup/dropoff points. Validates, creates PICKUP/DROPOFF stops, then creates booking.
     * Uses REQUIRES_NEW so writes always run in a dedicated read-write transaction (avoids read-only connection errors).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = false)
    public BookingDto bookRide(Long rideId, Long passengerId, BookRideRequest request) {
        ValidatePointsRequest validateRequest = new ValidatePointsRequest(
                request.getPickupLat(), request.getPickupLng(),
                request.getDropoffLat(), request.getDropoffLng(),
                request.getSeatsReserved() != null ? request.getSeatsReserved() : 1);
        ValidatePointsResponse validation = validatePoints(rideId, validateRequest);
        if (!validation.isValid()) {
            throw new IllegalArgumentException(validation.getMessage() != null ? validation.getMessage() : "Invalid pickup/dropoff");
        }
        int seatsReserved = request.getSeatsReserved() != null && request.getSeatsReserved() > 0
                ? request.getSeatsReserved() : 1;
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        List<double[]> polyline = getPolylineForRide(ride);
        double orderPickup = routeGeometryService.orderAlongRoute(request.getPickupLat(), request.getPickupLng(), polyline);
        double orderDropoff = routeGeometryService.orderAlongRoute(request.getDropoffLat(), request.getDropoffLng(), polyline);
        int stopOrderPickup = (int) Math.min(999, Math.max(1, Math.round(orderPickup * 10)));
        int stopOrderDropoff = (int) Math.min(999, Math.max(1, Math.round(orderDropoff * 10)));
        if (stopOrderPickup >= stopOrderDropoff) stopOrderDropoff = stopOrderPickup + 1;
        RideStopEntity pickupStop = RideStopEntity.builder()
                .ride(ride).name("Качване").latitude(request.getPickupLat()).longitude(request.getPickupLng())
                .stopOrder(stopOrderPickup).type(StopType.PICKUP).build();
        RideStopEntity dropoffStop = RideStopEntity.builder()
                .ride(ride).name("Слизане").latitude(request.getDropoffLat()).longitude(request.getDropoffLng())
                .stopOrder(stopOrderDropoff).type(StopType.DROPOFF).build();
        pickupStop = rideStopRepository.save(pickupStop);
        dropoffStop = rideStopRepository.save(dropoffStop);
        PaymentMethod paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : PaymentMethod.CASH;
        return bookingService.createWithStops(
                rideId, passengerId, pickupStop.getId(), dropoffStop.getId(), seatsReserved, paymentMethod,
                request.getPickupLat(), request.getPickupLng());
    }

    private static class SegmentOrder {
        final double startOrder;
        final double endOrder;
        SegmentOrder(double startOrder, double endOrder) { this.startOrder = startOrder; this.endOrder = endOrder; }
    }

    private List<SegmentOrder> buildSegmentOrdersWithCandidates(Long rideId, double orderPickup, double orderDropoff,
                                                                 double[] suggestedPickup, double[] suggestedDropoff) {
        List<RideStopEntity> stops = rideStopRepository.findByRide_IdOrderByStopOrderAsc(rideId);
        List<SegmentOrder> segments = new ArrayList<>();
        List<Double> orders = new ArrayList<>();
        for (RideStopEntity s : stops) {
            orders.add((double) s.getStopOrder());
        }
        orders.add(orderPickup);
        orders.add(orderDropoff);
        orders.sort(Double::compareTo);
        int idxPickup = orders.indexOf(orderPickup);
        int idxDropoff = orders.indexOf(orderDropoff);
        if (idxPickup >= 0 && idxDropoff > idxPickup) {
            segments.add(new SegmentOrder(orderPickup, orderDropoff));
        }
        return segments;
    }

    private int segmentOccupancy(Long rideId, double segmentStartOrder, double segmentEndOrder) {
        List<BookingDto> bookings = bookingService.getBookingsForRide(rideId).stream()
                .filter(b -> b.getStatus() == com.example.carpool.booking.BookingStatus.APPROVED
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING
                        || b.getStatus() == com.example.carpool.booking.BookingStatus.PENDING_PAYMENT)
                .collect(Collectors.toList());
        List<RideStopEntity> stops = rideStopRepository.findByRide_IdOrderByStopOrderAsc(rideId);
        java.util.Map<Long, Integer> stopOrderMap = new java.util.HashMap<>();
        for (RideStopEntity s : stops) {
            stopOrderMap.put(s.getId(), s.getStopOrder());
        }
        int occupancy = 0;
        for (BookingDto b : bookings) {
            Integer pickOrder = b.getPickupStopId() != null ? stopOrderMap.get(b.getPickupStopId()) : null;
            Integer dropOrder = b.getDropoffStopId() != null ? stopOrderMap.get(b.getDropoffStopId()) : null;
            int seats = b.getSeatsReserved() != null ? b.getSeatsReserved() : 1;
            if (pickOrder == null || dropOrder == null) {
                occupancy += seats;
                continue;
            }
            if (pickOrder < segmentEndOrder && dropOrder > segmentStartOrder) {
                occupancy += seats;
            }
        }
        return occupancy;
    }
}

