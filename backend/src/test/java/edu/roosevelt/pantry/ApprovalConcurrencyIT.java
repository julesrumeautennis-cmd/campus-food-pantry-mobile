package edu.roosevelt.pantry;

import edu.roosevelt.pantry.api.Inputs;
import edu.roosevelt.pantry.service.PantryService;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {
    "spring.datasource.url=" + ApprovalConcurrencyIT.URL + "?ApplicationName=approval-race",
    "spring.datasource.username=pantry_ci",
    "spring.datasource.password=ci-only-password",
    "spring.flyway.enabled=false",
    "pantry.auth.issuer=https://example.test/auth/v1",
    "pantry.auth.jwks=https://example.test/auth/v1/.well-known/jwks.json",
    "pantry.admin-user-id=" + ApprovalConcurrencyIT.ADMIN
})
class ApprovalConcurrencyIT {
    static final String URL = "jdbc:postgresql://127.0.0.1:5432/pantry_test";
    static final String ADMIN = "00000000-0000-4000-8000-000000000001";
    private static final String CI_PASSWORD = "ci-only-password";
    private static final int LOT = 201; // Demo shampoo has no expiry.
    private final JdbcTemplate fixture = new JdbcTemplate(
        new DriverManagerDataSource(URL, "postgres", CI_PASSWORD));

    @Autowired PantryService service;

    @Test
    void overlappingApprovalsReturnOneDecisionAndChargeOnce() throws Exception {
        UUID member = UUID.randomUUID();
        UUID admin = UUID.fromString(ADMIN);
        fixture.update("insert into auth.users(id) values (?), (?) on conflict do nothing", member, admin);
        int stock = stock();
        var pending = service.submit(principal(member), new Inputs.Submit(UUID.randomUUID(),
            List.of(new Inputs.Line(LOT, 2))));
        int id = (Integer) pending.get("id");
        assertEquals("PENDING", pending.get("status"));
        assertEquals(stock, stock());
        assertEquals(0, quota(member));

        Callable<Map<String, Object>> approve = () -> service.decide(
            principal(admin), id, new Inputs.Decision("APPROVE", null));
        var workers = Executors.newFixedThreadPool(2);
        try (Connection gate = DriverManager.getConnection(URL, "postgres", CI_PASSWORD)) {
            gate.setAutoCommit(false);
            // Hold the request table until both service calls are inside PostgreSQL.
            // One may wait on this table and the other on the service's transaction lock.
            try (var statement = gate.createStatement()) {
                statement.execute("lock table pantry.requests in access exclusive mode");
            }
            var first = workers.submit(approve);
            var second = workers.submit(approve);
            try {
                awaitBothTransactions();
            } finally {
                gate.rollback();
            }
            var decision = first.get(15, TimeUnit.SECONDS);
            assertEquals(id, decision.get("id"));
            assertEquals("APPROVED", decision.get("status"));
            assertNotNull(decision.get("decidedAt"));
            assertEquals(decision, second.get(15, TimeUnit.SECONDS));
            assertEquals(decision, service.request(principal(member), id));
        } finally {
            workers.shutdownNow();
        }
        assertEquals(stock - 2, stock());
        assertEquals(2, quota(member));
        assertEquals(List.of(-2), fixture.queryForList(
            "select delta from pantry.stock_movements where request_id=? and item_id=? and reason='APPROVAL'",
            Integer.class, id, LOT));
    }

    private void awaitBothTransactions() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(15);
        while (System.nanoTime() < deadline) {
            int waiting = fixture.queryForObject("""
                select count(*) from pg_stat_activity where datname=current_database()
                    and application_name='approval-race' and state='active' and wait_event_type='Lock'
                """, Integer.class);
            if (waiting == 2) return;
            Thread.sleep(50);
        }
        fail("Two approval transactions never overlapped in PostgreSQL");
    }

    private int stock() {
        return fixture.queryForObject("select quantity from pantry.item_lots where item_id=?", Integer.class, LOT);
    }

    private int quota(UUID member) {
        return fixture.queryForObject("select coalesce(sum(approved_units),0) from pantry.weekly_quotas where user_id=?",
            Integer.class, member);
    }

    private Jwt principal(UUID user) {
        return Jwt.withTokenValue("test").header("alg", "ES256").subject(user.toString()).build();
    }
}
