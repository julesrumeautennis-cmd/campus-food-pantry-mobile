package edu.roosevelt.pantry.api;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public final class Inputs {
    private Inputs() {}
    public record Profile(@NotBlank @Size(max=80) String displayName) {}
    public record Line(@Positive int itemId, @Min(1) @Max(5) int quantity) {}
    public record Submit(@NotNull UUID idempotencyKey, @NotEmpty @Size(max=5) List<@Valid Line> lines) {}
    public record Decision(@NotNull @Pattern(regexp="APPROVE|DECLINE") String action, @Size(max=500) String reason) {}
    public record NewItem(@Positive int itemId, @NotBlank @Size(max=120) String name,
        @NotNull @Pattern(regexp="Food|Hygiene") String category, @PositiveOrZero int quantity, LocalDate expirationDate) {}
    public record Restock(@Positive int quantity) {}
    public record Inspection(@NotBlank @Size(max=2000) String hygiene,
        @NotBlank @Size(max=2000) String damagedProducts, @NotBlank @Size(max=2000) String cleanliness,
        @NotNull @Size(max=4000) String notes) {}
}
