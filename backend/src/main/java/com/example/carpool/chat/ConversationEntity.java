package com.example.carpool.chat;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "conversations",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_conversations_ride_driver_passenger", columnNames = {"ride_id", "driver_id", "passenger_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationEntity {

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
    @JoinColumn(name = "passenger_id")
    private UserEntity passenger;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
