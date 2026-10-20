ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS whatsapp_pass_consent boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'admin', 'staff', 'member'));

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM service_role;

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  member_code text,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  error text,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_gym_created
  ON public.notification_log (gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_member_created
  ON public.notification_log (member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type text NOT NULL CHECK (request_type = 'account_deletion'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_data_requests_gym_created
  ON public.member_data_requests (gym_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_data_requests_requester_created
  ON public.member_data_requests (requested_by, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_data_requests_open_member
  ON public.member_data_requests (member_id)
  WHERE member_id IS NOT NULL AND status IN ('pending', 'in_review');

INSERT INTO public.message_templates (gym_id, name, template_key, body, channel, is_active)
SELECT gym.id,
       'Member QR pass',
       'member_welcome_qr',
       'Your Guru Fitness membership pass is ready, {{member_name}}. It expires on {{expiry_date}}.',
       'whatsapp',
       true
FROM public.gyms AS gym
ON CONFLICT (gym_id, template_key) DO NOTHING;

DROP TRIGGER IF EXISTS seed_member_pass_template_after_gym_insert ON public.gyms;
DROP FUNCTION IF EXISTS public.seed_member_pass_template_for_gym();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('member-photos', 'member-photos', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('qr-passes', 'qr-passes', false, 1048576, ARRAY['image/png'])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.has_gym_role(p_gym_id uuid, p_allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.gym_id = p_gym_id
      AND profile.role = ANY (p_allowed_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.member_is_linked_to_current_user(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.members AS member
    WHERE member.id = p_member_id
      AND member.auth_user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.membership_matches_gym(
  p_member_id uuid,
  p_plan_id uuid,
  p_gym_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.members AS member
    JOIN public.membership_plans AS plan ON plan.id = p_plan_id
    WHERE member.id = p_member_id
      AND member.gym_id = p_gym_id
      AND plan.gym_id = p_gym_id
  );
$function$;

ALTER FUNCTION public.has_gym_role(uuid, text[]) OWNER TO postgres;
ALTER FUNCTION public.member_is_linked_to_current_user(uuid) OWNER TO postgres;
ALTER FUNCTION public.membership_matches_gym(uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_gym_role(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.member_is_linked_to_current_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.membership_matches_gym(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_gym_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_is_linked_to_current_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.membership_matches_gym(uuid, uuid, uuid) TO authenticated;

DO $migration$
DECLARE
  table_name text;
  existing_policy record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'gyms',
    'profiles',
    'staff',
    'members',
    'membership_plans',
    'memberships',
    'membership_freezes',
    'attendance',
    'payments',
    'leads',
    'lead_followups',
    'notifications',
    'message_templates',
    'message_logs',
    'expenses',
    'audit_logs',
    'notification_log',
    'member_data_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role', table_name);
  END LOOP;

  FOR existing_policy IN
    SELECT policy.polname, policy.polrelid::regclass AS relation_name
    FROM pg_policy AS policy
    WHERE policy.polrelid IN (
      'public.gyms'::regclass,
      'public.profiles'::regclass,
      'public.staff'::regclass,
      'public.members'::regclass,
      'public.membership_plans'::regclass,
      'public.memberships'::regclass,
      'public.membership_freezes'::regclass,
      'public.attendance'::regclass,
      'public.payments'::regclass,
      'public.leads'::regclass,
      'public.lead_followups'::regclass,
      'public.notifications'::regclass,
      'public.message_templates'::regclass,
      'public.message_logs'::regclass,
      'public.expenses'::regclass,
      'public.audit_logs'::regclass,
      'public.notification_log'::regclass,
      'public.member_data_requests'::regclass
    )
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %s',
      existing_policy.polname,
      existing_policy.relation_name
    );
  END LOOP;
END;
$migration$;

GRANT SELECT ON public.gyms TO authenticated;
GRANT UPDATE (name, city, updated_at) ON public.gyms TO authenticated;
GRANT SELECT ON public.gyms TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, updated_at) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

GRANT SELECT ON public.staff TO authenticated;

GRANT SELECT ON public.members TO authenticated;
GRANT INSERT (gym_id, member_code, full_name, phone, photo_url, plan_id, status, whatsapp_pass_consent)
  ON public.members TO authenticated;
GRANT UPDATE (full_name, phone, photo_url, plan_id, status, qr_token, whatsapp_pass_consent, updated_at)
  ON public.members TO authenticated;
GRANT DELETE ON public.members TO authenticated;
GRANT SELECT ON public.members TO service_role;

GRANT SELECT ON public.membership_plans TO authenticated;
GRANT INSERT (gym_id, name, duration_days, price, is_active) ON public.membership_plans TO authenticated;
GRANT UPDATE (name, duration_days, price, is_active) ON public.membership_plans TO authenticated;
GRANT DELETE ON public.membership_plans TO authenticated;
GRANT SELECT ON public.membership_plans, public.payments TO service_role;
GRANT INSERT, UPDATE ON public.notifications, public.message_logs TO service_role;

GRANT SELECT ON public.memberships TO authenticated;
GRANT INSERT (gym_id, member_id, plan_id, start_date, expiry_date, amount, payment_method, status)
  ON public.memberships TO authenticated;
GRANT UPDATE (plan_id, start_date, expiry_date, amount, payment_method, status, updated_at)
  ON public.memberships TO authenticated;
GRANT DELETE ON public.memberships TO authenticated;
GRANT SELECT ON public.memberships TO service_role;

GRANT SELECT ON public.membership_freezes TO authenticated;
GRANT INSERT (gym_id, member_id, start_date, end_date, reason) ON public.membership_freezes TO authenticated;
GRANT UPDATE (end_date, reason) ON public.membership_freezes TO authenticated;

GRANT SELECT ON public.attendance TO authenticated;
GRANT INSERT (gym_id, member_id, attendance_date, check_in_time, status, recorded_by)
  ON public.attendance TO authenticated;

GRANT SELECT ON public.payments TO authenticated;
GRANT INSERT (gym_id, member_id, receipt_number, amount, payment_date, payment_method, status, notes)
  ON public.payments TO authenticated;
GRANT UPDATE (status, notes) ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO service_role;

GRANT SELECT ON public.leads TO authenticated;
GRANT INSERT (gym_id, full_name, phone, source, status, notes) ON public.leads TO authenticated;
GRANT UPDATE (full_name, phone, source, status, notes, updated_at) ON public.leads TO authenticated;
GRANT DELETE ON public.leads TO authenticated;

GRANT SELECT ON public.lead_followups TO authenticated;
GRANT INSERT (gym_id, lead_id, followup_date, channel, notes) ON public.lead_followups TO authenticated;
GRANT DELETE ON public.lead_followups TO authenticated;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.message_templates TO authenticated;
GRANT INSERT (gym_id, name, template_key, body, channel, is_active)
  ON public.message_templates TO authenticated;
GRANT UPDATE (name, body, channel, is_active) ON public.message_templates TO authenticated;
GRANT DELETE ON public.message_templates TO authenticated;
GRANT SELECT ON public.message_templates TO service_role;
GRANT SELECT ON public.message_logs TO authenticated;

GRANT SELECT ON public.expenses TO authenticated;
GRANT INSERT (gym_id, title, amount, expense_date, category, vendor, notes)
  ON public.expenses TO authenticated;
GRANT UPDATE (title, amount, expense_date, category, vendor, notes) ON public.expenses TO authenticated;
GRANT DELETE ON public.expenses TO authenticated;

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT (gym_id, actor_id, action, entity_name, entity_id, metadata)
  ON public.audit_logs TO authenticated;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_log TO service_role;

GRANT SELECT, INSERT ON public.member_data_requests TO authenticated;
GRANT UPDATE (status, updated_at) ON public.member_data_requests TO authenticated;

CREATE POLICY gyms_read_same_gym ON public.gyms
  FOR SELECT TO authenticated
  USING (public.has_gym_role(id, ARRAY['owner', 'admin', 'staff', 'member']));
CREATE POLICY gyms_update_admin ON public.gyms
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(id, ARRAY['owner', 'admin']));

CREATE POLICY profiles_read_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY profiles_update_self_non_privileged ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY staff_read_same_gym ON public.staff
  FOR SELECT TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY members_read_gym_or_self ON public.members
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    OR auth_user_id = auth.uid()
  );
CREATE POLICY members_insert_gym_staff ON public.members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (
      plan_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.membership_plans AS plan
        WHERE plan.id = members.plan_id AND plan.gym_id = members.gym_id
      )
    )
  );
CREATE POLICY members_update_gym_staff ON public.members
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']))
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (
      plan_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.membership_plans AS plan
        WHERE plan.id = members.plan_id AND plan.gym_id = members.gym_id
      )
    )
  );
CREATE POLICY members_delete_recent_unpaid_rollback ON public.members
  FOR DELETE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND created_at > now() - interval '15 minutes'
    AND auth_user_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.payments AS payment WHERE payment.member_id = members.id)
    AND NOT EXISTS (SELECT 1 FROM public.attendance AS checkin WHERE checkin.member_id = members.id)
    AND NOT EXISTS (SELECT 1 FROM public.member_data_requests AS request WHERE request.member_id = members.id)
  );

CREATE POLICY membership_plans_read_gym_staff ON public.membership_plans
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    OR EXISTS (
      SELECT 1
      FROM public.memberships AS membership
      WHERE membership.plan_id = membership_plans.id
        AND public.member_is_linked_to_current_user(membership.member_id)
    )
  );
