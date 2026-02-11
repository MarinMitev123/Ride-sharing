package com.example.carpool.rating;

public class RatingMapper {

    private RatingMapper() {
    }

    public static RatingDto toDto(RatingEntity entity) {
        if (entity == null) {
            return null;
        }
        Long fromUserId = entity.getFromUser() != null ? entity.getFromUser().getId() : null;
        String fromUserName = entity.getFromUser() != null ? entity.getFromUser().getName() : null;
        Long toUserId = entity.getToUser() != null ? entity.getToUser().getId() : null;
        String toUserName = entity.getToUser() != null ? entity.getToUser().getName() : null;
        Long rideId = entity.getRide() != null ? entity.getRide().getId() : null;
        return RatingDto.builder()
                .id(entity.getId())
                .fromUserId(fromUserId)
                .fromUserName(fromUserName)
                .toUserId(toUserId)
                .toUserName(toUserName)
                .rideId(rideId)
                .score(entity.getScore())
                .comment(entity.getComment())
                .build();
    }
}
