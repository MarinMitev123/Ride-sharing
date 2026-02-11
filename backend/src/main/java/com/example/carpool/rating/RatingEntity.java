package com.example.carpool.rating;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "from_user_id")
    private UserEntity fromUser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "to_user_id")
    private UserEntity toUser;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ride_id")
    private RideEntity ride;

    @Column(nullable = false)
    private int score;

    @Column(length = 1000)
    private String comment;
}

