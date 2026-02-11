CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    rating_average DECIMAL(2,1)
);

CREATE TABLE rides (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    driver_id BIGINT NOT NULL,
    from_city VARCHAR(255) NOT NULL,
    to_city VARCHAR(255) NOT NULL,
    departure_time DATETIME NOT NULL,
    available_seats INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    car_details VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    CONSTRAINT fk_rides_driver FOREIGN KEY (driver_id) REFERENCES users (id)
);

CREATE INDEX idx_rides_from_to_time ON rides (from_city, to_city, departure_time);