CREATE POLICY membership_plans_insert_admin ON public.membership_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));
CREATE POLICY membership_plans_update_admin ON public.membership_plans
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));
CREATE POLICY membership_plans_delete_admin ON public.membership_plans
  FOR DELETE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

CREATE POLICY memberships_read_gym_or_self ON public.memberships
  FOR SELECT TO authenticated
  USING (
    (
      public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
      AND public.membership_matches_gym(member_id, plan_id, gym_id)
    )
    OR (
      public.member_is_linked_to_current_user(member_id)
      AND EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = memberships.member_id
          AND member.gym_id = memberships.gym_id
      )
    )
  );
CREATE POLICY memberships_insert_gym_staff ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND public.membership_matches_gym(member_id, plan_id, gym_id)
  );
CREATE POLICY memberships_update_gym_staff ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND public.membership_matches_gym(member_id, plan_id, gym_id)
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND public.membership_matches_gym(member_id, plan_id, gym_id)
  );
CREATE POLICY memberships_delete_recent_rollback ON public.memberships
  FOR DELETE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND created_at > now() - interval '15 minutes'
    AND public.membership_matches_gym(member_id, plan_id, gym_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.member_id = memberships.member_id
        AND payment.payment_date = memberships.start_date
        AND payment.amount = memberships.amount
        AND payment.created_at >= memberships.created_at
    )
  );

