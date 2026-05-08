CREATE TABLE driver_locations (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ride_id BIGINT NOT NULL,
    driver_id BIGINT NOT NULL,
    target_passenger_id BIGINT NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    is_active BIT(1) NOT NULL DEFAULT b'0',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_locations_ride FOREIGN KEY (ride_id) REFERENCES rides (id),
    CONSTRAINT fk_driver_locations_driver FOREIGN KEY (driver_id) REFERENCES users (id),
    CONSTRAINT fk_driver_locations_target_passenger FOREIGN KEY (target_passenger_id) REFERENCES users (id),
    CONSTRAINT uk_driver_locations_ride_driver_target UNIQUE (ride_id, driver_id, target_passenger_id)
);

CREATE INDEX idx_driver_locations_ride_active_updated ON driver_locations (ride_id, is_active, updated_at DESC);
