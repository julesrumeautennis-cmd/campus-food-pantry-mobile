package edu.roosevelt.pantry;

import edu.roosevelt.pantry.security.*;
import edu.roosevelt.pantry.api.ApiError;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class SecurityTests {
    static final String ADMIN="0a479452-c559-4b47-b486-8f0eb2d22ca0";
    static final String MEMBER="ca7714e7-fbfe-4ca5-9171-e7bcc7e58cf9";
    static final String ISSUER="https://example.supabase.co/auth/v1";
    Jwt token(String sub,String issuer,String audience,Instant expiry) {
        return Jwt.withTokenValue("test-token").header("alg","ES256").subject(sub).issuer(issuer)
            .audience(List.of(audience)).issuedAt(expiry.minusSeconds(3600)).expiresAt(expiry)
            .claim("user_metadata",Map.of("role","ADMIN","is_admin",true)).build();
    }
    @Test void untrustedMetadataCannotGrantAdmin() {
        var access=new AccessPolicy(ADMIN); var member=token(MEMBER,ISSUER,"authenticated",Instant.now().plusSeconds(600));
        assertFalse(access.isAdmin(member)); assertThrows(ApiError.class,()->access.requireAdmin(member));
        assertTrue(access.isAdmin(token(ADMIN,ISSUER,"authenticated",Instant.now().plusSeconds(600))));
    }
    @Test void unsetAdminFailsClosed() {
        assertFalse(new AccessPolicy("").isAdmin(token(ADMIN,ISSUER,"authenticated",Instant.now().plusSeconds(600))));
    }
    @Test void validatorRejectsWrongIssuerAudienceAndExpiredTokens() {
        var validate=SecurityConfig.validators(ISSUER); var future=Instant.now().plusSeconds(600);
        assertFalse(validate.validate(token(MEMBER,ISSUER,"authenticated",future)).hasErrors());
        assertTrue(validate.validate(token(MEMBER,"https://other.supabase.co/auth/v1","authenticated",future)).hasErrors());
        assertTrue(validate.validate(token(MEMBER,ISSUER,"anon",future)).hasErrors());
        assertTrue(validate.validate(token(MEMBER,ISSUER,"authenticated",Instant.now().minusSeconds(120))).hasErrors());
        assertTrue(validate.validate(token("not-a-uuid",ISSUER,"authenticated",future)).hasErrors());
    }
    @Test void restoredDomainChecks() { DomainAdapterChecks.main(new String[0]); }
}
