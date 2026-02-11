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
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ChatMessageDto> sendMessage(@AuthenticationPrincipal UserDetails userDetails,
                                                      @Valid @RequestBody ChatMessageCreateRequest request) {
        Long senderId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(chatService.sendMessage(
                request.rideId(), request.receiverId(), request.content(), senderId));
    }

    @GetMapping("/ride/{rideId}")
    public ResponseEntity<List<ChatMessageDto>> getMessagesForRide(@AuthenticationPrincipal UserDetails userDetails,
                                                                   @PathVariable Long rideId) {
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(chatService.getMessagesForRide(rideId, userId));
    }

    @GetMapping("/ride/{rideId}/with/{otherUserId}")
    public ResponseEntity<List<ChatMessageDto>> getConversation(@AuthenticationPrincipal UserDetails userDetails,
                                                                @PathVariable Long rideId,
                                                                @PathVariable Long otherUserId) {
        Long currentUserId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
        return ResponseEntity.ok(chatService.getConversation(rideId, otherUserId, currentUserId));
    }
}
