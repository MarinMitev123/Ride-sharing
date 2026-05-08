CREATE TABLE password_reset_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BIT(1) NOT NULL DEFAULT b'0',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uk_password_reset_tokens_token UNIQUE (token)
);

CREATE INDEX idx_password_reset_tokens_user_used ON password_reset_tokens (user_id, used);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
