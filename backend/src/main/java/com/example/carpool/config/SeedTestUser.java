package com.example.carpool.config;

import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import com.example.carpool.user.UserRole;
import com.example.carpool.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * При стартиране създава тестов потребител, ако няма такъв.
 * Имейл: test@example.com, парола: password123
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeedTestUser implements CommandLineRunner {

    private static final String TEST_EMAIL = "test@example.com";
    private static final String TEST_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(TEST_EMAIL).isPresent()) {
            return;
        }
        UserEntity user = UserEntity.builder()
                .email(TEST_EMAIL)
                .passwordHash(passwordEncoder.encode(TEST_PASSWORD))
                .name("Тестов потребител")
                .phone(null)
                .role(UserRole.ROLE_PASSENGER)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(user);
        log.info("Създаден тестов потребител: {} / {}", TEST_EMAIL, TEST_PASSWORD);
    }
}
