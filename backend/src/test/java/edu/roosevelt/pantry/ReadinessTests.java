package edu.roosevelt.pantry;

import edu.roosevelt.pantry.api.ReadinessController;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.jdbc.core.ResultSetExtractor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReadinessTests {
    @Test void emptyInventoryIsReadyWhenSchemaIsAccessible() {
        var db = mock(JdbcTemplate.class);
        when(db.query(any(PreparedStatementCreator.class), any(ResultSetExtractor.class))).thenReturn(null);
        var response = new ReadinessController(db).ready();
        assertEquals(200, response.getStatusCode().value());
        assertEquals("ready", response.getBody().get("status"));
    }

    @Test void inaccessibleDatabaseReturns503WithoutExposingDetails() {
        var db = mock(JdbcTemplate.class);
        when(db.query(any(PreparedStatementCreator.class), any(ResultSetExtractor.class)))
            .thenThrow(new DataAccessResourceFailureException("private connection details"));
        var response = new ReadinessController(db).ready();
        assertEquals(503, response.getStatusCode().value());
        assertEquals(Map.of("status","unavailable"), response.getBody());
    }
}
