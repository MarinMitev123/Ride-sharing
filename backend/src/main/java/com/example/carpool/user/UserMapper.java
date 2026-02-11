package com.example.carpool.user;

public class UserMapper {

    private UserMapper() {
    }

    public static UserDto toDto(UserEntity entity) {
        if (entity == null) {
            return null;
        }
        return UserDto.builder()
                .id(entity.getId())
                .email(entity.getEmail())
                .name(entity.getName())
                .phone(entity.getPhone())
                .role(entity.getRole())
                .status(entity.getStatus())
                .ratingAverage(entity.getRatingAverage())
                .build();
    }
}

