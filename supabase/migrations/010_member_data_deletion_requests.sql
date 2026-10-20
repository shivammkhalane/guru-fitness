alter table public.members
  add column if not exists whatsapp_pass_consent boolean not null default false;

create table if not exists public.member_data_requests (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  request_type text not null check (request_type = 'account_deletion'),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_member_data_requests_gym_created
  on public.member_data_requests (gym_id, created_at desc);
create index if not exists idx_member_data_requests_requester_created
  on public.member_data_requests (requested_by, created_at desc);
create unique index if not exists idx_member_data_requests_open_member
  on public.member_data_requests (member_id)
  where member_id is not null and status in ('pending', 'in_review');

alter table public.member_data_requests enable row level security;
revoke all on public.member_data_requests from anon, authenticated;
grant select (
  id, gym_id, member_id, requested_by, request_type, status, created_at, updated_at
) on public.member_data_requests to authenticated;
grant insert (gym_id, member_id, requested_by, request_type)
  on public.member_data_requests to authenticated;
grant update (status, updated_at) on public.member_data_requests to authenticated;

drop policy if exists "Members and staff can read gym data requests" on public.member_data_requests;
create policy "Members and staff can read gym data requests"
  on public.member_data_requests for select to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.gym_id = member_data_requests.gym_id
        and profile.role in ('owner', 'admin', 'staff')
    )
  );

drop policy if exists "Members can submit own deletion requests" on public.member_data_requests;
create policy "Members can submit own deletion requests"
  on public.member_data_requests for insert to authenticated
  with check (
    requested_by = auth.uid()
    and request_type = 'account_deletion'
    and status = 'pending'
    and exists (
      select 1
      from public.members member
      where member.id = member_data_requests.member_id
        and member.gym_id = member_data_requests.gym_id
        and member.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Gym owners and admins can review data requests" on public.member_data_requests;
create policy "Gym owners and admins can review data requests"
  on public.member_data_requests for update to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.gym_id = member_data_requests.gym_id
        and profile.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.gym_id = member_data_requests.gym_id
        and profile.role in ('owner', 'admin')
    )
  );
