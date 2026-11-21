
package com.example.timemanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    List<Schedule> findByOwnerEmail(String ownerEmail);

    Optional<Schedule> findByIdAndOwnerEmail(Long id, String ownerEmail);
}
