package edu.roosevelt.pantry.security;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.jwt.Jwt;
import edu.roosevelt.pantry.api.ApiError;

@Component
public class AccessPolicy {
    private final UUID admin;
    public AccessPolicy(@Value("${pantry.admin-user-id:}") String value) {
        admin = value.isBlank() ? null : UUID.fromString(value);
    }
    public UUID user(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
    public boolean isAdmin(Jwt jwt) { return admin != null && admin.equals(user(jwt)); }
    public void requireAdmin(Jwt jwt) {
        if (!isAdmin(jwt)) throw new ApiError(403,"FORBIDDEN","Administrator access required.");
    }
}
