package com.example.carpool.chat;

import com.example.carpool.booking.BookingRepository;
import com.example.carpool.booking.BookingStatus;
import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public ChatMessageDto sendMessage(Long rideId, Long receiverId, String content, Long senderId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        UserEntity sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        UserEntity receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));
        validateDirectChatPair(ride, senderId, receiverId);
        ChatMessageEntity message = ChatMessageEntity.builder()
                .ride(ride)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .sentAt(LocalDateTime.now())
                .build();
        ChatMessageEntity saved = chatMessageRepository.save(message);
        return ChatMessageMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessagesForRide(Long rideId, Long userId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        boolean isDriver = ride.getDriver() != null && ride.getDriver().getId().equals(userId);
        boolean isPassenger = bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                rideId, userId, Collections.singletonList(BookingStatus.APPROVED));
        if (!isDriver && !isPassenger) {
            throw new IllegalArgumentException("You are not part of this ride");
        }
        return chatMessageRepository.findByRide_IdOrderBySentAtAsc(rideId)
                .stream()
                .map(ChatMessageMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getConversation(Long rideId, Long otherUserId, Long currentUserId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
        userRepository.findById(otherUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        validateDirectChatPair(ride, currentUserId, otherUserId);
        return chatMessageRepository.findConversation(rideId, currentUserId, otherUserId)
                .stream()
                .map(ChatMessageMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Chat is strictly 1:1 between ride driver and one passenger.
     * Passenger-passenger chat for the same ride is not allowed.
     */
    private void validateDirectChatPair(RideEntity ride, Long userId1, Long userId2) {
        if (ride.getDriver() == null || ride.getDriver().getId() == null) {
            throw new IllegalArgumentException("Ride has no driver");
        }
        Long driverId = ride.getDriver().getId();
        boolean user1IsDriver = driverId.equals(userId1);
        boolean user2IsDriver = driverId.equals(userId2);
        if (user1IsDriver == user2IsDriver) {
            throw new IllegalArgumentException("Chat is allowed only between driver and a passenger");
        }

        Long passengerId = user1IsDriver ? userId2 : userId1;
        List<BookingStatus> allowedStatuses = List.of(BookingStatus.PENDING, BookingStatus.APPROVED);
        boolean isPassengerInRide = bookingRepository.existsByRide_IdAndPassenger_IdAndStatusIn(
                ride.getId(), passengerId, allowedStatuses
        );
        if (!isPassengerInRide) {
            throw new IllegalArgumentException("Passenger is not part of this ride");
        }
    }
}
