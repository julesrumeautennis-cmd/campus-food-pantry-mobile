# Regression tests

These tests cover request status protection, expiration yes/no input, and cart removal quantities. They use only the Java standard library.

From the repository root in PowerShell:

```powershell
New-Item -ItemType Directory -Force test-out | Out-Null
javac -Xlint:all -d test-out *.java tests/RegressionTests.java
java -cp test-out RegressionTests
```

Expected result: `Results: 16 passed, 0 failed.`

The runner exits with a nonzero status if a check fails. Tests create isolated in-memory fixtures and scripted console input; they do not change saved application data.

Coverage:
- Approved and declined requests cannot change state or be processed twice.
- Both staff decision paths skip stale terminal requests without changing stock, quota, status, or reason, and later requests retain FIFO order.
- The expiration prompt rejects values outside 1 and 2, including retries followed by Yes or No.
- Removing more units than the cart contains leaves the cart unchanged; partial, exact, and nonpositive-quantity cases are checked too.
