package com.example.carpool.auth;

import com.example.carpool.user.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private com.example.carpool.security.JwtService jwtService;
    @Mock
    private org.springframework.security.authentication.AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("encoded");
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("test@example.com", "password1", "Test User", null, null);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(UserEntity.builder().id(1L).email("test@example.com").passwordHash("x").name("x").role(UserRole.ROLE_PASSENGER).status(UserStatus.ACTIVE).build()));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already in use");
    }

    @Test
    void register_savesUserWhenEmailIsNew() {
        RegisterRequest request = new RegisterRequest("new@example.com", "password1", "New User", null, null);
        when(userRepository.findByEmail("new@example.com")).thenReturn(Optional.empty());
        UserEntity saved = UserEntity.builder()
                .id(1L)
                .email("new@example.com")
                .passwordHash("encoded")
                .name("New User")
                .phone(null)
                .role(UserRole.ROLE_PASSENGER)
                .status(UserStatus.ACTIVE)
                .ratingAverage(null)
                .build();
        when(userRepository.save(any(UserEntity.class))).thenReturn(saved);
        when(jwtService.generateToken(any())).thenReturn("jwt-token");

        authService.register(request);

        verify(userRepository).save(any(UserEntity.class));
    }
}
