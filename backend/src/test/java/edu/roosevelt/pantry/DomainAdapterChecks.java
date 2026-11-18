package edu.roosevelt.pantry;

import edu.roosevelt.pantry.domain.*;
import java.time.LocalDate;
import java.util.*;

/** Runnable without Spring or Maven; specifically exercises the persistence constructor. */
public class DomainAdapterChecks {
    static int checks;
    static void check(boolean value,String message) { if(!value) throw new AssertionError(message); checks++; }
    public static void main(String[] args) {
        var monday=LocalDate.of(2026,11,9); var inv=new Inventory(5);
        var rice=new Item(101,"Rice","Food",4,monday.plusDays(1)); var soap=new Item(202,"Soap","Hygiene",1,null);
        inv.addItem(soap); inv.addItem(rice);
        var alice=new Student("alice","Alice"); var bob=new Student("bob","Bob");
        alice.recordItemsTaken(3,monday); bob.resetWeekIfNeeded(monday);
        var a=new Request(1500,"alice",Map.of(101,2)); var b=new Request(1501,"bob",Map.of(101,3));
        var manager=new RequestManager(inv,Map.of("alice",alice,"bob",bob),1700,List.of(a,b));
        check(manager.peekNextRequest()==a,"Restored FIFO must preserve arrival order.");
        var c=manager.submitRequest("bob",Map.of(202,1));
        check(c.getRequestId()==1700,"Database sequence must determine the new ID.");
        var staff=new Staff("admin","Jules","ADMIN");
        check(manager.approveNextRequest(staff,monday),"First request should approve.");
        check(alice.getItemsTakenThisWeek()==5 && rice.getQuantity()==2,"Stock and quota must reflect restored usage.");
        check(!manager.approveNextRequest(staff,monday),"Second request exceeds remaining stock.");
        check("DECLINED".equals(b.getStatus()) && !b.getDecisionReason().isBlank(),"Decline reason must be retained.");
        check(rice.getQuantity()==2 && bob.getItemsTakenThisWeek()==0,"Decline must change neither stock nor quota.");
        check(manager.approveNextRequest(staff,monday),"FIFO must continue after a decline.");
        check(soap.getQuantity()==0 && bob.getItemsTakenThisWeek()==1,"Following request must be applied exactly once.");
        check(!manager.approveNextRequest(staff,monday) && bob.getItemsTakenThisWeek()==1,"Empty queue cannot repeat a decision.");
        check(alice.getRemainingWeeklyAllowance(monday.plusDays(7))==5,"Next Monday resets allowance.");
        check(!rice.isExpired(monday.plusDays(1)) && rice.isExpired(monday.plusDays(2)),"Expiry day itself remains valid.");
        inv.sortItemsByName(); check(inv.getItems().getFirst()==rice,"Bubble Sort must preserve Item identity.");
        check(inv.searchByName("rIcE").getFirst()==rice && inv.findById(101)==rice,"Search and map must use the same object.");
        check(inv.removeExpiredItems(monday.plusDays(2)).size()==1 && inv.findById(101)==null,"Expired removal must update both collections.");
        try { new RequestManager(inv,Map.of(),1800,List.of(a)); throw new AssertionError("Terminal request restored."); }
        catch(IllegalArgumentException expected) { checks++; }
        System.out.println("Domain adapter checks: "+checks+" passed.");
    }
}
