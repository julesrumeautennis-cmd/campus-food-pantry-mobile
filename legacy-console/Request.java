/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
/**
 * Represents a submitted student cart awaiting staff approval.
 * Quantities cannot be modified after submission.
 */
public class Request {

    private int requestId;
    private String studentId;
    private Map<Integer, Integer> requestedQuantities; // ItemId -> Quantity
    private String status; // "PENDING", "APPROVED", "DECLINED"
    private String decisionReason;

    public Request(int requestId, String studentId, Map<Integer, Integer> cart) {
        if (requestId <= 0) {
            throw new IllegalArgumentException("Request ID must be a positive integer.");
        }
        if (studentId == null || studentId.trim().isEmpty()) {
            throw new IllegalArgumentException("Student ID cannot be blank.");
        }
        if (cart == null || cart.isEmpty()) {
            throw new IllegalArgumentException("Cannot create a request with an empty cart.");
        }
        int totalUnits = 0;
        for (Map.Entry<Integer, Integer> entry : cart.entrySet()) {
            if (entry.getKey() == null || entry.getKey() <= 0) {
                throw new IllegalArgumentException("Item IDs must be positive integers.");
            }
            if (entry.getValue() == null || entry.getValue() <= 0) {
                throw new IllegalArgumentException("Requested quantities must be positive integers.");
            }
            try {
                totalUnits = Math.addExact(totalUnits, entry.getValue());
            } catch (ArithmeticException e) {
                throw new IllegalArgumentException("Total requested quantity is too large.", e);
            }
        }
        this.requestId = requestId;
        this.studentId = studentId.trim();
        // Defensive copy: quantities cannot be edited after submission
        this.requestedQuantities = new HashMap<>(cart);
        this.status = "PENDING";
        this.decisionReason = "";
    }

    public int getRequestId() {
        return requestId;
    }

    public String getStudentId() {
        return studentId;
    }

    public Map<Integer, Integer> getRequestedQuantities() {
        return Collections.unmodifiableMap(requestedQuantities);
    }

    public String getStatus() {
        return status;
    }

    public String getDecisionReason() {
        return decisionReason;
    }
    public int getTotalUnits() {
    int total = 0;

    for (int quantity : requestedQuantities.values()) {
        total += quantity;
    }

    return total;
}

public void markApproved() {
    ensurePending();
    this.status = "APPROVED";
    this.decisionReason = "";
}

public void markDeclined(String reason) {
    ensurePending();
    this.status = "DECLINED";
    this.decisionReason = (reason == null) ? "" : reason;
}

private void ensurePending() {
    if (!"PENDING".equals(status)) {
        throw new IllegalStateException("Request #" + requestId + " has already been processed.");
    }
}

}
