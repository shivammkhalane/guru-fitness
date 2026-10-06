-- Add opaque QR attendance token to members table
alter table members add column if not exists qr_token uuid default gen_random_uuid();

-- Backfill any existing members where qr_token is null
update members set qr_token = gen_random_uuid() where qr_token is null;

-- Enforce not null and uniqueness
alter table members alter column qr_token set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_qr_token_key'
  ) then
    alter table members add constraint members_qr_token_key unique (qr_token);
  end if;
end $$;

-- Index for instant lookup on scan
create index if not exists idx_members_gym_qr_token on members(gym_id, qr_token);
