package com.example.carpool.auth;

import com.example.carpool.security.JwtService;
import com.example.carpool.user.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String FORGOT_PASSWORD_GENERIC_MESSAGE =
            "Ако съществува акаунт с този имейл, ще получите инструкции за възстановяване.";
    private static final String RESET_PASSWORD_SUCCESS_MESSAGE =
            "Паролата беше променена успешно.";
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

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
    public ForgotPasswordResponse forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            passwordResetTokenRepository.findByUser_IdAndUsedFalse(user.getId())
                    .forEach(existing -> existing.setUsed(true));
            String resetToken = generateResetToken();
            PasswordResetTokenEntity tokenEntity = PasswordResetTokenEntity.builder()
                    .user(user)
                    .token(resetToken)
                    .expiresAt(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES))
                    .used(false)
                    .createdAt(LocalDateTime.now())
                    .build();
            passwordResetTokenRepository.save(tokenEntity);
            String resetLink = "http://localhost:5173/reset-password?token=" + resetToken;
            log.info("Password reset link: {}", resetLink);
        });
        return new ForgotPasswordResponse(FORGOT_PASSWORD_GENERIC_MESSAGE);
    }

    @Transactional
    public AuthMessageResponse resetPassword(String token, String newPassword, String confirmPassword) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        if (newPassword == null || !newPassword.equals(confirmPassword)) {
            throw new IllegalArgumentException("Паролите не съвпадат");
        }
        if (!isPasswordStrong(newPassword)) {
            throw new IllegalArgumentException("Паролата трябва да е поне 8 символа и да съдържа главна, малка буква и цифра");
        }
        PasswordResetTokenEntity resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));
        if (resetToken.isUsed() || resetToken.getExpiresAt() == null || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }
        UserEntity user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        resetToken.setUsed(true);
        userRepository.save(user);
        passwordResetTokenRepository.save(resetToken);
        return new AuthMessageResponse(RESET_PASSWORD_SUCCESS_MESSAGE);
    }

    private static String generateResetToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static boolean isPasswordStrong(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasUpper = password.chars().anyMatch(Character::isUpperCase);
        boolean hasLower = password.chars().anyMatch(Character::isLowerCase);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        return hasUpper && hasLower && hasDigit;
    }
}

