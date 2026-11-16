package edu.roosevelt.pantry.api;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Render must not accept a deployment whose database/schema is inaccessible. */
@RestController
public class ReadinessController {
    private final JdbcTemplate db;

    public ReadinessController(JdbcTemplate db) { this.db = db; }

    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, String>> ready() {
        try {
            // Works for an empty inventory too; verifies access without returning any data.
            db.query(connection -> {
                var statement = connection.prepareStatement("select 1 from pantry.item_lots limit 1");
                statement.setQueryTimeout(1);
                return statement;
            }, (ResultSetExtractor<Void>) rows -> null);
            return ResponseEntity.ok(Map.of("status", "ready"));
        } catch (DataAccessException e) {
            // No hostnames, SQL, credentials or driver errors in the public response.
            return ResponseEntity.status(503).body(Map.of("status", "unavailable"));
        }
    }
}
