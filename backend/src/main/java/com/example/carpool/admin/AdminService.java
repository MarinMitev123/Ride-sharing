package com.example.carpool.admin;

import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import com.example.carpool.user.UserStatus;
import com.example.carpool.user.UserMapper;
import com.example.carpool.user.UserDto;
import com.example.carpool.ride.RideRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RideRepository rideRepository;

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto blockUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setStatus(UserStatus.BLOCKED);
        userRepository.save(user);
        return UserMapper.toDto(user);
    }

    @Transactional
    public UserDto unblockUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        return UserMapper.toDto(user);
    }

    @Transactional(readOnly = true)
    public AdminStatsDto getStats() {
        long usersCount = userRepository.count();
        long ridesCount = rideRepository.count();
        return new AdminStatsDto(usersCount, ridesCount);
    }
}
