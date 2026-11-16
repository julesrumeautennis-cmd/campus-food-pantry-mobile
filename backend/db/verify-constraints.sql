-- Read-only outcome: all fixture rows roll back. No email or Auth API is called.
-- Run with the migration/admin connection, never the mobile key.
begin;
select pg_advisory_xact_lock(250,1001);
do $$
declare test_user uuid := gen_random_uuid(); week_start date := date_trunc('week',current_date)::date;
begin
  insert into auth.users(id) values(test_user);
  insert into pantry.profiles(user_id,display_name) values(test_user,'Transient database constraint check');
  begin
    insert into pantry.weekly_quotas(user_id,week_start_date,approved_units) values(test_user,week_start,6);
    raise exception 'FAILED: quota above five was accepted';
  exception when check_violation then null; end;
  begin
    insert into pantry.weekly_quotas(user_id,week_start_date,approved_units) values(test_user,week_start+1,1);
    raise exception 'FAILED: non-Monday week was accepted';
  exception when check_violation then null; end;
  begin
    update pantry.item_lots set quantity=-1 where item_id=101;
    raise exception 'FAILED: negative stock was accepted';
  exception when check_violation then null; end;
  begin
    insert into pantry.requests(id,user_id,status,total_units,idempotency_key,decided_at,decided_by,decision_reason)
      values(-101,test_user,'DECLINED',1,gen_random_uuid(),now(),test_user,null);
    raise exception 'FAILED: null decline reason was accepted';
  exception when check_violation then null; end;
  begin
    insert into pantry.requests(id,user_id,status,total_units,idempotency_key)
      values(-102,test_user,'APPROVED',1,gen_random_uuid());
    raise exception 'FAILED: approval without decision metadata was accepted';
  exception when check_violation then null; end;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='pantry' and c.relkind='r'
      and (not c.relrowsecurity or has_table_privilege('anon',c.oid,'SELECT') or has_table_privilege('authenticated',c.oid,'SELECT'))) then
    raise exception 'FAILED: private table protection is missing';
  end if;
end $$;
rollback;
select 'PASS: five database constraints and private-table grants; fixtures rolled back' as verification;
