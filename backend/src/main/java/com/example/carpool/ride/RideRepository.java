package com.example.carpool.ride;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RideRepository extends JpaRepository<RideEntity, Long>, JpaSpecificationExecutor<RideEntity> {
}

