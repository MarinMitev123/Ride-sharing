package com.example.carpool.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    // За реален проект държи се в конфигурация/secret manager; тук е simplen base64 key
    private static final String SECRET_KEY = "c3ByaW5nLWNhcnBvb2wtand0LXNlY3JldC1rZXktMTIzNDU2";

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private static final long EXPIRY_24H = 1000L * 60 * 60 * 24;
    private static final long EXPIRY_7_DAYS = 1000L * 60 * 60 * 24 * 7;

    public String generateToken(UserDetails userDetails) {
        return generateToken(Map.of(), userDetails, false);
    }

    public String generateToken(UserDetails userDetails, boolean rememberMe) {
        return generateToken(Map.of(), userDetails, rememberMe);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return generateToken(extraClaims, userDetails, false);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails, boolean rememberMe) {
        long now = System.currentTimeMillis();
        long expiryMs = Boolean.TRUE.equals(rememberMe) ? EXPIRY_7_DAYS : EXPIRY_24H;
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expiryMs))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}

