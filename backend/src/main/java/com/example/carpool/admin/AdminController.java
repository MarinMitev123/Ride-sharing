package com.example.carpool.admin;

import com.example.carpool.report.ReportStatus;
import com.example.carpool.report.UpdateReportRequest;
import com.example.carpool.report.UserReportDto;
import com.example.carpool.user.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<UserDto> blockUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.blockUser(id));
    }

    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<UserDto> unblockUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.unblockUser(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getStats());
    }

    @GetMapping("/reports")
    public ResponseEntity<List<UserReportDto>> getReports(
            @RequestParam(required = false) ReportStatus status) {
        return ResponseEntity.ok(adminService.getReports(status));
    }

    @PatchMapping("/reports/{id}")
    public ResponseEntity<UserReportDto> updateReport(@PathVariable Long id,
                                                    @Valid @RequestBody UpdateReportRequest request) {
        return ResponseEntity.ok(adminService.updateReport(id, request));
    }

    @PostMapping("/reports/{id}/block-user")
    public ResponseEntity<UserReportDto> blockUserFromReport(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.blockUserFromReport(id));
    }
}
