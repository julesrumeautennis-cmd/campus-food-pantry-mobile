/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Main application class running the role-based console menus and managing sample accounts.
 */
public class Main {

    private Scanner scanner;
    private RequestManager requestManager;
    private Inventory inventory;
    private Map<String, Student> studentsById;
    private Map<String, Staff> staffById;
    private LocalDate simulatedDate;
    private ArrayList<String> hygieneInspectionLog;

    public Main() {
        this.scanner = new Scanner(System.in);
        this.simulatedDate = LocalDate.now();
        this.hygieneInspectionLog = new ArrayList<>();
        this.inventory = new Inventory(5); // Low-stock threshold is 5 units
        this.studentsById = new HashMap<>();
        this.staffById = new HashMap<>();

        loadSampleData();

        this.requestManager = new RequestManager(inventory, studentsById);
    }

    public static void main(String[] args) {
        Main app = new Main();
        app.run();
    }

    private void loadSampleData() {
        // Sample registered students
        studentsById.put("S1001", new Student("S1001", "Alice Johnson"));
        studentsById.put("S1002", new Student("S1002", "Bob Smith"));
        studentsById.put("S1003", new Student("S1003", "Charlie Davis"));

        // Sample authorized staff
        staffById.put("ST1001", new Staff("ST1001", "Sarah Connor", "Pantry Coordinator"));
        staffById.put("ST1002", new Staff("ST1002", "John Doe", "Inventory Specialist"));

        // Sample inventory products (Food and Hygiene)
        inventory.addItem(new Item(101, "Rice", "Food", 20, LocalDate.of(2027, 12, 31)));
        inventory.addItem(new Item(102, "Pasta", "Food", 15, LocalDate.of(2027, 6, 30)));
        inventory.addItem(new Item(103, "Canned Beans", "Food", 10, LocalDate.of(2027, 8, 15)));
        inventory.addItem(new Item(104, "Wheat Flour", "Food", 12, LocalDate.of(2027, 4, 10)));
        inventory.addItem(new Item(105, "Fresh Milk", "Food", 3, LocalDate.of(2026, 11, 15))); // Low stock (<5)
        inventory.addItem(new Item(106, "Whole Bread", "Food", 8, LocalDate.of(2026, 10, 28)));
        inventory.addItem(new Item(107, "Canned Tomato Soup", "Food", 4, LocalDate.of(2026, 9, 1))); // Expired for demo!
        inventory.addItem(new Item(108, "Cooking Oil", "Food", 10, LocalDate.of(2027, 10, 1)));

        inventory.addItem(new Item(201, "Shampoo", "Hygiene", 7, null));
        inventory.addItem(new Item(202, "Bar Soap", "Hygiene", 15, null));
        inventory.addItem(new Item(203, "Toothpaste", "Hygiene", 2, null)); // Low stock (<5)
        inventory.addItem(new Item(204, "Toothbrush", "Hygiene", 12, null));
        inventory.addItem(new Item(205, "Laundry Detergent", "Hygiene", 8, null));
        inventory.addItem(new Item(206, "Dish Soap", "Hygiene", 10, null));
        inventory.addItem(new Item(207, "Toilet Paper", "Hygiene", 20, null));
        inventory.addItem(new Item(208, "Sanitary Pads", "Hygiene", 10, null));
    }

    public void run() {
        System.out.println("=================================================");
        System.out.println("  CAMPUS FOOD PANTRY INVENTORY & REQUEST SYSTEM  ");
        System.out.println("=================================================");
        System.out.println("[Notice: In-memory prototype. Closing resets data.]");

        int choice = 0;
        do {
            System.out.println("\n--- MAIN MENU ---");
            System.out.println("Current Date: " + simulatedDate);
            System.out.println("1. Student Login");
            System.out.println("2. Staff Login");
            System.out.println("3. Exit System");

            choice = readInt("Enter choice (1-3): ");

            switch (choice) {
                case 1:
                    handleStudentLogin();
                    break;
                case 2:
                    handleStaffLogin();
                    break;
                case 3:
                    System.out.println("\nThank you for using the Campus Food Pantry System. Goodbye!");
                    break;
                default:
                    System.out.println("Invalid selection. Please choose 1, 2, or 3.");
            }
        } while (choice != 3);

        scanner.close();
    }

