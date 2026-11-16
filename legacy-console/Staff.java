/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
/**
 * Represents a recognized pantry staff member and their permissions.
 */
public class Staff {

    private String staffId;
    private String name;
    private String role;

    public Staff(String staffId, String name, String role) {
        if (staffId == null || staffId.trim().isEmpty()) {
            throw new IllegalArgumentException("Staff ID cannot be blank.");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Staff name cannot be blank.");
        }
        if (role == null || role.trim().isEmpty()) {
            throw new IllegalArgumentException("Staff role cannot be blank.");
        }

        this.staffId = staffId.trim();
        this.name = name.trim();
        this.role = role.trim();
    }

    public String getStaffId() {
        return staffId;
    }

    public String getName() {
        return name;
    }

    public String getRole() {
        return role;
    }

    public boolean canManageInventory() {
        return true;
    }

    public boolean canProcessRequests() {
        return true;
    }

    @Override
    public String toString() {
        return "Staff[ID=" + staffId
                + ", Name=" + name
                + ", Role=" + role + "]";
    }
}
