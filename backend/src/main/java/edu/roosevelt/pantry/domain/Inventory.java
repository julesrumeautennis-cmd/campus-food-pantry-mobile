package edu.roosevelt.pantry.domain;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
/**
 * Manages the shared product records in both a list and a lookup map.
 */
public class Inventory {

    private ArrayList<Item> items;
    private HashMap<Integer, Item> itemLookup;
    private int lowStockThreshold;

    public Inventory(int lowStockThreshold) {
        if (lowStockThreshold < 1) {
            throw new IllegalArgumentException("Low stock threshold must be at least 1.");
        }
        this.items = new ArrayList<>();
        this.itemLookup = new HashMap<>();
        this.lowStockThreshold = lowStockThreshold;
    }

    public int getLowStockThreshold() {
        return lowStockThreshold;
    }

    public ArrayList<Item> getItems() {
        return new ArrayList<>(items);
    }

    /**
     * Adds an item to both the list and the lookup map.
     * Rejects duplicate IDs.
     */
    public void addItem(Item item) {
        if (item == null) {
            throw new IllegalArgumentException("Cannot add a null item.");
        }
        if (itemLookup.containsKey(item.getItemId())) {
            throw new IllegalArgumentException("Product ID " + item.getItemId() + " already exists. Duplicate IDs are not allowed.");
        }
        items.add(item);
        itemLookup.put(item.getItemId(), item);
    }

    /**
     * Direct O(1) ID lookup using the HashMap.
     */
    public Item findById(int itemId) {
        return itemLookup.get(itemId);
    }

    /**
     * Case-insensitive linear search of ArrayList for a keyword in the product name.
     */
    public ArrayList<Item> searchByName(String keyword) {
        ArrayList<Item> results = new ArrayList<>();
        if (keyword == null || keyword.trim().isEmpty()) {
            return results;
        }
        String lowerKeyword = keyword.trim().toLowerCase();
        for (Item item : items) {
            if (item.getName().toLowerCase().contains(lowerKeyword)) {
                results.add(item);
            }
        }
        return results;
    }

    /**
     * Restocks an existing product by adding a positive integer quantity.
     */
    public void restockItem(int itemId, int quantity) {
        Item item = findById(itemId);
        if (item == null) {
            throw new IllegalArgumentException("Item ID " + itemId + " not found in inventory.");
        }
        item.restock(quantity);
    }

    /**
     * Removes expired stock from both the list and the lookup map.
     * Returns the list of removed expired items.
     */
    public ArrayList<Item> removeExpiredItems(LocalDate today) {
        ArrayList<Item> expiredRemoved = new ArrayList<>();
        for (int i = items.size() - 1; i >= 0; i--) {
            Item item = items.get(i);
            if (item.isExpired(today)) {
                expiredRemoved.add(item);
                itemLookup.remove(item.getItemId());
                items.remove(i);
            }
        }
        return expiredRemoved;
    }

    /**
     * Bubble Sort to arrange the ArrayList alphabetically by product name using compareToIgnoreCase().
     * Compares adjacent items, swaps them when needed, and stops early if a pass makes no swaps.
     * Handles empty and 1-item lists safely.
     */
    public void sortItemsByName() {
        int n = items.size();
        if (n <= 1) {
            return;
        }
        boolean swapped;
        for (int i = 0; i < n - 1; i++) {
            swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (items.get(j).getName().compareToIgnoreCase(items.get(j + 1).getName()) > 0) {
                    Item temp = items.get(j);
                    items.set(j, items.get(j + 1));
                    items.set(j + 1, temp);
                    swapped = true;
                }
            }
            if (!swapped) {
                break; // Early termination if pass made no swaps
            }
        }
    }

    /**
     * Retrieves all items that have a positive quantity below the configured low stock threshold.
     */
    public ArrayList<Item> getLowStockItems() {
        ArrayList<Item> lowStockList = new ArrayList<>();
        for (Item item : items) {
            if (item.getQuantity() > 0 && item.getQuantity() < lowStockThreshold) {
                lowStockList.add(item);
            }
        }
        return lowStockList;
    }

    /**
     * Displays all items currently below the low-stock threshold.
     */
    public void displayLowStockItems() {
        ArrayList<Item> lowStock = getLowStockItems();
        System.out.println("\n=== LOW STOCK ALERTS (Threshold: < " + lowStockThreshold + ") ===");
        if (lowStock.isEmpty()) {
            System.out.println("No low-stock items detected.");
        } else {
            for (Item item : lowStock) {
                System.out.println("ALERT: " + item.getName() + " [ID: " + item.getItemId() + "] - Only " + item.getQuantity() + " remaining!");
            }
        }
    }

    /**
     * Formats the availability status of an item.
     */
    public String getAvailabilityStatus(Item item, LocalDate today) {
        if (item.isExpired(today)) {
            return "EXPIRED";
        }
        if (item.getQuantity() == 0) {
            return "OUT OF STOCK";
        }
        if (item.getQuantity() < lowStockThreshold) {
            return "LOW STOCK (" + item.getQuantity() + ")";
        }
        return "IN STOCK (" + item.getQuantity() + ")";
    }
}
    