    // ==========================================
    //           AUTHENTICATION HANDLERS
    // ==========================================

    private void handleStudentLogin() {
        System.out.print("\nEnter Student ID (e.g., S1001, S1002, S1003): ");
        String id = scanner.nextLine().trim().toUpperCase();

        if (id.isEmpty()) {
            System.out.println("Error: Student ID cannot be empty.");
            return;
        }

        Student student = studentsById.get(id);
        if (student == null) {
            System.out.println("Access Denied: Unregistered Student ID '" + id + "'.");
            return;
        }

        student.resetWeekIfNeeded(simulatedDate);
        System.out.println("\nWelcome, " + student.getName() + " (" + student.getStudentId() + ")!");
        showStudentMenu(student);
    }

    private void handleStaffLogin() {
        System.out.print("\nEnter Staff ID (e.g., ST1001, ST1002): ");
        String id = scanner.nextLine().trim().toUpperCase();

        if (id.isEmpty()) {
            System.out.println("Error: Staff ID cannot be empty.");
            return;
        }

        Staff staff = staffById.get(id);
        if (staff == null) {
            System.out.println("Access Denied: Unrecognized Staff account ID '" + id + "'.");
            return;
        }

        System.out.println("\nWelcome, " + staff.getName() + " (" + staff.getRole() + ")!");
        showStaffMenu(staff);
    }

    // ==========================================
    //              STUDENT MENU
    // ==========================================

    private void showStudentMenu(Student student) {
        // In-memory cart for this student session: ItemId -> Quantity
        Map<Integer, Integer> cart = new HashMap<>();

        int choice = 0;
        do {
            student.resetWeekIfNeeded(simulatedDate);
            int inCart = getCartTotal(cart);
            int taken = student.getItemsTakenThisWeek();
            int remainingAllowance = Math.max(0, 5 - taken - inCart);

            System.out.println("\n--- STUDENT PORTAL: " + student.getName() + " (" + student.getStudentId() + ") ---");
            System.out.println("Weekly Limit: 5 | Taken This Week: " + taken + " | In Cart: " + inCart + " | Available to Add: " + remainingAllowance);
            System.out.println("1. Browse All Products");
            System.out.println("2. Search Products (by Name or Item ID)");
            System.out.println("3. Add Product to Cart");
            System.out.println("4. Remove / Edit Product in Cart");
            System.out.println("5. View Current Cart");
            System.out.println("6. Review & Submit Request (Checkout)");
            System.out.println("7. View My Weekly Quota Details");
            System.out.println("8. Logout to Main Menu");

            choice = readInt("Enter your choice: ");

            switch (choice) {
                case 1:
                    displayAllProducts();
                    break;
                case 2:
                    handleSearch();
                    break;
                case 3:
                    handleAddProductToCart(student, cart);
                    break;
                case 4:
                    handleRemoveFromCart(cart);
                    break;
                case 5:
                    displayCart(cart);
                    break;
                case 6:
                    handleSubmitRequest(student, cart);
                    break;
                case 7:
                    System.out.println("\n=== WEEKLY QUOTA REPORT ===");
                    System.out.println("Student: " + student.getName() + " (" + student.getStudentId() + ")");
                    System.out.println("Week of (Monday): " + student.getWeekStartDate());
                    System.out.println("Items approved this week: " + student.getItemsTakenThisWeek() + " / 5");
                    System.out.println("Items currently in cart: " + getCartTotal(cart));
                    System.out.println("Remaining items allowed: " + remainingAllowance);
                    break;
                case 8:
                    if (!cart.isEmpty()) {
                        System.out.print("You have unsubmitted items in your cart. Logout anyway? (1 = Yes, 2 = No): ");
                        int confirm = readInt("");
                        if (confirm != 1) {
                            choice = 0; // Don't logout
                            break;
                        }
                    }
                    System.out.println("Logged out successfully.");
                    break;
                default:
                    System.out.println("Invalid option. Please choose between 1 and 8.");
            }
        } while (choice != 8);
    }

