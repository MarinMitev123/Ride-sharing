package com.example.carpool.ride;

import com.example.carpool.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RideServiceTest {

    @Mock
    private RideRepository rideRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RideService rideService;

    @Test
    void getRideById_throwsWhenNotFound() {
        when(rideRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> rideService.getRideById(999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not found");
    }
}
