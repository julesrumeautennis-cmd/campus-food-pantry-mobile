package edu.roosevelt.pantry.service;

import edu.roosevelt.pantry.api.*;
import edu.roosevelt.pantry.domain.*;
import edu.roosevelt.pantry.security.AccessPolicy;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Small pantry: serialize operations across API instances, then call the original Java domain. */
@Service
@Transactional
public class PantryService {
    private final JdbcTemplate db;
    private final AccessPolicy access;
    private final Clock clock;
    private final Object dateKey=new Object();
    public PantryService(JdbcTemplate db, AccessPolicy access, Clock clock) { this.db=db; this.access=access; this.clock=clock; }

    // Transaction-scoped, released on COMMIT/ROLLBACK. Acquire BEFORE any business reads.
    private void lock() {
        db.execute("select pg_advisory_xact_lock(250, 1001)");
        // Freeze the business day AFTER waiting for the lock; never split one approval across weeks.
        if(!TransactionSynchronizationManager.hasResource(dateKey)) {
            TransactionSynchronizationManager.bindResource(dateKey,LocalDate.now(clock));
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(dateKey); }
            });
        }
    }
    private LocalDate today() { return (LocalDate)Objects.requireNonNull(TransactionSynchronizationManager.getResource(dateKey)); }
    private LocalDate monday() { return today().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)); }
    private UUID profile(Jwt jwt) {
        var id=access.user(jwt);
        String displayName="Pantry member";
        Object metadata=jwt.getClaim("user_metadata");
        if(metadata instanceof Map<?,?> values && values.get("display_name") instanceof String provided && !provided.isBlank()) {
            displayName=provided.trim();
            if(displayName.length()>80) displayName=displayName.substring(0,80);
        }
        db.update("insert into pantry.profiles(user_id,display_name) values (?,?) on conflict(user_id) do nothing",id,displayName);
        return id;
    }
    private String name(UUID id) { return db.queryForObject("select display_name from pantry.profiles where user_id=?",String.class,id); }
    private Student student(UUID id) {
        var student=new Student(id.toString(),name(id));
        student.resetWeekIfNeeded(today());
        var quotas=db.queryForList("select approved_units from pantry.weekly_quotas where user_id=? and week_start_date=?",Integer.class,id,monday());
        if (!quotas.isEmpty() && quotas.getFirst()>0) student.recordItemsTaken(quotas.getFirst(),today());
        return student;
    }
    private Inventory inventory() {
        var inventory=new Inventory(5);
        db.query("select * from pantry.item_lots where removed_at is null order by item_id",rs -> {
            inventory.addItem(new Item(rs.getInt("item_id"),rs.getString("name"),rs.getString("category"),
                rs.getInt("quantity"),rs.getObject("expiration_date",LocalDate.class)));
        });
        return inventory;
    }
    private Map<String,Object> itemView(Item item) {
        var result=new LinkedHashMap<String,Object>();
        result.put("itemId",item.getItemId()); result.put("name",item.getName()); result.put("category",item.getCategory());
        result.put("quantity",item.getQuantity()); result.put("expirationDate",item.getExpirationDate());
        result.put("availability",item.isExpired(today()) ? "EXPIRED" : item.getQuantity()==0 ? "OUT_OF_STOCK" : item.getQuantity()<5 ? "LOW_STOCK" : "IN_STOCK");
        return result;
    }
    private Map<Integer,Integer> lines(int requestId) {
        var cart=new LinkedHashMap<Integer,Integer>();
        db.query("select item_id,quantity from pantry.request_lines where request_id=? order by item_id",
            rs -> { cart.put(rs.getInt(1),rs.getInt(2)); },requestId);
        return cart;
    }
    private Map<String,Object> requestView(int id) {
        var rows=db.queryForList("select r.*,p.display_name from pantry.requests r join pantry.profiles p on p.user_id=r.user_id where r.id=?",id);
        if (rows.isEmpty()) throw ApiError.missing();
        var row=rows.getFirst();
        var result=new LinkedHashMap<String,Object>();
        result.put("id",id); result.put("userId",row.get("user_id")); result.put("displayName",row.get("display_name"));
        result.put("status",row.get("status")); result.put("totalUnits",row.get("total_units"));
        result.put("submittedAt",row.get("submitted_at")); result.put("decidedAt",row.get("decided_at"));
        result.put("decisionReason",row.get("decision_reason"));
        result.put("lines",db.query("select * from pantry.request_lines where request_id=? order by item_id",(rs,n) -> {
            var line=new LinkedHashMap<String,Object>(); line.put("itemId",rs.getInt("item_id")); line.put("quantity",rs.getInt("quantity"));
            line.put("name",rs.getString("item_name")); line.put("category",rs.getString("category"));
            line.put("expirationDate",rs.getObject("expiration_date",LocalDate.class)); return line;
        },id));
        return result;
    }
    private void movement(int itemId,int delta,String reason,UUID actor,Integer requestId) {
        db.update("insert into pantry.stock_movements(item_id,delta,reason,actor_id,request_id) values(?,?,?,?,?)",itemId,delta,reason,actor,requestId);
    }

    public Map<String,Object> me(Jwt jwt) {
        lock(); var id=profile(jwt); var student=student(id);
        return Map.of("userId",id,"displayName",student.getName(),"role",access.isAdmin(jwt)?"ADMIN":"MEMBER",
            "weeklyLimit",5,"approvedUnits",student.getItemsTakenThisWeek(),"remainingUnits",student.getRemainingWeeklyAllowance(today()),
            "weekStart",monday(),"resetsOn",monday().plusDays(7),"timeZone","America/Chicago");
    }
    public Map<String,Object> updateProfile(Jwt jwt, Inputs.Profile input) {
        lock(); var id=profile(jwt);
        db.update("update pantry.profiles set display_name=?,updated_at=now() where user_id=?",input.displayName().trim(),id);
        return me(jwt);
    }
    public List<Map<String,Object>> items(String search,String category,String sort) {
        lock(); var inv=inventory();
        if (!Set.of("id","name").contains(sort)) throw new IllegalArgumentException("Unknown sort.");
        if (!category.isBlank() && !Set.of("Food","Hygiene").contains(category)) throw new IllegalArgumentException("Unknown category.");
        if (sort.equals("name")) inv.sortItemsByName(); // Original Bubble Sort.
        var selected=search.isBlank() ? inv.getItems() : inv.searchByName(search); // Original linear search.
        return selected.stream().filter(i -> category.isBlank() || category.equals(i.getCategory())).map(this::itemView).toList();
    }
    public Map<String,Object> item(int id) {
        lock(); var item=inventory().findById(id); if(item==null) throw ApiError.missing(); return itemView(item);
    }
    public Map<String,Object> submit(Jwt jwt,Inputs.Submit input) {
        lock(); var user=profile(jwt); var cart=new TreeMap<Integer,Integer>();
        for(var line:input.lines()) if(cart.putIfAbsent(line.itemId(),line.quantity())!=null) throw new IllegalArgumentException("Duplicate item.");
        var existing=db.queryForList("select id from pantry.requests where user_id=? and idempotency_key=?",Integer.class,user,input.idempotencyKey());
        if (!existing.isEmpty()) {
            int id=existing.getFirst();
            if(!lines(id).equals(cart)) throw ApiError.conflict("This submission key was already used for a different basket.");
            return requestView(id);
        }
        int total=cart.values().stream().mapToInt(Integer::intValue).sum();
        var student=student(user);
        if(!student.canRequestItems(total,today())) throw ApiError.conflict("This basket exceeds your remaining weekly allowance.");
        var inv=inventory();
        for(var line:cart.entrySet()) {
            var item=inv.findById(line.getKey());
            if(item==null || item.isExpired(today()) || item.getQuantity()<line.getValue())
                throw ApiError.conflict("An item is no longer available in the requested quantity. Refresh your basket.");
        }
        int id=Objects.requireNonNull(db.queryForObject("select nextval('pantry.request_ids')",Integer.class));
        var manager=new RequestManager(inv,Map.of(user.toString(),student),id,List.of());
        var request=manager.submitRequest(user.toString(),cart);
        db.update("insert into pantry.requests(id,user_id,total_units,idempotency_key) values(?,?,?,?)",
            request.getRequestId(),user,request.getTotalUnits(),input.idempotencyKey());
        for(var line:cart.entrySet()) {
            var item=inv.findById(line.getKey());
            db.update("insert into pantry.request_lines(request_id,item_id,quantity,item_name,category,expiration_date) values(?,?,?,?,?,?)",
                id,item.getItemId(),line.getValue(),item.getName(),item.getCategory(),item.getExpirationDate());
        }
        return requestView(id);
    }
    public List<Map<String,Object>> mine(Jwt jwt) {
        lock(); var user=profile(jwt);
        return db.queryForList("select id from pantry.requests where user_id=? order by queue_sequence desc",Integer.class,user).stream().map(this::requestView).toList();
    }
    public Map<String,Object> request(Jwt jwt,int id) {
        lock(); var view=requestView(id);
        if(!access.isAdmin(jwt) && !access.user(jwt).equals(view.get("userId"))) throw ApiError.missing();
        return view;
    }
    public List<Map<String,Object>> queue(Jwt jwt) {
        access.requireAdmin(jwt); lock();
        return db.queryForList("select id from pantry.requests order by case when status='PENDING' then 0 else 1 end,queue_sequence",Integer.class)
            .stream().map(this::requestView).toList();
    }
    public Map<String,Object> decide(Jwt jwt,int expectedId,Inputs.Decision input) {
        access.requireAdmin(jwt); lock(); var admin=profile(jwt);
        var view=requestView(expectedId);
        // A retry can only return this same request, never process the next queue entry.
        if(!"PENDING".equals(view.get("status"))) return view;
        var ids=db.queryForList("select id from pantry.requests where status='PENDING' order by queue_sequence",Integer.class);
        if(ids.isEmpty() || ids.getFirst()!=expectedId) throw ApiError.conflict("Process the oldest pending request first. Refresh the queue.");
        var students=new HashMap<String,Student>(); var pending=new ArrayList<Request>();
        for(int id:ids) {
            var owner=db.queryForObject("select user_id from pantry.requests where id=?",UUID.class,id);
            students.computeIfAbsent(owner.toString(),key -> student(owner));
            pending.add(new Request(id,owner.toString(),lines(id)));
        }
        var inv=inventory(); var manager=new RequestManager(inv,students,1001,pending);
        var request=manager.peekNextRequest(); var staff=new Staff(admin.toString(),name(admin),"ADMIN");
        if(input.action().equals("DECLINE")) {
            if(input.reason()==null || input.reason().isBlank()) throw new ApiError(400,"REASON_REQUIRED","Please provide a decline reason.");
            manager.declineNextRequest(staff,input.reason().trim());
        } else manager.approveNextRequest(staff,today());
        if("APPROVED".equals(request.getStatus())) {
            for(var line:request.getRequestedQuantities().entrySet()) {
                db.update("update pantry.item_lots set quantity=? where item_id=?",inv.findById(line.getKey()).getQuantity(),line.getKey());
                movement(line.getKey(),-line.getValue(),"APPROVAL",admin,expectedId);
            }
            var member=students.get(request.getStudentId());
            db.update("insert into pantry.weekly_quotas(user_id,week_start_date,approved_units) values(?,?,?) on conflict(user_id,week_start_date) do update set approved_units=excluded.approved_units",
                UUID.fromString(member.getStudentId()),monday(),member.getItemsTakenThisWeek());
        }
        db.update("update pantry.requests set status=?,decided_at=now(),decided_by=?,decision_reason=? where id=? and status='PENDING'",
            request.getStatus(),admin,request.getDecisionReason(),expectedId);
        return requestView(expectedId);
    }
    public Map<String,Object> addItem(Jwt jwt,Inputs.NewItem input) {
        access.requireAdmin(jwt); lock(); var admin=profile(jwt); var inv=inventory();
        if(input.expirationDate()!=null && input.expirationDate().isBefore(today())) throw new ApiError(400,"EXPIRED_DATE","A new lot cannot already be expired.");
        var item=new Item(input.itemId(),input.name().trim(),input.category(),input.quantity(),input.expirationDate());
        inv.addItem(item);
        db.update("insert into pantry.item_lots(item_id,name,category,quantity,expiration_date) values(?,?,?,?,?)",
            item.getItemId(),item.getName(),item.getCategory(),item.getQuantity(),item.getExpirationDate());
        movement(item.getItemId(),item.getQuantity(),"INITIAL",admin,null); return itemView(item);
    }
    public Map<String,Object> restock(Jwt jwt,int id,Inputs.Restock input) {
        access.requireAdmin(jwt); lock(); var admin=profile(jwt); var inv=inventory(); var item=inv.findById(id);
        if(item==null) throw ApiError.missing();
        if(item.isExpired(today())) throw ApiError.conflict("Create a new lot for products with a new expiry date.");
        inv.restockItem(id,input.quantity());
        db.update("update pantry.item_lots set quantity=? where item_id=?",item.getQuantity(),id);
        movement(id,input.quantity(),"RESTOCK",admin,null); return itemView(item);
    }
    public Map<String,Object> removeExpired(Jwt jwt) {
        access.requireAdmin(jwt); lock(); var admin=profile(jwt); var removed=inventory().removeExpiredItems(today());
        for(var item:removed) {
            db.update("update pantry.item_lots set quantity=0,removed_at=now() where item_id=?",item.getItemId());
            movement(item.getItemId(),-item.getQuantity(),"EXPIRED_REMOVAL",admin,null);
        }
        return Map.of("removedCount",removed.size(),"removedItems",removed.stream().map(this::itemView).toList());
    }
    public List<Map<String,Object>> movements(Jwt jwt) {
        access.requireAdmin(jwt); lock();
        return db.queryForList("select m.*,i.name from pantry.stock_movements m join pantry.item_lots i on i.item_id=m.item_id order by m.id desc limit 500");
    }
    public Map<String,Object> report(Jwt jwt) {
        access.requireAdmin(jwt); lock(); var inv=inventory(); inv.sortItemsByName();
        return Map.of("asOf",today(),"totalLots",inv.getItems().size(),"totalUnits",inv.getItems().stream().mapToLong(Item::getQuantity).sum(),
            "lowStock",inv.getLowStockItems().stream().map(this::itemView).toList(),
            "outOfStock",inv.getItems().stream().filter(i->i.getQuantity()==0).map(this::itemView).toList(),
            "expired",inv.getItems().stream().filter(i->i.isExpired(today())).map(this::itemView).toList(),
            "items",inv.getItems().stream().map(this::itemView).toList());
    }
    public List<Map<String,Object>> inspections(Jwt jwt) {
        access.requireAdmin(jwt); lock();
        return db.queryForList("select l.*,p.display_name from pantry.inspection_logs l join pantry.profiles p on p.user_id=l.author_id order by l.id desc limit 200");
    }
    public Map<String,Object> inspect(Jwt jwt,Inputs.Inspection input) {
        access.requireAdmin(jwt); lock(); var admin=profile(jwt);
        long id=Objects.requireNonNull(db.queryForObject("insert into pantry.inspection_logs(author_id,hygiene,damaged_products,cleanliness,notes) values(?,?,?,?,?) returning id",
            Long.class,admin,input.hygiene().trim(),input.damagedProducts().trim(),input.cleanliness().trim(),input.notes().trim()));
        return Map.of("id",id);
    }
}
