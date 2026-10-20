create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  member_code text,
  event_type text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_log_gym_created
  on public.notification_log (gym_id, created_at desc);
create index if not exists idx_notification_log_member_created
  on public.notification_log (member_id, created_at desc);

revoke update on public.profiles from authenticated;
revoke update (id, gym_id, role) on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;

alter table public.notification_log enable row level security;
grant select, insert on public.notification_log to authenticated;

drop policy if exists "Gym staff can read notification logs" on public.notification_log;
create policy "Gym staff can read notification logs"
  on public.notification_log for select to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.gym_id = notification_log.gym_id
        and profile.role in ('owner', 'admin', 'staff')
    )
  );

drop policy if exists "Gym staff can insert notification logs" on public.notification_log;
create policy "Gym staff can insert notification logs"
  on public.notification_log for insert to authenticated
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.gym_id = notification_log.gym_id
        and profile.role in ('owner', 'admin', 'staff')
    )
  );

create or replace function public.seed_member_pass_template_for_gym()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_templates (gym_id, name, template_key, body, channel, is_active)
  values (
    new.id,
    'Member QR pass',
    'member_pass',
    'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.',
    'whatsapp',
    true
  )
  on conflict (gym_id, template_key) do nothing;
  return new;
end;
$$;

drop trigger if exists seed_member_pass_template_after_gym_insert on public.gyms;
create trigger seed_member_pass_template_after_gym_insert
  after insert on public.gyms
  for each row execute function public.seed_member_pass_template_for_gym();

insert into public.message_templates (gym_id, name, template_key, body, channel, is_active)
select
  gym.id,
  'Member QR pass',
  'member_pass',
  'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.',
  'whatsapp',
  true
from public.gyms gym
on conflict (gym_id, template_key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-passes', 'qr-passes', false, 1048576, array['image/png'])
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Gym staff can read QR passes" on storage.objects;
create policy "Gym staff can read QR passes"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'qr-passes'
    and exists (
      select 1
      from public.profiles profile
      join public.members member on member.gym_id = profile.gym_id
      where profile.id = auth.uid()
        and profile.role in ('owner', 'admin', 'staff')
        and (member.id::text || '.png') = storage.objects.name
    )
  );

drop policy if exists "Gym staff can upload QR passes" on storage.objects;
create policy "Gym staff can upload QR passes"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'qr-passes'
    and exists (
      select 1
      from public.profiles profile
      join public.members member on member.gym_id = profile.gym_id
      where profile.id = auth.uid()
        and profile.role in ('owner', 'admin', 'staff')
        and (member.id::text || '.png') = storage.objects.name
    )
  );

drop policy if exists "Gym staff can update QR passes" on storage.objects;
create policy "Gym staff can update QR passes"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'qr-passes'
    and exists (
      select 1
      from public.profiles profile
      join public.members member on member.gym_id = profile.gym_id
      where profile.id = auth.uid()
        and profile.role in ('owner', 'admin', 'staff')
        and (member.id::text || '.png') = storage.objects.name
    )
  )
  with check (
    bucket_id = 'qr-passes'
    and exists (
      select 1
      from public.profiles profile
      join public.members member on member.gym_id = profile.gym_id
      where profile.id = auth.uid()
        and profile.role in ('owner', 'admin', 'staff')
        and (member.id::text || '.png') = storage.objects.name
    )
  );
