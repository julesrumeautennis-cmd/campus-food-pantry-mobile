import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

/** Standalone regression tests: no additional libraries required. */
public class RegressionTests {
    private static int passed;
    private static int failed;
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 24);

    private static class Fixture {
        final Inventory inventory = new Inventory(5);
        final Student student = new Student("S1", "Test Student");
        final Staff staff = new Staff("ST1", "Test Staff", "Coordinator");
        final RequestManager manager;

        Fixture() {
            inventory.addItem(new Item(1, "Rice", "Food", 10, null));
            Map<String, Student> students = new HashMap<>();
            students.put("S1", student);
            manager = new RequestManager(inventory, students);
        }

        Request submit(int units) {
            Map<Integer, Integer> cart = new HashMap<>();
            cart.put(1, units);
            return manager.submitRequest("S1", cart);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void expectIllegalState(Runnable operation) {
        try {
            operation.run();
        } catch (IllegalStateException expected) {
            return;
        }
        throw new AssertionError("Expected IllegalStateException");
    }

    private static void test(String name, Runnable operation) {
        try {
            operation.run();
            passed++;
            System.out.println("PASS: " + name);
        } catch (Throwable error) {
            failed++;
            System.out.println("FAIL: " + name + " - " + error);
        }
    }

    private static String runApp(String... inputs) {
        InputStream originalIn = System.in;
        PrintStream originalOut = System.out;
        ByteArrayOutputStream captured = new ByteArrayOutputStream();
        try {
            System.setIn(new ByteArrayInputStream(
                    (String.join("\n", inputs) + "\n").getBytes(StandardCharsets.UTF_8)));
            System.setOut(new PrintStream(captured, true, "UTF-8"));
            Main.main(new String[0]);
            return captured.toString("UTF-8");
        } catch (UnsupportedEncodingException error) {
            throw new AssertionError(error);
        } finally {
            System.setIn(originalIn);
            System.setOut(originalOut);
        }
    }

    private static void terminalTransition(boolean initiallyApproved, boolean approveAgain) {
        Fixture f = new Fixture();
        Request request = f.submit(2);
        if (initiallyApproved) request.markApproved();
        else request.markDeclined("Original reason");
        String originalStatus = request.getStatus();
        String originalReason = request.getDecisionReason();

        expectIllegalState(() -> {
            if (approveAgain) request.markApproved();
            else request.markDeclined("Replacement reason");
        });
        require(request.getStatus().equals(originalStatus), "Status changed");
        require(request.getDecisionReason().equals(originalReason), "Reason changed");
    }

    private static void managerSkipsTerminal(boolean initiallyApproved, boolean approveNext) {
        Fixture f = new Fixture();
        Request request = f.submit(2);
        if (initiallyApproved) request.markApproved();
        else request.markDeclined("Original reason");
        String originalStatus = request.getStatus();
        String originalReason = request.getDecisionReason();

        boolean result = approveNext
                ? f.manager.approveNextRequest(f.staff, TODAY)
                : f.manager.declineNextRequest(f.staff, "New reason");
        require(!result, "Already processed request was handled again");
        require(f.inventory.findById(1).getQuantity() == 10, "Stock changed");
        require(f.student.getItemsTakenThisWeek() == 0, "Quota changed");
        require(request.getStatus().equals(originalStatus), "Status changed");
        require(request.getDecisionReason().equals(originalReason), "Reason changed");
        require(!f.manager.hasPendingRequests(), "Stale request blocks the queue");
    }

    public static void main(String[] args) {
        test("Approved request cannot be approved twice", () -> terminalTransition(true, true));
        test("Approved request cannot be declined", () -> terminalTransition(true, false));
        test("Declined request cannot be approved", () -> terminalTransition(false, true));
        test("Declined request cannot be declined twice", () -> terminalTransition(false, false));

        test("Approve action skips already approved request", () -> managerSkipsTerminal(true, true));
        test("Approve action skips already declined request", () -> managerSkipsTerminal(false, true));
        test("Decline action skips already approved request", () -> managerSkipsTerminal(true, false));
        test("Decline action skips already declined request", () -> managerSkipsTerminal(false, false));

        test("FIFO continues after skipping stale request", () -> {
            Fixture f = new Fixture();
            Request stale = f.submit(2);
            Request next = f.submit(3);
            stale.markDeclined("Already handled");
            require(!f.manager.approveNextRequest(f.staff, TODAY), "Stale request approved");
            require(f.manager.peekNextRequest() == next, "FIFO order changed");
            require(f.manager.approveNextRequest(f.staff, TODAY), "Next request failed");
            require(f.inventory.findById(1).getQuantity() == 7, "Incorrect stock deduction");
            require(f.student.getItemsTakenThisWeek() == 3, "Incorrect quota deduction");
        });

        test("Ordinary approval and decline remain valid", () -> {
            Fixture f = new Fixture();
            Request approved = f.submit(2);
            Request declined = f.submit(1);
            require(f.manager.approveNextRequest(f.staff, TODAY), "Approval failed");
            require(f.manager.declineNextRequest(f.staff, "Not needed"), "Decline failed");
            require(approved.getStatus().equals("APPROVED"), "Wrong approval status");
            require(declined.getStatus().equals("DECLINED"), "Wrong decline status");
            require(f.inventory.findById(1).getQuantity() == 8, "Wrong stock");
            require(f.student.getItemsTakenThisWeek() == 2, "Wrong quota");
        });

        test("Invalid expiry choices retry until explicit No", () -> {
            String output = runApp("2", "ST1001", "4", "999", "Test Product", "Food", "1",
                    "99", "-1", "0", "2", "1", "11", "3");
            require(output.contains("Invalid choice. Please enter 1 (Yes) or 2 (No)."),
                    "Invalid choices were silently accepted");
            require(output.contains("Product 'Test Product' [ID: 999] added"), "Product not added");
            require(output.contains("N/A"), "No-expiry product not displayed");
        });

        test("Invalid expiry choice followed by Yes keeps the date", () -> {
            String output = runApp("2", "ST1001", "4", "999", "Dated Product", "Food", "1",
                    "3", "1", "2027", "12", "31", "1", "11", "3");
            require(output.contains("Invalid choice. Please enter 1 (Yes) or 2 (No)."),
                    "Invalid choice accepted");
            String productRow = Arrays.stream(output.split("\\R"))
                    .filter(line -> line.startsWith("999 ")).findFirst().orElse("");
            require(productRow.contains("2027-12-31"), "Selected expiry date was lost");
        });

        test("Letters in expiry choice still retry safely", () -> {
            String output = runApp("2", "ST1001", "4", "999", "Test Product", "Food", "1",
                    "abc", "2", "11", "3");
            require(output.contains("Invalid input. Please enter a valid number."), "No numeric warning");
            require(output.contains("Product 'Test Product' [ID: 999] added"), "Valid retry failed");
        });

        test("Excess removal leaves two units in the cart", () -> {
            String output = runApp("1", "S1001", "3", "101", "2", "4", "101", "99",
                    "5", "8", "1", "3");
            require(output.contains("Cannot remove 99 units; only 2 in your cart."), "Missing warning");
            String lastCart = output.substring(output.lastIndexOf("=== YOUR CURRENT CART ==="));
            require(lastCart.contains("Total Requested Units: 2"), "Cart changed after invalid removal");
        });

        test("Partial removal then exact removal still work", () -> {
            String output = runApp("1", "S1001", "3", "101", "2", "4", "101", "1",
                    "5", "4", "101", "1", "5", "8", "3");
            require(output.contains("Total Requested Units: 1"), "Partial removal failed");
            require(output.contains("Removed all units of 'Rice'"), "Exact removal failed");
            String lastCart = output.substring(output.lastIndexOf("=== YOUR CURRENT CART ==="));
            require(lastCart.contains("Your cart is empty."), "Cart was not emptied");
        });

        test("Nonpositive removal retries without losing the cart", () -> {
            String output = runApp("1", "S1001", "3", "101", "2", "4", "101", "0", "-1",
                    "1", "5", "8", "1", "3");
            require(output.contains("Value must be a positive integer greater than zero."), "No validation");
            require(output.contains("Total Requested Units: 1"), "Valid retry removed the wrong quantity");
        });

        System.out.println("Results: " + passed + " passed, " + failed + " failed.");
        if (failed > 0) System.exit(1);
    }
}
