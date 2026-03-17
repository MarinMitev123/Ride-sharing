package com.example.carpool.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory rate limit for auth endpoints: login and register.
 * Limits to 10 requests per minute per IP for POST /api/v1/auth/login and /api/v1/auth/register.
 */
@Component
@Order(-100)
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 10;
    private static final long WINDOW_MS = 60_000;

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<Long>> requestsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!"POST".equalsIgnoreCase(request.getMethod()) ||
                (!path.endsWith("/login") && !path.endsWith("/register"))) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        CopyOnWriteArrayList<Long> timestamps = requestsByIp.computeIfAbsent(ip, k -> new CopyOnWriteArrayList<>());
        long now = System.currentTimeMillis();
        timestamps.removeIf(t -> now - t >= WINDOW_MS);
        timestamps.add(now);
        if (timestamps.size() > MAX_REQUESTS_PER_MINUTE) {
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Твърде много опити. Опитайте след минута.\",\"code\":\"RATE_LIMITED\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String getClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