    private void handleAddProductToCart(Student student, Map<Integer, Integer> cart) {
        displayAllProducts();
        int itemId = readPositiveInt("\nEnter Item ID to add: ");
        Item item = inventory.findById(itemId);

        if (item == null) {
            System.out.println("Error: Product with ID " + itemId + " does not exist.");
            return;
        }

        if (item.isExpired(simulatedDate)) {
            System.out.println("Error: '" + item.getName() + "' is expired and cannot be requested.");
            return;
        }

        int inCart = cart.getOrDefault(itemId, 0);
        int availableStock = item.getQuantity() - inCart;

        if (availableStock <= 0) {
            System.out.println("Error: No additional stock available for '" + item.getName() + "'.");
            return;
        }

        int cartTotal = getCartTotal(cart);
        int remainingQuota = 5 - student.getItemsTakenThisWeek() - cartTotal;

        if (remainingQuota <= 0) {
            System.out.println("Weekly limit reached! You cannot request more than 5 items per week.");
            return;
        }

        System.out.println("Selected: " + item.getName() + " [Category: " + item.getCategory() + "]");
        System.out.println("Available in stock: " + availableStock + " | Remaining weekly quota: " + remainingQuota);

        int qty = readPositiveInt("Enter quantity to add: ");

        if (qty > availableStock) {
            System.out.println("Error: Insufficient stock available. Maximum you can add is " + availableStock + ".");
            return;
        }

        if (qty > remainingQuota) {
            System.out.println("Error: Cannot add " + qty + " items. You can only request up to " + remainingQuota + " more item(s) this week.");
            return;
        }

        cart.put(itemId, inCart + qty);
        System.out.println("Success: Added " + qty + " x '" + item.getName() + "' to your cart.");
    }

    private void handleRemoveFromCart(Map<Integer, Integer> cart) {
        if (cart.isEmpty()) {
            System.out.println("Your cart is currently empty.");
            return;
        }

        displayCart(cart);
        System.out.println("Enter 0 to clear the entire cart.");
        int itemId = readInt("Enter Item ID to remove / edit: ");

        if (itemId == 0) {
            cart.clear();
            System.out.println("Success: Cart has been cleared.");
            return;
        }

        if (!cart.containsKey(itemId)) {
            System.out.println("Error: Item ID " + itemId + " is not in your cart.");
            return;
        }

        int currentQty = cart.get(itemId);
        Item item = inventory.findById(itemId);
        String itemName = (item != null) ? item.getName() : "Item #" + itemId;

        int removeQty = readPositiveInt("Enter quantity to remove (max " + currentQty + "): ");

        if (removeQty > currentQty) {
            System.out.println("Error: Cannot remove " + removeQty + " units; only " + currentQty + " in your cart.");
            return;
        }

        if (removeQty == currentQty) {
            cart.remove(itemId);
            System.out.println("Success: Removed all units of '" + itemName + "' from cart.");
        } else {
            cart.put(itemId, currentQty - removeQty);
            System.out.println("Success: Removed " + removeQty + " units of '" + itemName + "'. Remaining in cart: " + (currentQty - removeQty));
        }
    }

