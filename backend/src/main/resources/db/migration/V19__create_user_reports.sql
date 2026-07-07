CREATE TABLE user_reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reporter_id BIGINT NOT NULL,
    reported_user_id BIGINT NOT NULL,
    ride_id BIGINT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    justification VARCHAR(1000) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    admin_note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    CONSTRAINT fk_user_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id),
    CONSTRAINT fk_user_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users (id),
    CONSTRAINT fk_user_reports_ride FOREIGN KEY (ride_id) REFERENCES rides (id),
    CONSTRAINT uq_user_reports_reporter_reported_ride UNIQUE (reporter_id, reported_user_id, ride_id)
);

CREATE INDEX idx_user_reports_status_created ON user_reports (status, created_at DESC);
CREATE INDEX idx_user_reports_reported_user ON user_reports (reported_user_id, status);
