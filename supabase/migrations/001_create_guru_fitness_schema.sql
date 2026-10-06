create extension if not exists pgcrypto;

create table if not exists gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null default 'Dhule',
  state text not null default 'Maharashtra',
  country text not null default 'India',
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, profile_id)
);

create table if not exists membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gym_id, name)
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_code text not null,
  full_name text not null,
  phone text not null,
  photo_url text,
  plan_id uuid references membership_plans(id),
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired', 'frozen', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, member_code)
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  plan_id uuid not null references membership_plans(id),
  start_date date not null,
  expiry_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'upi', 'card', 'bank_transfer')),
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired', 'frozen', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_date >= start_date)
);

create table if not exists membership_freezes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  start_date date not null,
  end_date date,
  reason text,
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  attendance_date date not null,
  check_in_time time with time zone not null,
  status text not null default 'present' check (status in ('present', 'late', 'manual_override')),
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (gym_id, member_id, attendance_date)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  receipt_number text not null,
  amount numeric(12,2) not null check (amount >= 0),
  payment_date date not null,
  payment_method text not null check (payment_method in ('cash', 'upi', 'card', 'bank_transfer')),
  reference text,
  collected_by uuid references profiles(id),
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed', 'refunded')),
  notes text,
  created_at timestamptz not null default now(),
  unique (gym_id, receipt_number)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  full_name text not null,
  phone text,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'lost')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lead_followups (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  followup_date timestamptz not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'call', 'sms', 'in_person')),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'sms', 'email')),
  template text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  name text not null,
  template_key text not null,
  body text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'sms', 'email')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gym_id, template_key)
);

create table if not exists message_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  template_id uuid references message_templates(id),
  provider text not null default 'whatsapp',
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'delivered')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null,
  category text not null,
  vendor text,
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references gyms(id) on delete cascade,
  actor_id uuid references profiles(id),
  action text not null,
  entity_name text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_gym_id on profiles(gym_id);
create index if not exists idx_staff_gym_id on staff(gym_id);
create index if not exists idx_members_gym_id on members(gym_id);
create index if not exists idx_memberships_member_id on memberships(member_id);
create index if not exists idx_memberships_gym_id on memberships(gym_id);
create index if not exists idx_attendance_member_date on attendance(gym_id, member_id, attendance_date);
create index if not exists idx_payments_member_date on payments(gym_id, member_id, payment_date);
create index if not exists idx_leads_gym_id on leads(gym_id);
create index if not exists idx_notifications_gym_id on notifications(gym_id);
create index if not exists idx_message_logs_member_id on message_logs(member_id);
create index if not exists idx_expenses_gym_id on expenses(gym_id);
create index if not exists idx_audit_logs_gym_id on audit_logs(gym_id);
