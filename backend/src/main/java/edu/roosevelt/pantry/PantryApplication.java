package edu.roosevelt.pantry;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class PantryApplication {
    public static void main(String[] args) { SpringApplication.run(PantryApplication.class, args); }
    @Bean Clock pantryClock() { return Clock.system(ZoneId.of("America/Chicago")); }
}
