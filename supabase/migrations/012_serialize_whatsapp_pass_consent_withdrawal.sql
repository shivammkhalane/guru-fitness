CREATE TABLE public.member_pass_dispatch_locks (
  member_id uuid PRIMARY KEY
    REFERENCES public.members(id) ON DELETE RESTRICT,
  dispatch_id uuid NOT NULL DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_pass_dispatch_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.member_pass_dispatch_locks
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.begin_member_pass_dispatch(p_member_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
DECLARE
  v_consent boolean;
  v_dispatch_id uuid;
BEGIN
  SELECT member.whatsapp_pass_consent
    INTO v_consent
    FROM public.members AS member
    WHERE member.id = p_member_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'WhatsApp pass consent is not enabled'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.member_pass_dispatch_locks (member_id)
    VALUES (p_member_id)
    ON CONFLICT (member_id) DO NOTHING
    RETURNING dispatch_id INTO v_dispatch_id;

  IF v_dispatch_id IS NULL THEN
    RAISE EXCEPTION 'A member pass dispatch is already active'
      USING ERRCODE = '55006';
  END IF;

  RETURN v_dispatch_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_member_pass_dispatch(
  p_member_id uuid,
  p_dispatch_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.member_pass_dispatch_locks
    WHERE member_id = p_member_id
      AND dispatch_id = p_dispatch_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_member_pass_consent_withdrawal_during_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $function$
BEGIN
  IF OLD.whatsapp_pass_consent IS TRUE
     AND NEW.whatsapp_pass_consent IS DISTINCT FROM true
     AND EXISTS (
       SELECT 1
         FROM public.member_pass_dispatch_locks AS dispatch
         WHERE dispatch.member_id = OLD.id
     )
  THEN
    RAISE EXCEPTION 'A WhatsApp pass dispatch is active; retry withdrawal after it finishes'
      USING ERRCODE = '55006';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_member_pass_dispatch(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_member_pass_dispatch(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_member_pass_consent_withdrawal_during_dispatch()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.begin_member_pass_dispatch(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_member_pass_dispatch(uuid, uuid) TO service_role;

CREATE TRIGGER reject_member_pass_consent_withdrawal_during_dispatch
  BEFORE UPDATE OF whatsapp_pass_consent ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_member_pass_consent_withdrawal_during_dispatch();
