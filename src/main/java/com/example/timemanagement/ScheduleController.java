
package com.example.timemanagement;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final ScheduleRepository scheduleRepository;

    public ScheduleController(ScheduleRepository scheduleRepository) {
        this.scheduleRepository = scheduleRepository;
    }

    private String getLoggedInEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return authentication.getName();
    }

    @GetMapping
    public List<Schedule> getAllSchedules(Authentication authentication) {
        String email = getLoggedInEmail(authentication);
        return scheduleRepository.findByOwnerEmail(email);
    }

    @PostMapping
    public Schedule addSchedule(
            @RequestBody Schedule schedule,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        schedule.setId(null);
        schedule.setOwnerEmail(email);

        return scheduleRepository.save(schedule);
    }

    @DeleteMapping("/{id}")
    public void deleteSchedule(
            @PathVariable Long id,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        Schedule schedule = scheduleRepository
                .findByIdAndOwnerEmail(id, email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Schedule not found"));

        scheduleRepository.delete(schedule);
    }
}
