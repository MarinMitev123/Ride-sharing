package com.example.carpool.user;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class UserDto {
    Long id;
    String email;
    String name;
    String phone;
    UserRole role;
    UserStatus status;
    BigDecimal ratingAverage;
}

