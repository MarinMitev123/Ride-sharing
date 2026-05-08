package com.example.carpool.chat;

import com.example.carpool.ride.RideEntity;
import com.example.carpool.ride.RideRepository;
import com.example.carpool.user.UserEntity;
import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final RideRepository rideRepository;
    private final UserRepository userRepository;

    @Transactional
    public void ensureConversationForBooking(Long rideId, Long driverId, Long passengerId) {
        conversationRepository.findByRide_IdAndDriver_IdAndPassenger_Id(rideId, driverId, passengerId)
                .orElseGet(() -> {
                    RideEntity ride = rideRepository.findById(rideId)
                            .orElseThrow(() -> new IllegalArgumentException("Ride not found"));
                    UserEntity driver = userRepository.findById(driverId)
                            .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
                    UserEntity passenger = userRepository.findById(passengerId)
                            .orElseThrow(() -> new IllegalArgumentException("Passenger not found"));
                    return conversationRepository.save(ConversationEntity.builder()
                            .ride(ride)
                            .driver(driver)
                            .passenger(passenger)
                            .createdAt(LocalDateTime.now())
                            .build());
                });
    }

    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(Long currentUserId) {
        return conversationRepository.findByDriver_IdOrPassenger_IdOrderByCreatedAtDesc(currentUserId, currentUserId)
                .stream()
                .map(c -> toConversationDto(c, currentUserId))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageDto> getMessages(Long conversationId, Long currentUserId) {
        ConversationEntity conversation = getOwnedConversation(conversationId, currentUserId);
        return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversation.getId())
                .stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageDto sendMessage(Long conversationId, Long currentUserId, String content) {
        ConversationEntity conversation = getOwnedConversation(conversationId, currentUserId);
        UserEntity sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        MessageEntity saved = messageRepository.save(MessageEntity.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .createdAt(LocalDateTime.now())
                .build());
        return toMessageDto(saved);
    }

    private ConversationEntity getOwnedConversation(Long conversationId, Long currentUserId) {
        ConversationEntity conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        boolean isParticipant = conversation.getDriver().getId().equals(currentUserId)
                || conversation.getPassenger().getId().equals(currentUserId);
        if (!isParticipant) {
            throw new IllegalArgumentException("You do not have access to this conversation");
        }
        return conversation;
    }

    private ConversationDto toConversationDto(ConversationEntity conversation, Long currentUserId) {
        UserEntity other = conversation.getDriver().getId().equals(currentUserId)
                ? conversation.getPassenger()
                : conversation.getDriver();

        String name = other.getName() != null ? other.getName().trim() : "";
        String[] parts = name.isBlank() ? new String[0] : name.split("\\s+", 2);
        String firstName = parts.length > 0 ? parts[0] : null;
        String lastName = parts.length > 1 ? parts[1] : null;

        return ConversationDto.builder()
                .id(conversation.getId())
                .createdAt(conversation.getCreatedAt())
                .otherUser(ConversationDto.OtherUserDto.builder()
                        .id(other.getId())
                        .firstName(firstName)
                        .lastName(lastName)
                        .username(other.getEmail())
                        .build())
                .ride(ConversationDto.RideSummaryDto.builder()
                        .id(conversation.getRide().getId())
                        .origin(conversation.getRide().getFromCity())
                        .destination(conversation.getRide().getToCity())
                        .departureTime(conversation.getRide().getDepartureTime())
                        .build())
                .build();
    }

    private MessageDto toMessageDto(MessageEntity m) {
        return MessageDto.builder()
                .id(m.getId())
                .conversationId(m.getConversation().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getName())
                .content(m.getContent())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
