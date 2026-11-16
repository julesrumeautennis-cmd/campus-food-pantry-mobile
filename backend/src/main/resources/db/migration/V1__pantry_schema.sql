-- Private business schema. Authentication is managed by Supabase, not Java passwords.
create schema if not exists pantry;
revoke all on schema pantry from public, anon, authenticated;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='pantry_backend') then
    create role pantry_backend nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end $$;

create table pantry.profiles (
  user_id uuid primary key references auth.users(id),
  display_name varchar(80) not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table pantry.item_lots (
  item_id integer primary key check (item_id > 0),
  name varchar(120) not null check (length(trim(name)) > 0),
  category varchar(16) not null check (category in ('Food','Hygiene')),
  quantity integer not null check (quantity >= 0),
  expiration_date date,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create sequence pantry.request_ids as integer start with 1001 maxvalue 2147483646 no cycle;
create table pantry.requests (
  id integer primary key default nextval('pantry.request_ids'),
  user_id uuid not null references pantry.profiles(user_id),
  queue_sequence bigint generated always as identity unique,
  status varchar(16) not null default 'PENDING' check (status in ('PENDING','APPROVED','DECLINED')),
  total_units integer not null check (total_units between 1 and 5),
  idempotency_key uuid not null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references pantry.profiles(user_id),
  decision_reason varchar(500),
  unique(user_id, idempotency_key),
  check ((status='PENDING' and decided_at is null and decided_by is null) or
         (status<>'PENDING' and decided_at is not null and decided_by is not null)),
  check (status<>'DECLINED' or (decision_reason is not null and length(trim(decision_reason)) > 0))
);
create index requests_user_time on pantry.requests(user_id, submitted_at desc);
create index requests_fifo_pending on pantry.requests(queue_sequence) where status='PENDING';
create index requests_decided_by on pantry.requests(decided_by) where decided_by is not null;
create table pantry.request_lines (
  request_id integer not null references pantry.requests(id),
  item_id integer not null references pantry.item_lots(item_id),
  quantity integer not null check (quantity between 1 and 5),
  item_name varchar(120) not null,
  category varchar(16) not null,
  expiration_date date,
  primary key(request_id,item_id)
);
create index request_lines_item on pantry.request_lines(item_id);
create table pantry.weekly_quotas (
  user_id uuid not null references pantry.profiles(user_id),
  week_start_date date not null check (extract(isodow from week_start_date)=1),
  approved_units integer not null check (approved_units between 0 and 5),
  primary key(user_id,week_start_date)
);
create table pantry.stock_movements (
  id bigint generated always as identity primary key,
  item_id integer not null references pantry.item_lots(item_id),
  delta integer not null,
  reason varchar(32) not null check (reason in ('INITIAL','RESTOCK','APPROVAL','EXPIRED_REMOVAL')),
  actor_id uuid references pantry.profiles(user_id),
  request_id integer references pantry.requests(id),
  created_at timestamptz not null default now(),
  unique(request_id,item_id)
);
create index movements_item_time on pantry.stock_movements(item_id,created_at desc);
create index movements_actor on pantry.stock_movements(actor_id) where actor_id is not null;
create table pantry.inspection_logs (
  id bigint generated always as identity primary key,
  author_id uuid not null references pantry.profiles(user_id),
  hygiene varchar(2000) not null,
  damaged_products varchar(2000) not null,
  cleanliness varchar(2000) not null,
  notes varchar(4000) not null default '',
  created_at timestamptz not null default now()
);
create index inspections_author_time on pantry.inspection_logs(author_id,created_at desc);

-- JDBC authenticates as a server role, not the member. API enforces JWT ownership.
grant usage on schema pantry to pantry_backend;
grant select,insert,update on pantry.profiles,pantry.item_lots,pantry.requests,pantry.weekly_quotas to pantry_backend;
grant select,insert on pantry.request_lines,pantry.stock_movements,pantry.inspection_logs to pantry_backend;
grant usage,select on all sequences in schema pantry to pantry_backend;
do $$ declare t text; begin
  foreach t in array array['profiles','item_lots','requests','request_lines','weekly_quotas','stock_movements','inspection_logs'] loop
    execute format('alter table pantry.%I enable row level security',t);
    execute format('create policy backend_only on pantry.%I to pantry_backend using (true) with check (true)',t);
    execute format('revoke all on pantry.%I from public,anon,authenticated',t);
  end loop;
end $$;
alter default privileges in schema pantry revoke all on tables from public,anon,authenticated;
alter default privileges in schema pantry revoke execute on functions from public,anon,authenticated;
