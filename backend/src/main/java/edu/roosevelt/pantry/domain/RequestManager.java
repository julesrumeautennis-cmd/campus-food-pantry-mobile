package edu.roosevelt.pantry.domain;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
 
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Queue;


/**
 * Coordinates student requests, inventory updates, and weekly quotas in FIFO order.
 */
public class RequestManager {

    private Queue<Request> pendingRequests;
    private Map<String, Student> studentsById;
    private Inventory inventory;
    private int nextRequestId;

    public RequestManager(Inventory inventory, Map<String, Student> studentsById) {
        if (inventory == null) {
            throw new IllegalArgumentException("Inventory cannot be null.");
        }
        if (studentsById == null) {
            throw new IllegalArgumentException("Students map cannot be null.");
        }
        this.inventory = inventory;
        this.studentsById = studentsById;
        this.pendingRequests = new ArrayDeque<>();
        this.nextRequestId = 1001;
    }

    public boolean hasPendingRequests() {
        return !pendingRequests.isEmpty();
    }

    /** Persistence adapter: rebuild the original FIFO from database arrival order. */
    public RequestManager(Inventory inventory, Map<String, Student> studentsById,
                          int nextRequestId, Iterable<Request> pendingInArrivalOrder) {
        this(inventory, studentsById);
        if (nextRequestId < 1 || nextRequestId == Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Invalid next request ID.");
        }
        this.nextRequestId = nextRequestId;
        for (Request request : pendingInArrivalOrder) {
            if (request == null || !"PENDING".equals(request.getStatus())) {
                throw new IllegalArgumentException("Only pending requests can be restored.");
            }
            this.pendingRequests.offer(request);
        }
    }

    public int getPendingCount() {
        return pendingRequests.size();
    }

    public Request peekNextRequest() {
        return pendingRequests.peek();
    }

    public Queue<Request> getPendingRequests() {
        return new ArrayDeque<>(pendingRequests);
    }

    /**
     * Submits a confirmed cart into the arrival queue (FIFO).
     * Pending requests do not reserve stock.
     */
    public Request submitRequest(String studentId, Map<Integer, Integer> cart) {
        if (cart == null || cart.isEmpty()) {
            throw new IllegalArgumentException("Cannot submit an empty cart.");
        }
        String normalizedStudentId = studentId == null ? null : studentId.trim();
        if (normalizedStudentId == null || studentsById.get(normalizedStudentId) == null) {
            throw new IllegalArgumentException("Cannot submit request: Student ID '" + studentId + "' is not registered.");
        }
        Request request = new Request(nextRequestId, normalizedStudentId, cart);
        nextRequestId++;
        pendingRequests.offer(request);
        return request;
    }

    /**
     * Inspects and approves the oldest pending request in the queue.
     * Validates the entire request and weekly quota BEFORE modifying any stock or quota.
     * If any validation fails, the request is marked DECLINED and neither stock nor quota change.
     */
    public boolean approveNextRequest(Staff staff, LocalDate today) {
        if (staff == null || today == null) {
            throw new IllegalArgumentException("Staff and approval date are required.");
        }
        if (!staff.canProcessRequests()) {
            return false;
        }
        if (pendingRequests.isEmpty()) {
            System.out.println("No pending requests.");
            return false;
        }

        Request request = pendingRequests.poll();
        if (!"PENDING".equals(request.getStatus())) {
            System.out.println("Request #" + request.getRequestId() + " has already been processed. Skipping it.");
            return false;
        }
        Student student = studentsById.get(request.getStudentId());

        if (student == null) {
            request.markDeclined("Unregistered student account: " + request.getStudentId());
            System.out.println("Request #" + request.getRequestId() + " declined: Student not found.");
            return false;
        }

        // Quota validation
        student.resetWeekIfNeeded(today);
        int totalUnits = request.getTotalUnits();
        if (!student.canRequestItems(totalUnits, today)) {
            String reason = "Exceeds weekly limit of 5 items. (Already received: "
                    + student.getItemsTakenThisWeek() + ", Requested: " + totalUnits + ")";
            request.markDeclined(reason);
            System.out.println("Request #" + request.getRequestId() + " declined: " + reason);
            return false;
        }

        // Inventory validation for all lines
        for (Map.Entry<Integer, Integer> entry : request.getRequestedQuantities().entrySet()) {
            int itemId = entry.getKey();
            int qty = entry.getValue();
            Item item = inventory.findById(itemId);

            if (item == null) {
                String reason = "Product ID " + itemId + " is no longer available in inventory.";
                request.markDeclined(reason);
                System.out.println("Request #" + request.getRequestId() + " declined: " + reason);
                return false;
            }

            if (item.isExpired(today)) {
                String reason = "Product '" + item.getName() + "' is expired (" + item.getExpirationDate() + ").";
                request.markDeclined(reason);
                System.out.println("Request #" + request.getRequestId() + " declined: " + reason);
                return false;
            }

            if (item.getQuantity() < qty) {
                String reason = "Insufficient stock for '" + item.getName() + "' (Available: "
                        + item.getQuantity() + ", Requested: " + qty + ").";
                request.markDeclined(reason);
                System.out.println("Request #" + request.getRequestId() + " declined: " + reason);
                return false;
            }
        }

        // All checks passed! Deduct stock and record quota
        for (Map.Entry<Integer, Integer> entry : request.getRequestedQuantities().entrySet()) {
            Item item = inventory.findById(entry.getKey());
            item.removeStock(entry.getValue());
        }

        student.recordItemsTaken(totalUnits, today);
        request.markApproved();
        System.out.println("Request #" + request.getRequestId() + " approved successfully for student " + student.getName() + " (" + student.getStudentId() + ")!");
        return true;
    }

    /**
     * Declines the oldest pending request with an explicit staff reason.
     * Leaves all stock and quota unchanged.
     */
    public boolean declineNextRequest(Staff staff, String reason) {
        if (staff == null) {
            throw new IllegalArgumentException("Staff is required to decline a request.");
        }
        if (!staff.canProcessRequests()) {
            return false;
        }
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("A decline reason is required.");
        }
        if (pendingRequests.isEmpty()) {
            System.out.println("No pending requests.");
            return false;
        }
        Request request = pendingRequests.poll();
        if (!"PENDING".equals(request.getStatus())) {
            System.out.println("Request #" + request.getRequestId() + " has already been processed. Skipping it.");
            return false;
        }
        request.markDeclined(reason);
        System.out.println("Request #" + request.getRequestId() + " declined. Reason: " + request.getDecisionReason());
        return true;
    }
}
    
