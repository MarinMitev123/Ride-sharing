package com.example.carpool.rating;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RatingDto {
    Long id;
    Long fromUserId;
    String fromUserName;
    Long toUserId;
    String toUserName;
    Long rideId;
    Integer score;
    String comment;
}