CREATE POLICY freezes_read_gym_staff ON public.membership_freezes
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = membership_freezes.member_id
        AND member.gym_id = membership_freezes.gym_id
    )
  );
CREATE POLICY freezes_insert_gym_staff ON public.membership_freezes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = membership_freezes.member_id AND member.gym_id = membership_freezes.gym_id
    )
  );
CREATE POLICY freezes_update_admin ON public.membership_freezes
  FOR UPDATE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = membership_freezes.member_id
        AND member.gym_id = membership_freezes.gym_id
    )
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = membership_freezes.member_id
        AND member.gym_id = membership_freezes.gym_id
    )
  );

CREATE POLICY attendance_read_gym_or_self ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = attendance.member_id
        AND member.gym_id = attendance.gym_id
        AND (
          public.has_gym_role(attendance.gym_id, ARRAY['owner', 'admin', 'staff'])
          OR public.member_is_linked_to_current_user(member.id)
        )
    )
  );
CREATE POLICY attendance_insert_gym_staff ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (recorded_by IS NULL OR recorded_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = attendance.member_id AND member.gym_id = attendance.gym_id
    )
  );

CREATE POLICY payments_read_gym_or_self ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = payments.member_id
        AND member.gym_id = payments.gym_id
        AND (
          public.has_gym_role(payments.gym_id, ARRAY['owner', 'admin', 'staff'])
          OR public.member_is_linked_to_current_user(member.id)
        )
    )
  );