    private void displayCart(Map<Integer, Integer> cart) {
        System.out.println("\n=== YOUR CURRENT CART ===");
        if (cart.isEmpty()) {
            System.out.println("Your cart is empty.");
            return;
        }

        int totalUnits = 0;
        System.out.printf("%-8s | %-22s | %-10s | %-8s%n", "Item ID", "Name", "Category", "Quantity");
        System.out.println("---------------------------------------------------------");
        for (Map.Entry<Integer, Integer> entry : cart.entrySet()) {
            Item item = inventory.findById(entry.getKey());
            String name = (item != null) ? item.getName() : "Unknown";
            String cat = (item != null) ? item.getCategory() : "Unknown";
            System.out.printf("%-8d | %-22s | %-10s | %-8d%n", entry.getKey(), name, cat, entry.getValue());
            totalUnits += entry.getValue();
        }
        System.out.println("---------------------------------------------------------");
        System.out.println("Total Requested Units: " + totalUnits);
    }

    private void handleSubmitRequest(Student student, Map<Integer, Integer> cart) {
        if (cart.isEmpty()) {
            System.out.println("Checkout failed: Cannot submit an empty cart.");
            return;
        }

        int cartTotal = getCartTotal(cart);
        student.resetWeekIfNeeded(simulatedDate);

        if (student.getItemsTakenThisWeek() + cartTotal > 5) {
            System.out.println("Checkout failed: Cart total (" + cartTotal + ") exceeds your remaining weekly limit ("
                    + (5 - student.getItemsTakenThisWeek()) + ").");
            return;
        }

        // Confirmation summary before submission (FR4)
        System.out.println("\n==========================================");
        System.out.println("       ORDER CONFIRMATION SUMMARY         ");
        System.out.println("==========================================");
        displayCart(cart);
        System.out.println("Student: " + student.getName() + " (" + student.getStudentId() + ")");
        System.out.println("Current Weekly Usage: " + student.getItemsTakenThisWeek() + " / 5");
        System.out.println("Total Units in Request: " + cartTotal);
        System.out.println("Note: Submitting places your request in the PENDING approval queue.");
        System.out.println("Pending requests do NOT reserve stock until staff approval.");

        int confirm = readInt("\nConfirm and submit request? (1 = Yes, 2 = No): ");
        if (confirm != 1) {
            System.out.println("Submission cancelled. Cart remains intact.");
            return;
        }

        try {
            // FR5: Enters Queue<Request> in FIFO order with PENDING status
            Request req = requestManager.submitRequest(student.getStudentId(), cart);
            cart.clear(); // Clear local student cart after submission

            System.out.println("\n*** REQUEST SUBMITTED SUCCESSFULLY! ***");
            System.out.println("Assigned Request ID: #" + req.getRequestId());
            System.out.println("Status: " + req.getStatus());
            System.out.println("Queue Position: " + requestManager.getPendingCount());
            System.out.println("Your request has been queued for staff review.");
        } catch (IllegalArgumentException e) {
            System.out.println("Submission Error: " + e.getMessage());
        }
    }

    // ==========================================
    //               STAFF MENU
    // ==========================================

    private void showStaffMenu(Staff staff) {
        int choice = 0;
        do {
            System.out.println("\n--- STAFF PORTAL: " + staff.getName() + " (" + staff.getRole() + ") ---");
            System.out.println("Pending Requests in Queue: " + requestManager.getPendingCount());
            System.out.println("1. View Complete Inventory");
            System.out.println("2. Search Inventory (by Name or Item ID)");
            System.out.println("3. Sort Inventory Alphabetically (Bubble Sort Demo)");
            System.out.println("4. Add New Product (FR2)");
            System.out.println("5. Restock Existing Product (FR2)");
            System.out.println("6. View Low-Stock Alerts (F9)");
            System.out.println("7. Remove Expired Stock (F5)");
            System.out.println("8. Review & Process Pending Requests (FIFO Queue) (FR5)");
            System.out.println("9. Daily Hygiene & Cleanliness Inspection Log");
            System.out.println("10. Advance Simulated Date (Demo Week Rollover)");
            System.out.println("11. Logout to Main Menu");

            choice = readInt("Enter your choice: ");

            switch (choice) {
                case 1:
                    displayAllProducts();
                    break;
                case 2:
                    handleSearch();
                    break;
                case 3:
                    handleBubbleSortDemo();
                    break;
                case 4:
                    handleAddNewProduct();
                    break;
                case 5:
                    handleRestockProduct();
                    break;
                case 6:
                    inventory.displayLowStockItems();
                    break;
                case 7:
                    handleRemoveExpired();
                    break;
                case 8:
                    handleProcessRequests(staff);
                    break;
                case 9:
                    handleHygieneInspection();
                    break;
                case 10:
                    handleAdvanceDate();
                    break;
                case 11:
                    System.out.println("Staff logged out successfully.");
                    break;
                default:
                    System.out.println("Invalid option. Please choose between 1 and 11.");
            }
        } while (choice != 11);
    }

