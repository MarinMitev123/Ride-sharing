package com.example.carpool.ride;

import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public RideDto getRideById(Long id) {
        return rideRepository.findById(id)
                .map(RideMapper::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
    }
}