CREATE POLICY payments_insert_gym_staff ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = payments.member_id AND member.gym_id = payments.gym_id
    )
  );
CREATE POLICY payments_update_admin ON public.payments
  FOR UPDATE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = payments.member_id AND member.gym_id = payments.gym_id
    )
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = payments.member_id AND member.gym_id = payments.gym_id
    )
  );

CREATE POLICY leads_read_gym_staff ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY leads_insert_gym_staff ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY leads_update_gym_staff ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY leads_delete_admin ON public.leads
  FOR DELETE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

CREATE POLICY lead_followups_read_gym_staff ON public.lead_followups
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = lead_followups.lead_id AND lead.gym_id = lead_followups.gym_id
    )
  );
CREATE POLICY lead_followups_insert_gym_staff ON public.lead_followups
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND EXISTS (
      SELECT 1 FROM public.leads AS lead
      WHERE lead.id = lead_followups.lead_id AND lead.gym_id = lead_followups.gym_id
    )
  );
CREATE POLICY lead_followups_delete_admin ON public.lead_followups
  FOR DELETE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

CREATE POLICY notifications_read_gym_staff ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = notifications.member_id AND member.gym_id = notifications.gym_id
      )
    )
  );

CREATE POLICY message_templates_read_gym_staff ON public.message_templates
  FOR SELECT TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY message_templates_insert_admin ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));
CREATE POLICY message_templates_update_admin ON public.message_templates
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));
CREATE POLICY message_templates_delete_admin ON public.message_templates
  FOR DELETE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

CREATE POLICY message_logs_read_gym_staff ON public.message_logs
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = message_logs.member_id AND member.gym_id = message_logs.gym_id
      )
    )
  );

CREATE POLICY expenses_read_gym_staff ON public.expenses
  FOR SELECT TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY expenses_insert_gym_staff ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY expenses_update_admin ON public.expenses
  FOR UPDATE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));
CREATE POLICY expenses_delete_admin ON public.expenses
  FOR DELETE TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

CREATE POLICY audit_logs_read_gym_staff ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff']));
CREATE POLICY audit_logs_insert_actor_gym ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
  );

CREATE POLICY notification_log_read_gym_staff ON public.notification_log
  FOR SELECT TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin', 'staff'])
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = notification_log.member_id AND member.gym_id = notification_log.gym_id
      )
    )
  );

CREATE POLICY member_data_requests_read_owner_or_self ON public.member_data_requests
  FOR SELECT TO authenticated
  USING (
    (
      requested_by = auth.uid()
      OR public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    )
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = member_data_requests.member_id
          AND member.gym_id = member_data_requests.gym_id
      )
    )
  );
CREATE POLICY member_data_requests_insert_self ON public.member_data_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND request_type = 'account_deletion'
    AND status = 'pending'
    AND public.member_is_linked_to_current_user(member_id)
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = member_data_requests.member_id
        AND member.gym_id = member_data_requests.gym_id
    )
  );
CREATE POLICY member_data_requests_update_admin ON public.member_data_requests
  FOR UPDATE TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = member_data_requests.member_id
          AND member.gym_id = member_data_requests.gym_id
      )
    )
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.members AS member
        WHERE member.id = member_data_requests.member_id
          AND member.gym_id = member_data_requests.gym_id
      )
    )
  );

