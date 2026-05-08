package com.example.carpool.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {
    List<NotificationEntity> findByRecipientUser_IdOrderByCreatedAtDesc(Long recipientUserId);
}
