package com.example.carpool.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    List<MessageEntity> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);

    long countByConversation_IdAndSender_IdNot(Long conversationId, Long senderId);

    long countByConversation_IdAndSender_IdNotAndCreatedAtAfter(
            Long conversationId, Long senderId, LocalDateTime createdAt);
}
