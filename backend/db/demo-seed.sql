-- Optional demonstration data, copied from Main.java. NOT a real stock count.
-- Run once after V1, in a development project only. Existing IDs are left unchanged.
begin;
select pg_advisory_xact_lock(250,1001);
with inserted as (
  insert into pantry.item_lots(item_id,name,category,quantity,expiration_date) values
    (101,'Rice','Food',20,'2027-12-31'),
    (102,'Pasta','Food',15,'2027-06-30'),
    (103,'Canned Beans','Food',10,'2027-08-15'),
    (104,'Wheat Flour','Food',12,'2027-04-10'),
    (105,'Fresh Milk','Food',3,'2026-11-15'),
    (106,'Whole Bread','Food',8,'2026-10-28'),
    (107,'Canned Tomato Soup','Food',4,'2026-09-01'),
    (108,'Cooking Oil','Food',10,'2027-10-01'),
    (201,'Shampoo','Hygiene',7,null),
    (202,'Bar Soap','Hygiene',15,null),
    (203,'Toothpaste','Hygiene',2,null),
    (204,'Toothbrush','Hygiene',12,null),
    (205,'Laundry Detergent','Hygiene',8,null),
    (206,'Dish Soap','Hygiene',10,null),
    (207,'Toilet Paper','Hygiene',20,null),
    (208,'Sanitary Pads','Hygiene',10,null)
  on conflict(item_id) do nothing
  returning item_id,quantity
)
insert into pantry.stock_movements(item_id,delta,reason) select item_id,quantity,'INITIAL' from inserted;
commit;
