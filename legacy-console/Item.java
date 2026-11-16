/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.time.LocalDate;

/**
 * Represents one food or hygiene product lot.
 */
public class Item {

    private int itemId;
    private String name;
    private String category;
    private int quantity;
    private LocalDate expirationDate; // null means no expiration date applies

    public Item(int itemId, String name, String category, int quantity, LocalDate expirationDate) {
        if (itemId <= 0) {
            throw new IllegalArgumentException("Item ID must be a positive integer.");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Product name cannot be blank.");
        }
        if (category == null || category.trim().isEmpty()) {
            throw new IllegalArgumentException("Category cannot be blank.");
        }
        if (quantity < 0) {
            throw new IllegalArgumentException("Starting quantity cannot be negative.");
        }
        this.itemId = itemId;
        this.name = name.trim();
        this.category = category.trim();
        this.quantity = quantity;
        this.expirationDate = expirationDate;
    }

    public int getItemId() {
        return itemId;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public int getQuantity() {
        return quantity;
    }

    public LocalDate getExpirationDate() {
        return expirationDate;
    }

    /**
     * Checks if the item is expired relative to the given date.
     * A null expiration date means no expiry applies.
     */
    public boolean isExpired(LocalDate today) {
        return expirationDate != null && expirationDate.isBefore(today);
    }

    /**
     * Restocks the item by a positive quantity.
     */
    public void restock(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Restock amount must be a positive integer.");
        }
        if ((long) this.quantity + amount > Integer.MAX_VALUE) {
            throw new IllegalArgumentException("Restock would exceed maximum allowable integer quantity.");
        }
        this.quantity += amount;
    }

    /**
     * Removes stock by a positive quantity.
     */
    public void removeStock(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Remove quantity must be a positive integer.");
        }
        if (amount > this.quantity) {
            throw new IllegalArgumentException("Cannot remove " + amount + " units; only " + this.quantity + " in stock.");
        }
        this.quantity -= amount;
    }

    @Override
    public String toString() {
        String exp = (expirationDate == null) ? "N/A" : expirationDate.toString();
        return String.format("[ID: %-4d] %-20s | Category: %-8s | Qty: %-3d | Exp: %-10s",
                itemId, name, category, quantity, exp);
    }
}
