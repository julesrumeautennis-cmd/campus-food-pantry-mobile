package edu.roosevelt.pantry.security;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.cors.*;

@Configuration
public class SecurityConfig {
    public static OAuth2TokenValidator<Jwt> validators(String issuer) {
        return new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),
            new JwtClaimValidator<java.time.Instant>("exp", Objects::nonNull),
            new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.contains("authenticated")),
            new JwtClaimValidator<String>("sub", sub -> {
                try { return sub != null && UUID.fromString(sub).toString().equals(sub); }
                catch (IllegalArgumentException e) { return false; }
            }));
    }
    @Bean JwtDecoder decoder(@Value("${pantry.auth.issuer}") String issuer, @Value("${pantry.auth.jwks}") String jwks) {
        var decoder = NimbusJwtDecoder.withJwkSetUri(jwks)
            .jwsAlgorithms(a -> { a.add(SignatureAlgorithm.ES256); a.add(SignatureAlgorithm.RS256); }).build();
        decoder.setJwtValidator(validators(issuer));
        return decoder;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, AccessPolicy access) throws Exception {
        return http.csrf(c -> c.disable()).cors(c -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.requestMatchers("/health", "/health/ready").permitAll()
                .requestMatchers("/api/v1/admin/**").hasAuthority("ADMIN").anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwt ->
                new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority(access.isAdmin(jwt) ? "ADMIN" : "MEMBER")))))
                .authenticationEntryPoint((req,res,e) -> {
                    res.setStatus(401); res.setContentType("application/json");
                    res.getWriter().write("{\"code\":\"UNAUTHENTICATED\",\"message\":\"Please sign in again.\",\"fields\":{}}");
                }).accessDeniedHandler((req,res,e) -> {
                    res.setStatus(403); res.setContentType("application/json");
                    res.getWriter().write("{\"code\":\"FORBIDDEN\",\"message\":\"Administrator access required.\",\"fields\":{}}");
                })).build();
    }
    @Bean CorsConfigurationSource cors(@Value("${pantry.cors-origins}") String origins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList());
        config.setAllowedMethods(List.of("GET","POST","PATCH","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type"));
        config.setAllowCredentials(false);
        var source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",config); return source;
    }
}
