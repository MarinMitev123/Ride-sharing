CREATE TABLE IF NOT EXISTS conversations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    passenger_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversations_ride FOREIGN KEY (ride_id) REFERENCES rides (id),
    CONSTRAINT fk_conversations_driver FOREIGN KEY (driver_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_passenger FOREIGN KEY (passenger_id) REFERENCES users (id),
    CONSTRAINT uk_conversations_ride_driver_passenger UNIQUE (ride_id, driver_id, passenger_id)
);

CREATE INDEX idx_conversations_driver ON conversations (driver_id);
CREATE INDEX idx_conversations_passenger ON conversations (passenger_id);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    content VARCHAR(1000) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conversation_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id),
    CONSTRAINT fk_conversation_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id)
);

CREATE INDEX idx_conversation_messages_conversation ON conversation_messages (conversation_id);
CREATE INDEX idx_conversation_messages_created_at ON conversation_messages (created_at);
