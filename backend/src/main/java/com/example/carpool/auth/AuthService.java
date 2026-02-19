package com.example.carpool.auth;

import com.example.carpool.security.JwtService;
import com.example.carpool.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new IllegalArgumentException("Email is already in use");
        }

        UserRole role = request.role() != null ? request.role() : UserRole.ROLE_PASSENGER;

        UserEntity user = UserEntity.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .name(request.name())
                .phone(request.phone())
                .role(role)
                .status(UserStatus.ACTIVE)
                .build();

        UserEntity saved = userRepository.save(user);

        UserDetails springUser = org.springframework.security.core.userdetails.User
                .withUsername(saved.getEmail())
                .password(saved.getPasswordHash())
                .authorities(saved.getRole().name())
                .build();

        String token = jwtService.generateToken(springUser);
        return new AuthResponse(token, UserMapper.toDto(saved));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),
                        request.password()
                )
        );

        UserDetails principal = (UserDetails) auth.getPrincipal();
        UserEntity user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtService.generateToken(principal);
        return new AuthResponse(token, UserMapper.toDto(user));
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(String email, String baseUrl) {
        if (userRepository.findByEmail(email).isEmpty()) {
            return new ForgotPasswordResponse("If this email is registered, you will receive a reset link.", null);
        }
        UserEntity user = userRepository.findByEmail(email).orElseThrow();
        String resetToken = generateResetToken();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
        userRepository.save(user);
        String resetLink = baseUrl + "/reset-password?token=" + resetToken;
        return new ForgotPasswordResponse("If this email is registered, you will receive a reset link.", resetLink);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        UserEntity user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(Instant.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    private static String generateResetToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}

