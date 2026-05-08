package com.example.carpool.notification;

import com.example.carpool.booking.BookingEntity;
import com.example.carpool.ride.RideEntity;
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
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional
    public NotificationDto create(Long recipientUserId,
                                  NotificationType type,
                                  String title,
                                  String message,
                                  BookingEntity booking,
                                  RideEntity ride) {
        UserEntity recipient = userRepository.findById(recipientUserId)
                .orElseThrow(() -> new IllegalArgumentException("Recipient user not found"));
        NotificationEntity saved = notificationRepository.save(NotificationEntity.builder()
                .recipientUser(recipient)
                .type(type)
                .title(title)
                .message(message)
                .booking(booking)
                .ride(ride)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build());
        return NotificationMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getMyNotifications(Long userId) {
        return notificationRepository.findByRecipientUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(NotificationMapper::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public NotificationDto markAsRead(Long notificationId, Long userId) {
        NotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (entity.getRecipientUser() == null || !entity.getRecipientUser().getId().equals(userId)) {
            throw new IllegalArgumentException("You do not have access to this notification");
        }
        if (!entity.isRead()) {
            entity.setRead(true);
            entity = notificationRepository.save(entity);
        }
        return NotificationMapper.toDto(entity);
    }
}
