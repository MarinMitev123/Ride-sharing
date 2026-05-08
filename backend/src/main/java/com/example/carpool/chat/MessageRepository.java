package com.example.carpool.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<MessageEntity, Long> {
    List<MessageEntity> findByConversation_IdOrderByCreatedAtAsc(Long conversationId);
}
