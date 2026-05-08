package com.example.carpool.notification;

import com.example.carpool.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private Long currentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getMyNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        Long userId = currentUserId(userDetails);
        return ResponseEntity.ok(notificationService.getMyNotifications(userId));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markAsRead(@AuthenticationPrincipal UserDetails userDetails,
                                                      @PathVariable Long id) {
        Long userId = currentUserId(userDetails);
        return ResponseEntity.ok(notificationService.markAsRead(id, userId));
    }
}
