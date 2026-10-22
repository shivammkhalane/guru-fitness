CREATE TABLE IF NOT EXISTS public.member_login_otps (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  otp_hash text NOT NULL,
  otp_salt text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  last_sent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_login_otps_expires_at
  ON public.member_login_otps (expires_at);

ALTER TABLE public.member_login_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.member_login_otps FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_login_otps TO service_role;
