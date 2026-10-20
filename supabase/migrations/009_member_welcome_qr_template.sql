update public.message_templates legacy
set template_key = 'member_welcome_qr',
    name = 'Member QR pass',
    body = 'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.'
where legacy.template_key = 'member_pass'
  and legacy.channel = 'whatsapp'
  and not exists (
    select 1
    from public.message_templates current_template
    where current_template.gym_id = legacy.gym_id
      and current_template.template_key = 'member_welcome_qr'
  );

update public.message_templates
set is_active = false
where template_key = 'member_pass'
  and channel = 'whatsapp';

insert into public.message_templates (gym_id, name, template_key, body, channel, is_active)
select
  gym.id,
  'Member QR pass',
  'member_welcome_qr',
  'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.',
  'whatsapp',
  true
from public.gyms gym
on conflict (gym_id, template_key) do update
set name = excluded.name,
    body = excluded.body,
    channel = excluded.channel;

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
    'member_welcome_qr',
    'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.',
    'whatsapp',
    true
  )
  on conflict (gym_id, template_key) do nothing;
  return new;
end;
$$;
