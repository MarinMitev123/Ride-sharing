package com.example.carpool.report;

import com.example.carpool.user.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<UserReportDto> createReport(@AuthenticationPrincipal UserDetails userDetails,
                                                      @Valid @RequestBody CreateReportRequest request) {
        Long reporterId = currentUserId(userDetails);
        return ResponseEntity.ok(reportService.createReport(request, reporterId));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<UserReportDto>> getMyReports(@AuthenticationPrincipal UserDetails userDetails,
                                                            @RequestParam(required = false) Long rideId) {
        Long reporterId = currentUserId(userDetails);
        return ResponseEntity.ok(reportService.getMyReports(reporterId, rideId));
    }

    private Long currentUserId(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }
}
