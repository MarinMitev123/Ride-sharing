package com.example.carpool.ride;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RideRepository extends JpaRepository<RideEntity, Long> {
}

