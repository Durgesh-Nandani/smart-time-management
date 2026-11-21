
package com.example.timemanagement;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;

    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    private String getLoggedInEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return authentication.getName();
    }

    @GetMapping
    public List<Task> getAllTasks(Authentication authentication) {
        String email = getLoggedInEmail(authentication);
        return taskRepository.findByOwnerEmail(email);
    }

    @PostMapping
    public Task createTask(
            @RequestBody Task task,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        task.setId(null);
        task.setOwnerEmail(email);

        return taskRepository.save(task);
    }

    @GetMapping("/{id}")
    public Task getTaskById(
            @PathVariable Long id,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        return taskRepository.findByIdAndOwnerEmail(id, email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Task not found"));
    }

    @PutMapping("/{id}")
    public Task updateTask(
            @PathVariable Long id,
            @RequestBody Task updatedTask,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        Task task = taskRepository.findByIdAndOwnerEmail(id, email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Task not found"));

        task.setTitle(updatedTask.getTitle());
        task.setDescription(updatedTask.getDescription());
        task.setDueDate(updatedTask.getDueDate());
        task.setPriority(updatedTask.getPriority());
        task.setStatus(updatedTask.getStatus());
        task.setCompleted(updatedTask.isCompleted());

        return taskRepository.save(task);
    }

    @DeleteMapping("/{id}")
    public String deleteTask(
            @PathVariable Long id,
            Authentication authentication) {

        String email = getLoggedInEmail(authentication);

        Task task = taskRepository.findByIdAndOwnerEmail(id, email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND, "Task not found"));

        taskRepository.delete(task);

        return "Task deleted successfully";
    }
}
