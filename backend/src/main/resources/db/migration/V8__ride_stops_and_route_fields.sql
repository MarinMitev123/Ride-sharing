-- Ride: route polyline, max detour, total seats
ALTER TABLE rides ADD COLUMN route_polyline CLOB;
ALTER TABLE rides ADD COLUMN max_detour_km DOUBLE;
ALTER TABLE rides ADD COLUMN total_seats INT;
UPDATE rides SET total_seats = available_seats WHERE total_seats IS NULL;

-- Ride stops
CREATE TABLE ride_stops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ride_id BIGINT NOT NULL,
    name VARCHAR(255),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    stop_order INT NOT NULL,
    type VARCHAR(32) NOT NULL,
    CONSTRAINT fk_ride_stops_ride FOREIGN KEY (ride_id) REFERENCES rides (id) ON DELETE CASCADE
);
CREATE INDEX idx_ride_stops_ride_order ON ride_stops (ride_id, stop_order);

-- Booking: stops and seats
ALTER TABLE bookings ADD COLUMN pickup_stop_id BIGINT;
ALTER TABLE bookings ADD COLUMN dropoff_stop_id BIGINT;
ALTER TABLE bookings ADD COLUMN seats_reserved INT DEFAULT 1 NOT NULL;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_pickup_stop FOREIGN KEY (pickup_stop_id) REFERENCES ride_stops (id) ON DELETE SET NULL;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_dropoff_stop FOREIGN KEY (dropoff_stop_id) REFERENCES ride_stops (id) ON DELETE SET NULL;
