CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    recipient_user_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    booking_id BIGINT NULL,
    ride_id BIGINT NULL,
    is_read BIT(1) NOT NULL DEFAULT b'0',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_recipient_user FOREIGN KEY (recipient_user_id) REFERENCES users (id),
    CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings (id),
    CONSTRAINT fk_notifications_ride FOREIGN KEY (ride_id) REFERENCES rides (id)
);

CREATE INDEX idx_notifications_recipient_created_at ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications (recipient_user_id, is_read);
