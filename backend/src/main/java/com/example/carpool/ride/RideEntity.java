package com.example.carpool.ride;

import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "driver_id")
    private UserEntity driver;

    @Column(nullable = false)
    private String fromCity;

    @Column(nullable = false)
    private String toCity;

    private Double fromLat;
    private Double fromLng;
    private Double toLat;
    private Double toLng;

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Column(nullable = false)
    private Integer availableSeats;

    @Column(nullable = false)
    private BigDecimal price;

    private String carDetails;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RideStatus status;
}