DO $migration$
DECLARE
  policy record;
  expression_text text;
BEGIN
  FOR policy IN
    SELECT pol.polname, pol.polrelid::regclass AS relation_name,
           pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
           pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expression
    FROM pg_policy AS pol
    WHERE pol.polrelid = 'storage.objects'::regclass
  LOOP
    expression_text := concat_ws(' ', policy.using_expression, policy.check_expression);
    IF expression_text LIKE '%member-photos%' OR expression_text LIKE '%qr-passes%' THEN
      EXECUTE format('DROP POLICY %I ON %s', policy.polname, policy.relation_name);
    END IF;
  END LOOP;
END;
$migration$;

CREATE POLICY member_photos_read_authorized ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id::text = (storage.foldername(name))[2]
        AND member.gym_id::text = (storage.foldername(name))[1]
        AND (
          member.auth_user_id = auth.uid()
          OR public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
        )
      )
  );
CREATE POLICY member_photos_insert_gym_staff ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'member-photos'
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id::text = (storage.foldername(name))[2]
        AND member.gym_id::text = (storage.foldername(name))[1]
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  );
CREATE POLICY member_photos_update_gym_staff ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id::text = (storage.foldername(name))[2]
        AND member.gym_id::text = (storage.foldername(name))[1]
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  )
  WITH CHECK (
    bucket_id = 'member-photos'
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id::text = (storage.foldername(name))[2]
        AND member.gym_id::text = (storage.foldername(name))[1]
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  );
CREATE POLICY member_photos_delete_gym_staff ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id::text = (storage.foldername(name))[2]
        AND member.gym_id::text = (storage.foldername(name))[1]
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  );

CREATE POLICY qr_passes_read_authorized ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'qr-passes'
    AND (
      EXISTS (
        SELECT 1
        FROM public.members AS member
        WHERE member.id::text || '.png' = name
          AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
      )
      OR EXISTS (
        SELECT 1
        FROM public.members AS member
        WHERE member.id::text || '.png' = name
          AND public.member_is_linked_to_current_user(member.id)
      )
    )
  );
CREATE POLICY qr_passes_write_gym_staff ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'qr-passes'
    AND EXISTS (
      SELECT 1
      FROM public.members AS member
      WHERE member.id::text || '.png' = name
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  );
CREATE POLICY qr_passes_update_gym_staff ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'qr-passes'
    AND EXISTS (
      SELECT 1
      FROM public.members AS member
      WHERE member.id::text || '.png' = name
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  )
  WITH CHECK (
    bucket_id = 'qr-passes'
    AND EXISTS (
      SELECT 1
      FROM public.members AS member
      WHERE member.id::text || '.png' = name
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  );

CREATE OR REPLACE FUNCTION public.calculate_attendance_streak(p_member_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  streak integer := 0;
  record_date date;
  expected_date date := current_date;
BEGIN
  IF NOT (
    public.member_is_linked_to_current_user(p_member_id)
    OR EXISTS (
      SELECT 1 FROM public.members AS member
      WHERE member.id = p_member_id
        AND public.has_gym_role(member.gym_id, ARRAY['owner', 'admin', 'staff'])
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to read this attendance streak'
      USING ERRCODE = '42501';
  END IF;

  FOR record_date IN
    SELECT DISTINCT attendance.attendance_date
    FROM public.attendance
    WHERE attendance.member_id = p_member_id
    ORDER BY attendance.attendance_date DESC
  LOOP
    IF record_date = expected_date THEN
      streak := streak + 1;
      expected_date := expected_date - 1;
    ELSIF record_date = expected_date + 1 THEN
      CONTINUE;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN streak;
END;
$function$;

REVOKE ALL ON FUNCTION public.calculate_attendance_streak(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_attendance_streak(uuid) TO authenticated;
