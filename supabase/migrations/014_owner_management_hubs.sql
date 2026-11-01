ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_consent boolean NOT NULL DEFAULT false;

GRANT INSERT (
  gym_id,
  member_code,
  full_name,
  phone,
  photo_url,
  plan_id,
  status,
  whatsapp_pass_consent,
  whatsapp_marketing_consent
) ON public.members TO authenticated;

GRANT UPDATE (
  full_name,
  phone,
  photo_url,
  plan_id,
  status,
  qr_token,
  whatsapp_pass_consent,
  whatsapp_marketing_consent,
  updated_at
) ON public.members TO authenticated;

CREATE TABLE IF NOT EXISTS public.whatsapp_automation_settings (
  gym_id uuid PRIMARY KEY REFERENCES public.gyms(id) ON DELETE CASCADE,
  login_otp_enabled boolean NOT NULL DEFAULT true,
  expiry_warning_enabled boolean NOT NULL DEFAULT true,
  inactivity_alert_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.whatsapp_automation_settings (gym_id)
SELECT id FROM public.gyms
ON CONFLICT (gym_id) DO NOTHING;

ALTER TABLE public.whatsapp_automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_automation_settings_owner_admin ON public.whatsapp_automation_settings;
CREATE POLICY whatsapp_automation_settings_owner_admin
  ON public.whatsapp_automation_settings
  FOR ALL TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

GRANT SELECT, INSERT, UPDATE ON public.whatsapp_automation_settings TO authenticated;
GRANT ALL ON public.whatsapp_automation_settings TO service_role;

CREATE TABLE IF NOT EXISTS public.personal_trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(trim(full_name)) > 0),
  specialty text NOT NULL DEFAULT '',
  monthly_session_target integer NOT NULL DEFAULT 0 CHECK (monthly_session_target >= 0),
  commission_per_session numeric(12, 2) NOT NULL DEFAULT 450 CHECK (commission_per_session >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, id)
);

CREATE TABLE IF NOT EXISTS public.personal_training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.personal_trainers(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK ((is_active AND ended_at IS NULL) OR (NOT is_active AND ended_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_training_assignments_one_active_per_member
  ON public.personal_training_assignments (gym_id, member_id)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS public.personal_training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.personal_trainers(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_training_assignments_gym_trainer_active
  ON public.personal_training_assignments (gym_id, trainer_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS personal_training_sessions_gym_trainer_date
  ON public.personal_training_sessions (gym_id, trainer_id, session_date)
  WHERE status = 'completed';

ALTER TABLE public.personal_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS personal_trainers_owner_admin ON public.personal_trainers;
CREATE POLICY personal_trainers_owner_admin
  ON public.personal_trainers
  FOR ALL TO authenticated
  USING (public.has_gym_role(gym_id, ARRAY['owner', 'admin']))
  WITH CHECK (public.has_gym_role(gym_id, ARRAY['owner', 'admin']));

DROP POLICY IF EXISTS personal_training_assignments_owner_admin ON public.personal_training_assignments;
CREATE POLICY personal_training_assignments_owner_admin
  ON public.personal_training_assignments
  FOR ALL TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.personal_trainers trainer
      WHERE trainer.id = trainer_id AND trainer.gym_id = personal_training_assignments.gym_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members member
      WHERE member.id = member_id AND member.gym_id = personal_training_assignments.gym_id
    )
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.personal_trainers trainer
      WHERE trainer.id = trainer_id AND trainer.gym_id = personal_training_assignments.gym_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members member
      WHERE member.id = member_id AND member.gym_id = personal_training_assignments.gym_id
    )
  );

DROP POLICY IF EXISTS personal_training_sessions_owner_admin ON public.personal_training_sessions;
CREATE POLICY personal_training_sessions_owner_admin
  ON public.personal_training_sessions
  FOR ALL TO authenticated
  USING (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.personal_trainers trainer
      WHERE trainer.id = trainer_id AND trainer.gym_id = personal_training_sessions.gym_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members member
      WHERE member.id = member_id AND member.gym_id = personal_training_sessions.gym_id
    )
  )
  WITH CHECK (
    public.has_gym_role(gym_id, ARRAY['owner', 'admin'])
    AND EXISTS (
      SELECT 1 FROM public.personal_trainers trainer
      WHERE trainer.id = trainer_id AND trainer.gym_id = personal_training_sessions.gym_id
    )
    AND EXISTS (
      SELECT 1 FROM public.members member
      WHERE member.id = member_id AND member.gym_id = personal_training_sessions.gym_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.personal_trainers, public.personal_training_assignments, public.personal_training_sessions
  TO authenticated;
GRANT ALL
  ON public.personal_trainers, public.personal_training_assignments, public.personal_training_sessions
  TO service_role;
