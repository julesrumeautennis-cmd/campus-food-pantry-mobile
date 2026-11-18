-- Applied as provision_pantry_runtime_login after Jules explicitly approved provisioning.
-- Historical provisioning script: do not rerun or rotate the existing credential.
-- Execute as the project administrator; never run this with the application login.
-- The password is generated inside PostgreSQL, stored in Vault, and never returned.
do $provision$
declare generated_password text;
begin
  if exists (select 1 from pg_roles where rolname = 'pantry_app') then
    raise exception 'pantry_app already exists; refusing to replace its credentials';
  end if;
  if exists (select 1 from vault.secrets where name = 'pantry_render_database_password') then
    raise exception 'Runtime secret already exists; refusing to overwrite it';
  end if;
  generated_password := encode(extensions.gen_random_bytes(32), 'hex');
  execute format('create role pantry_app login inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls connection limit 5 password %L', generated_password);
  grant pantry_backend to pantry_app;
  grant connect on database postgres to pantry_app;
  perform vault.create_secret(generated_password, 'pantry_render_database_password', 'Dedicated pantry_app JDBC credential for the Campus Food Pantry Render backend. Never expose to mobile or Git.');
end
$provision$;
alter role pantry_app set search_path = pantry, pg_catalog;
alter role pantry_app set statement_timeout = '15s';
alter role pantry_app set idle_in_transaction_session_timeout = '15s';
revoke all on schema vault from pantry_app;
revoke all on vault.secrets, vault.decrypted_secrets from pantry_app;
