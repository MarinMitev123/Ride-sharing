CREATE TABLE bookings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT NOT NULL,
    passenger_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    CONSTRAINT fk_bookings_ride FOREIGN KEY (ride_id) REFERENCES rides (id),
    CONSTRAINT fk_bookings_passenger FOREIGN KEY (passenger_id) REFERENCES users (id)
);

CREATE INDEX idx_bookings_passenger ON bookings (passenger_id);

CREATE TABLE ratings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    ride_id BIGINT NOT NULL,
    score INT NOT NULL,
    comment VARCHAR(1000),
    CONSTRAINT fk_ratings_from_user FOREIGN KEY (from_user_id) REFERENCES users (id),
    CONSTRAINT fk_ratings_to_user FOREIGN KEY (to_user_id) REFERENCES users (id),
    CONSTRAINT fk_ratings_ride FOREIGN KEY (ride_id) REFERENCES rides (id)
);

CREATE INDEX idx_ratings_to_user ON ratings (to_user_id);

CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content VARCHAR(1000) NOT NULL,
    sent_at DATETIME NOT NULL,
    CONSTRAINT fk_chat_ride FOREIGN KEY (ride_id) REFERENCES rides (id),
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_chat_receiver FOREIGN KEY (receiver_id) REFERENCES users (id)
);

CREATE INDEX idx_chat_ride ON chat_messages (ride_id);

