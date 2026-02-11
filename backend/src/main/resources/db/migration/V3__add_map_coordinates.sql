-- Ride: optional coordinates for from/to (for map display)
ALTER TABLE rides ADD COLUMN from_lat DOUBLE NULL;
ALTER TABLE rides ADD COLUMN from_lng DOUBLE NULL;
ALTER TABLE rides ADD COLUMN to_lat DOUBLE NULL;
ALTER TABLE rides ADD COLUMN to_lng DOUBLE NULL;

-- Booking: pickup point (passenger can set where to be picked up)
ALTER TABLE bookings ADD COLUMN pickup_lat DOUBLE NULL;
ALTER TABLE bookings ADD COLUMN pickup_lng DOUBLE NULL;
ALTER TABLE bookings ADD COLUMN pickup_address VARCHAR(500) NULL;
