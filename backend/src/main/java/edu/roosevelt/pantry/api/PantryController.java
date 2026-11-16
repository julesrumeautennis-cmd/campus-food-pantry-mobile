package edu.roosevelt.pantry.api;

import edu.roosevelt.pantry.service.PantryService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class PantryController {
    private final PantryService service;
    public PantryController(PantryService service) { this.service=service; }
    @GetMapping("/health") public Object health() { return Map.of("status","ok"); }
    @GetMapping("/api/v1/me") public Object me(@AuthenticationPrincipal Jwt jwt) { return service.me(jwt); }
    @PatchMapping("/api/v1/me") public Object me(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inputs.Profile input) { return service.updateProfile(jwt,input); }
    @GetMapping("/api/v1/items") public Object items(@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String category,@RequestParam(defaultValue="name") String sort) { return service.items(search,category,sort); }
    @GetMapping("/api/v1/items/{id}") public Object item(@PathVariable int id) { return service.item(id); }
    @PostMapping("/api/v1/requests") public Object submit(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inputs.Submit input) { return service.submit(jwt,input); }
    @GetMapping("/api/v1/requests/mine") public Object mine(@AuthenticationPrincipal Jwt jwt) { return service.mine(jwt); }
    @GetMapping("/api/v1/requests/{id}") public Object request(@AuthenticationPrincipal Jwt jwt,@PathVariable int id) { return service.request(jwt,id); }
    @GetMapping("/api/v1/admin/requests") public Object queue(@AuthenticationPrincipal Jwt jwt) { return service.queue(jwt); }
    @PostMapping("/api/v1/admin/requests/{id}/decision") public Object decide(@AuthenticationPrincipal Jwt jwt,@PathVariable int id,@Valid @RequestBody Inputs.Decision input) { return service.decide(jwt,id,input); }
    @PostMapping("/api/v1/admin/items") public Object add(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inputs.NewItem input) { return service.addItem(jwt,input); }
    @PostMapping("/api/v1/admin/items/{id}/restocks") public Object restock(@AuthenticationPrincipal Jwt jwt,@PathVariable int id,@Valid @RequestBody Inputs.Restock input) { return service.restock(jwt,id,input); }
    @PostMapping("/api/v1/admin/inventory/remove-expired") public Object expired(@AuthenticationPrincipal Jwt jwt) { return service.removeExpired(jwt); }
    @GetMapping("/api/v1/admin/stock-movements") public Object movements(@AuthenticationPrincipal Jwt jwt) { return service.movements(jwt); }
    @GetMapping("/api/v1/admin/reports/inventory") public Object report(@AuthenticationPrincipal Jwt jwt) { return service.report(jwt); }
    @GetMapping("/api/v1/admin/inspections") public Object inspections(@AuthenticationPrincipal Jwt jwt) { return service.inspections(jwt); }
    @PostMapping("/api/v1/admin/inspections") public Object inspect(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Inputs.Inspection input) { return service.inspect(jwt,input); }
}
