package com.example.carpool.chat;

import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<ConversationDto>> getConversations(@AuthenticationPrincipal UserDetails userDetails) {
        Long currentUserId = currentUserId(userDetails);
        return ResponseEntity.ok(conversationService.getConversations(currentUserId));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@AuthenticationPrincipal UserDetails userDetails,
                                                        @PathVariable Long id) {
        Long currentUserId = currentUserId(userDetails);
        return ResponseEntity.ok(conversationService.getMessages(id, currentUserId));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<MessageDto> sendMessage(@AuthenticationPrincipal UserDetails userDetails,
                                                  @PathVariable Long id,
                                                  @Valid @RequestBody MessageCreateRequest request) {
        Long currentUserId = currentUserId(userDetails);
        return ResponseEntity.ok(conversationService.sendMessage(id, currentUserId, request.content()));
    }

    private Long currentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }
}
