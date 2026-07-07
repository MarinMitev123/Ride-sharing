package com.example.carpool.config;

import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import com.example.carpool.user.UserRole;
import com.example.carpool.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * При стартиране създава демо администратор, ако няма такъв.
 * Имейл: admin@example.com, парола: password123
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SeedAdminUser implements CommandLineRunner {

    public static final String ADMIN_EMAIL = "admin@example.com";
    public static final String ADMIN_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail(ADMIN_EMAIL).isPresent()) {
            return;
        }
        UserEntity admin = UserEntity.builder()
                .email(ADMIN_EMAIL)
                .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                .name("Администратор")
                .phone(null)
                .role(UserRole.ROLE_ADMIN)
                .status(UserStatus.ACTIVE)
                .build();
        userRepository.save(admin);
        log.info("Създаден админ потребител: {} / {}", ADMIN_EMAIL, ADMIN_PASSWORD);
    }
}
