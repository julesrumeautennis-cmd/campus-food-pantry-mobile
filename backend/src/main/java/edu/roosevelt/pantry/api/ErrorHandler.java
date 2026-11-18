package edu.roosevelt.pantry.api;

import java.util.Map;
import java.util.LinkedHashMap;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.transaction.CannotCreateTransactionException;

@RestControllerAdvice
public class ErrorHandler {
    static Map<String,Object> body(String code, String message, Map<String,String> fields) {
        return Map.of("code", code, "message", message, "fields", fields);
    }
    @ExceptionHandler(ApiError.class)
    ResponseEntity<?> business(ApiError e) { return ResponseEntity.status(e.status).body(body(e.code,e.getMessage(),Map.of())); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        var fields = new LinkedHashMap<String,String>();
        e.getBindingResult().getFieldErrors().forEach(f -> fields.put(f.getField(),f.getDefaultMessage()));
        return ResponseEntity.badRequest().body(body("INVALID_INPUT","Please check the highlighted fields.",fields));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, IllegalArgumentException.class})
    ResponseEntity<?> badInput(Exception e) { return ResponseEntity.badRequest().body(body("INVALID_INPUT","Invalid request data.",Map.of())); }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> conflict(Exception e) { return ResponseEntity.status(409).body(body("CONFLICT","This operation conflicts with existing data. Refresh and try again.",Map.of())); }
    @ExceptionHandler({CannotCreateTransactionException.class, CannotGetJdbcConnectionException.class})
    ResponseEntity<?> unavailable(Exception e) {
        LoggerFactory.getLogger(ErrorHandler.class).warn("Database connection unavailable ({})", e.getClass().getSimpleName());
        return ResponseEntity.status(503).header("Retry-After", "2")
            .body(body("SERVICE_BUSY", "The pantry is temporarily unavailable. Please try again shortly.", Map.of()));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception e) {
        LoggerFactory.getLogger(ErrorHandler.class).error("Request failed: {}",e.getClass().getSimpleName());
        return ResponseEntity.status(500).body(body("INTERNAL_ERROR","The request could not be completed. Please try again.",Map.of()));
    }
}
