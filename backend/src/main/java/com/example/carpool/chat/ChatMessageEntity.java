package com.example.carpool.chat;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.user.UserEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ride_id")
    private RideEntity ride;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sender_id")
    private UserEntity sender;

    @ManyToOne(optional = false)
    @JoinColumn(name = "receiver_id")
    private UserEntity receiver;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(nullable = false)
    private LocalDateTime sentAt;
}

