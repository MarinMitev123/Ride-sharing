package com.example.carpool.ride;

import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "driver_locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverLocationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ride_id")
    private RideEntity ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "driver_id")
    private UserEntity driver;

    @ManyToOne(optional = false)
    @JoinColumn(name = "target_passenger_id")
    private UserEntity targetPassenger;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
