package com.example.carpool.booking;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ride_id")
    private RideEntity ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "passenger_id")
    private UserEntity passenger;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    private Double pickupLat;
    private Double pickupLng;
    @Column(length = 500)
    private String pickupAddress;
}

