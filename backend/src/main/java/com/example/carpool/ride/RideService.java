package com.example.carpool.ride;

import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    @Transactional
    public RideDto createRide(Long driverId, RideCreateRequest request) {
        UserEntity driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        RideEntity ride = RideMapper.fromCreateRequest(request, driver);
        RideEntity saved = rideRepository.save(ride);
        return RideMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<RideDto> getAllRides() {
        return rideRepository.findAll()
                .stream()
                .map(RideMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RideDto> searchRides(String fromCity, String toCity, LocalDate date) {
        Specification<RideEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (fromCity != null && !fromCity.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("fromCity")), fromCity.trim().toLowerCase()));
            }
            if (toCity != null && !toCity.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("toCity")), toCity.trim().toLowerCase()));
            }
            if (date != null) {
                LocalDateTime dayStart = date.atStartOfDay();
                LocalDateTime dayEnd = date.atTime(LocalTime.MAX);
                predicates.add(cb.between(root.get("departureTime"), dayStart, dayEnd));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return rideRepository.findAll(spec)
                .stream()
                .map(RideMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RideDto getRideById(Long id) {
        return rideRepository.findById(id)
                .map(RideMapper::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
    }
}

