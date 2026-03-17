package com.example.carpool.booking;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideStopEntity;
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

    @ManyToOne
    @JoinColumn(name = "pickup_stop_id")
    private RideStopEntity pickupStop;

    @ManyToOne
    @JoinColumn(name = "dropoff_stop_id")
    private RideStopEntity dropoffStop;

    @Column(name = "seats_reserved", nullable = false)
    private Integer seatsReserved = 1;

    private Double pickupLat;
    private Double pickupLng;
    @Column(length = 500)
    private String pickupAddress;
    @Column(length = 255)
    private String pickupNeighborhood;
    @Column(length = 1000)
    private String passengerNote;
}