    private void handleBubbleSortDemo() {
        System.out.println("\n=== BUBBLE SORT DEMONSTRATION ===");
        System.out.println("--- Unsorted Inventory List ---");
        for (Item item : inventory.getItems()) {
            System.out.println("- " + item.getName() + " [ID: " + item.getItemId() + "]");
        }

        // Execute bubble sort
        inventory.sortItemsByName();

        System.out.println("\n--- Alphabetically Sorted Result (Bubble Sort using compareToIgnoreCase) ---");
        for (Item item : inventory.getItems()) {
            System.out.println("- " + item.getName() + " [ID: " + item.getItemId() + "]");
        }
        System.out.println("Sorting completed successfully.");
    }

    private void handleAddNewProduct() {
        System.out.println("\n=== ADD NEW PRODUCT (FR2) ===");
        int itemId = readPositiveInt("Enter unique Product ID (integer): ");

        if (inventory.findById(itemId) != null) {
            System.out.println("Error: Product ID " + itemId + " already exists. Insertion rejected.");
            return;
        }

        String name = readString("Enter product name: ");
        if (name.isEmpty()) {
            System.out.println("Error: Product name cannot be blank.");
            return;
        }

        String category = readString("Enter category (e.g., Food, Hygiene): ");
        if (category.isEmpty()) {
            System.out.println("Error: Category cannot be blank.");
            return;
        }

        int quantity = readInt("Enter starting quantity (non-negative): ");
        if (quantity < 0) {
            System.out.println("Error: Starting quantity cannot be negative.");
            return;
        }

        System.out.print("Does this product have an expiration date? (1 = Yes, 2 = No): ");
        int hasExp = readInt("");
        while (hasExp != 1 && hasExp != 2) {
            System.out.println("Invalid choice. Please enter 1 (Yes) or 2 (No).");
            hasExp = readInt("Does this product have an expiration date? (1 = Yes, 2 = No): ");
        }
        LocalDate expDate = null;
        if (hasExp == 1) {
            int year = readPositiveInt("Enter expiration year (e.g. 2027): ");
            int month = readPositiveInt("Enter expiration month (1-12): ");
            int day = readPositiveInt("Enter expiration day (1-31): ");
            try {
                expDate = LocalDate.of(year, month, day);
            } catch (Exception e) {
                System.out.println("Invalid date. Product was not added.");
                return;
            }
        }

        try {
            Item newItem = new Item(itemId, name, category, quantity, expDate);
            inventory.addItem(newItem);
            System.out.println("Success: Product '" + name + "' [ID: " + itemId + "] added to inventory.");
        } catch (IllegalArgumentException e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private void handleRestockProduct() {
        System.out.println("\n=== RESTOCK PRODUCT (FR2) ===");
        int itemId = readPositiveInt("Enter Product ID to restock: ");
        Item item = inventory.findById(itemId);

        if (item == null) {
            System.out.println("Error: Item ID " + itemId + " not found in inventory.");
            return;
        }

        System.out.println("Current Stock for '" + item.getName() + "': " + item.getQuantity());
        int qty = readPositiveInt("Enter quantity to add (positive integer): ");

        try {
            inventory.restockItem(itemId, qty);
            System.out.println("Success: Restocked " + qty + " units. New quantity: " + item.getQuantity());
        } catch (IllegalArgumentException e) {
            System.out.println("Restock Error: " + e.getMessage());
        }
    }

    private void handleRemoveExpired() {
        System.out.println("\n=== REMOVE EXPIRED STOCK (F5) ===");
        System.out.println("Checking expiry against current date: " + simulatedDate);

        ArrayList<Item> removed = inventory.removeExpiredItems(simulatedDate);
        if (removed.isEmpty()) {
            System.out.println("No expired products found in inventory.");
        } else {
            System.out.println("The following expired items have been removed from inventory:");
            for (Item item : removed) {
                System.out.println("- REMOVED: " + item.getName() + " [ID: " + item.getItemId()
                        + "] - Expired on: " + item.getExpirationDate() + " (Discarded " + item.getQuantity() + " units)");
            }
        }
    }

    private void handleProcessRequests(Staff staff) {
        System.out.println("\n=== PENDING REQUESTS QUEUE (FIFO) ===");
        if (!requestManager.hasPendingRequests()) {
            System.out.println("No pending requests.");
            return;
        }

        Request nextReq = requestManager.peekNextRequest();
        Student student = studentsById.get(nextReq.getStudentId());

        System.out.println("Next request in arrival order:");
        System.out.println("Request ID: #" + nextReq.getRequestId());
        System.out.println("Student: " + (student != null ? student.getName() : "Unknown") + " (" + nextReq.getStudentId() + ")");
        System.out.println("Status: " + nextReq.getStatus());
        System.out.println("Total Units Requested: " + nextReq.getTotalUnits());
        System.out.println("Requested Lines:");

        for (Map.Entry<Integer, Integer> entry : nextReq.getRequestedQuantities().entrySet()) {
            Item item = inventory.findById(entry.getKey());
            String itemName = (item != null) ? item.getName() : "Unknown [ID: " + entry.getKey() + "]";
            int stock = (item != null) ? item.getQuantity() : 0;
            String expStr = (item != null && item.getExpirationDate() != null) ? " (Exp: " + item.getExpirationDate() + ")" : "";
            System.out.printf("  * %-20s | Requested: %-2d | Available Stock: %-2d%s%n", itemName, entry.getValue(), stock, expStr);
        }

        System.out.println("\nDecision Options:");
        System.out.println("1. Approve Request (Validates stock & quota, then deducts stock)");
        System.out.println("2. Decline Request (Leaves stock & quota unchanged)");
        System.out.println("3. Back to Staff Menu");

        int decision = readInt("Select action (1-3): ");

        if (decision == 1) {
            requestManager.approveNextRequest(staff, simulatedDate);
        } else if (decision == 2) {
            String reason = readString("Enter decline reason: ");
            if (reason.isEmpty()) {
                System.out.println("A decline reason is required.");
                return;
            }
            requestManager.declineNextRequest(staff, reason);
        } else {
            System.out.println("Operation deferred.");
        }
    }

    private void handleHygieneInspection() {
        System.out.println("\n=== DAILY HYGIENE & CLEANLINESS INSPECTION LOG ===");
        System.out.println("Inspect quantities, expiry dates, damaged products, and cleanliness.");
        System.out.println("1. View Inspection Log");
        System.out.println("2. Record New Inspection Entry");

        int opt = readInt("Enter choice (1-2): ");
        if (opt == 1) {
            if (hygieneInspectionLog.isEmpty()) {
                System.out.println("No inspection entries recorded yet.");
            } else {
                System.out.println("\n--- Historical Inspection Records ---");
                for (String entry : hygieneInspectionLog) {
                    System.out.println(entry);
                }
            }
        } else if (opt == 2) {
            String inspector = readString("Enter Inspector Staff Name: ");
            String notes = readString("Enter inspection notes (Cleanliness, Damaged goods, Hygiene condition): ");
            String logEntry = "[" + simulatedDate + "] Inspector: " + inspector + " | Notes: " + notes;
            hygieneInspectionLog.add(logEntry);
            System.out.println("Success: Inspection entry recorded.");
        }
    }

   private void handleAdvanceDate() {
    System.out.println("\n=== SIMULATE DATE CHANGE (QUOTA RESET DEMO) ===");
    System.out.println("Current Simulated Date: " + simulatedDate);

    LocalDate weekStart = simulatedDate.with(
        TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
    );

    System.out.println("Current Week of (Monday): " + weekStart);

    int days = readPositiveInt(
        "Enter number of days to advance (e.g. 7 to advance to next week): "
    );

    simulatedDate = simulatedDate.plusDays(days);

    LocalDate newWeekStart = simulatedDate.with(
        TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)
    );

    System.out.println(
        "Success: Date advanced to " + simulatedDate
        + " (Monday: " + newWeekStart + ")"
    );

    System.out.println(
        "All students logging in on or after this date will have "
        + "their weekly quotas reset automatically."
    );
}

    // ==========================================
    //           SEARCH & DISPLAY UTILITIES
    // ==========================================

    private void handleSearch() {
        System.out.println("\n=== SEARCH INVENTORY ===");
        System.out.println("1. Search by Product ID (O(1) HashMap Lookup)");
        System.out.println("2. Search by Product Name (Linear Keyword Search)");

        int choice = readInt("Enter choice (1-2): ");
        if (choice == 1) {
            int itemId = readPositiveInt("Enter Item ID: ");
            Item item = inventory.findById(itemId);
            if (item == null) {
                System.out.println("No product found with ID " + itemId + ".");
            } else {
                System.out.println("\nMatch found:");
                printItemHeader();
                printItemRow(item);
            }
        } else if (choice == 2) {
            String keyword = readString("Enter keyword to search in product name: ");
            ArrayList<Item> results = inventory.searchByName(keyword);
            if (results.isEmpty()) {
                System.out.println("No products found matching keyword '" + keyword + "'.");
            } else {
                System.out.println("\nSearch results (" + results.size() + " match(es)):");
                printItemHeader();
                for (Item item : results) {
                    printItemRow(item);
                }
            }
        } else {
            System.out.println("Invalid search option.");
        }
    }

    private void displayAllProducts() {
        System.out.println("\n=========================================================================================");
        System.out.println("                               CAMPUS PANTRY INVENTORY                                   ");
        System.out.println("=========================================================================================");
        printItemHeader();
        for (Item item : inventory.getItems()) {
            printItemRow(item);
        }
        System.out.println("=========================================================================================");
    }

    private void printItemHeader() {
        System.out.printf("%-6s | %-22s | %-10s | %-6s | %-12s | %-16s%n",
                "ID", "Name", "Category", "Stock", "Expiry Date", "Availability");
        System.out.println("-----------------------------------------------------------------------------------------");
    }

    private void printItemRow(Item item) {
        String exp = (item.getExpirationDate() == null) ? "N/A" : item.getExpirationDate().toString();
        String status = inventory.getAvailabilityStatus(item, simulatedDate);
        System.out.printf("%-6d | %-22s | %-10s | %-6d | %-12s | %-16s%n",
                item.getItemId(), item.getName(), item.getCategory(), item.getQuantity(), exp, status);
    }

    private int getCartTotal(Map<Integer, Integer> cart) {
        int total = 0;
        for (int qty : cart.values()) {
            total += qty;
        }
        return total;
    }

    // ==========================================
    //           SAFE INPUT HELPERS
    // ==========================================

    private String readString(String prompt) {
        System.out.print(prompt);
        return scanner.nextLine().trim();
    }

    private int readInt(String prompt) {
        while (true) {
            System.out.print(prompt);
            String line = scanner.nextLine().trim();
            try {
                return Integer.parseInt(line);
            } catch (NumberFormatException e) {
                System.out.println("Invalid input. Please enter a valid number.");
            }
        }
    }

    private int readPositiveInt(String prompt) {
        while (true) {
            int val = readInt(prompt);
            if (val > 0) {
                return val;
            }
            System.out.println("Value must be a positive integer greater than zero.");
        }
    }
    }
