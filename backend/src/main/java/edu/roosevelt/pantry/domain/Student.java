package edu.roosevelt.pantry.domain;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Represents a registered student and tracks their weekly pantry allowance.
 */
public class Student {

    private String studentId;
    private String name;
    private int itemsTakenThisWeek;
    private LocalDate weekStartDate;

    public Student(String studentId, String name) {
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID cannot be blank.");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Student name cannot be blank.");
        }
        this.studentId = studentId.trim();
        this.name = name.trim();
        this.itemsTakenThisWeek = 0;
        this.weekStartDate = calculateMonday(LocalDate.now());
    }

    private LocalDate calculateMonday(LocalDate date) {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    public String getStudentId() {
        return studentId;
    }

    public String getName() {
        return name;
    }

    public int getItemsTakenThisWeek() {
        return itemsTakenThisWeek;
    }

    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }

    /**
     * Resets weekly allowance only when weekStartDate differs from the Monday of the current week.
     */
    public void resetWeekIfNeeded(LocalDate today) {
        LocalDate currentMonday = calculateMonday(today);
        if (this.weekStartDate == null || !this.weekStartDate.equals(currentMonday)) {
            this.itemsTakenThisWeek = 0;
            this.weekStartDate = currentMonday;
        }
    }

    /**
     * Checks if the student can request the specified quantity within their 5-item weekly limit.
     */
    public boolean canRequestItems(int quantity, LocalDate today) {
        resetWeekIfNeeded(today);
        return quantity > 0 && quantity <= 5 - itemsTakenThisWeek;
    }

    /**
     * Records items taken after an approved request, updating the quota.
     */
    public void recordItemsTaken(int quantity, LocalDate today) {
        resetWeekIfNeeded(today);
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be a positive integer.");
        }
        if (quantity > 5 - itemsTakenThisWeek) {
            throw new IllegalArgumentException("Cannot take " + quantity + " items; exceeds weekly limit of 5.");
        }
        this.itemsTakenThisWeek += quantity;
    }

    public int getRemainingWeeklyAllowance(LocalDate today) {
        resetWeekIfNeeded(today);
        return Math.max(0, 5 - itemsTakenThisWeek);
    }

    @Override
    public String toString() {
        return "Student[ID=" + studentId + ", Name=" + name + ", TakenThisWeek=" + itemsTakenThisWeek + "/5, WeekStart=" + weekStartDate + "]";
    }
}

