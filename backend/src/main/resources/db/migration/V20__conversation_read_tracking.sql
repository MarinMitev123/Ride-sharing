ALTER TABLE conversations
    ADD COLUMN driver_last_read_at DATETIME NULL,
    ADD COLUMN passenger_last_read_at DATETIME NULL;

-- Existing messages should not appear as unread when this feature is introduced.
UPDATE conversations
SET driver_last_read_at = NOW(),
    passenger_last_read_at = NOW();
