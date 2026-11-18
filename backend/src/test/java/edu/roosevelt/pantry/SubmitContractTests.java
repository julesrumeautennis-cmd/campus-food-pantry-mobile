package edu.roosevelt.pantry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.roosevelt.pantry.api.Inputs;
import edu.roosevelt.pantry.api.PantryController;
import edu.roosevelt.pantry.security.AccessPolicy;
import edu.roosevelt.pantry.service.PantryService;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Wire example against the real controller, service projection and application JSON mapper. */
@JsonTest
class SubmitContractTests {
    @Autowired ObjectMapper json;

    @Test void memberCanReadTheSubmittedRequestInTheMobileFormat() throws Exception {
        JsonNode fixture;
        try (var stream = getClass().getResourceAsStream("/contracts/request.json")) {
            fixture = json.readTree(stream);
        }
        var submit = json.treeToValue(fixture.required("submit"), Inputs.Submit.class);
        assertEquals(new Inputs.Submit(UUID.fromString("10000000-0000-4000-8000-000000000001"),
            List.of(new Inputs.Line(101, 2))), submit);

        var db = mock(JdbcTemplate.class);
        var owner = UUID.fromString("20000000-0000-4000-8000-000000000002");
        var timestamp = Timestamp.from(Instant.parse("2026-11-16T16:20:00Z"));
        when(db.queryForList(startsWith("select r.*"), eq(1001))).thenReturn(List.of(Map.of(
            "user_id", owner, "display_name", "Alex", "status", "PENDING", "total_units", 2, "submitted_at", timestamp)));
        var line = mock(ResultSet.class);
        when(line.getInt("item_id")).thenReturn(101);
        when(line.getInt("quantity")).thenReturn(2);
        when(line.getString("item_name")).thenReturn("Rice");
        when(line.getString("category")).thenReturn("Food");
        when(line.getObject("expiration_date", LocalDate.class)).thenReturn(LocalDate.of(2027, 5, 30));
        when(db.query(startsWith("select * from pantry.request_lines"), any(RowMapper.class), eq(1001)))
            .thenAnswer(call -> List.of(call.<RowMapper<?>>getArgument(1).mapRow(line, 0)));

        var controller = new PantryController(new PantryService(db, new AccessPolicy(""), Clock.systemUTC()));
        var member = Jwt.withTokenValue("fixture").header("alg", "RS256").subject(owner.toString()).build();
        TransactionSynchronizationManager.initSynchronization();
        try {
            var actual = json.valueToTree(controller.request(member, 1001));
            assertEquals(fixture.required("pending"), actual);
        } finally {
            for (var sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(org.springframework.transaction.support.TransactionSynchronization.STATUS_ROLLED_BACK);
            }
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
