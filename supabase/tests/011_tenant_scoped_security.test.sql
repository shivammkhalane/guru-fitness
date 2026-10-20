BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = extensions, public;

SELECT no_plan();

INSERT INTO public.gyms (id, name, slug)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Security Test Gym A', 'security-test-gym-a'),
  ('10000000-0000-4000-8000-000000000002', 'Security Test Gym B', 'security-test-gym-b');

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous
)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'owner-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'staff-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'member-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'owner-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false),
  ('20000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'member-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), false, false);

INSERT INTO public.profiles (id, gym_id, full_name, role)
VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner A', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Staff A', 'staff'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Member A', 'member'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Owner B', 'owner'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 'Member B', 'member');

INSERT INTO public.membership_plans (id, gym_id, name, duration_days, price)
VALUES
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Gym A Plan', 30, 100),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Gym B Plan', 30, 100);

INSERT INTO public.members (
  id, gym_id, member_code, full_name, phone, plan_id, status, qr_token, auth_user_id
)
VALUES
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '901', 'Member A', '919900000001', '30000000-0000-4000-8000-000000000001', 'active', '50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '902', 'Member B', '919900000002', '30000000-0000-4000-8000-000000000002', 'active', '50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005');

INSERT INTO public.memberships (
  id, gym_id, member_id, plan_id, start_date, expiry_date, amount, payment_method, status
)
VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', current_date, current_date + 30, 100, 'cash', 'active'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', current_date, current_date + 30, 100, 'cash', 'active');

INSERT INTO public.payments (
  id, gym_id, member_id, receipt_number, amount, payment_date, payment_method, status
)
VALUES
  ('70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'SEC-A-1', 100, current_date, 'cash', 'paid'),
  ('70000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'SEC-B-1', 100, current_date, 'cash', 'paid');

INSERT INTO public.member_data_requests (id, gym_id, member_id, requested_by, request_type)
VALUES (
  '80000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000003',
  'account_deletion'
);

INSERT INTO public.audit_logs (id, gym_id, actor_id, action, entity_name)
VALUES
  ('90000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'test', 'members'),
  ('90000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'test', 'members');

SELECT ok(
  (SELECT bool_and(whatsapp_pass_consent IS FALSE) FROM public.members),
  'New member records default to withdrawn consent'
);

SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM public.profiles', '42501', NULL, 'anonymous users cannot read private profiles');
SELECT throws_ok('SELECT * FROM public.members', '42501', NULL, 'anonymous users cannot read member records');
SELECT throws_ok('SELECT * FROM public.payments', '42501', NULL, 'anonymous users cannot read payment records');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT is((SELECT count(*)::integer FROM public.members), 1, 'Gym A owner sees only Gym A members');
SELECT is((SELECT count(*)::integer FROM public.members WHERE id = '40000000-0000-4000-8000-000000000002'), 0, 'Gym A owner cannot read Gym B member');
SELECT is((SELECT count(*)::integer FROM public.gyms), 1, 'Gym A owner sees only the authorized gym');
SELECT is((SELECT count(*)::integer FROM public.profiles), 1, 'Gym owner reads only their own profile row');
SELECT is((SELECT count(*)::integer FROM public.membership_plans), 1, 'Gym A owner sees only Gym A plans');
SELECT throws_ok(
  $$INSERT INTO public.members (gym_id, member_code, full_name, phone, plan_id, status)
    VALUES ('10000000-0000-4000-8000-000000000002', '903', 'Cross Gym', '919900000003',
            '30000000-0000-4000-8000-000000000002', 'active')$$,
  '42501', NULL, 'Gym A owner cannot insert a Gym B member'
);
SELECT is((
  WITH changed AS (
    UPDATE public.members SET status = 'archived'
    WHERE id = '40000000-0000-4000-8000-000000000002'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 0, 'Gym A owner cannot update a Gym B member');
SELECT is((
  WITH removed AS (
    DELETE FROM public.members WHERE id = '40000000-0000-4000-8000-000000000002'
    RETURNING id
  ) SELECT count(*)::integer FROM removed
), 0, 'Gym A owner cannot delete a Gym B member');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
SELECT is((SELECT count(*)::integer FROM public.members), 1, 'Gym A staff reads operational members in Gym A');
SELECT is((SELECT count(*)::integer FROM public.members WHERE gym_id = '10000000-0000-4000-8000-000000000002'), 0, 'Gym A staff cannot read Gym B records');
SELECT is((
  WITH created AS (
    INSERT INTO public.attendance (gym_id, member_id, attendance_date, check_in_time, status, recorded_by)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
            current_date, localtime, 'present', '20000000-0000-4000-8000-000000000002')
    RETURNING id
  ) SELECT count(*)::integer FROM created
), 1, 'Gym A staff can record a legitimate check-in');
SELECT throws_ok(
  $$INSERT INTO public.attendance (gym_id, member_id, attendance_date, check_in_time, status, recorded_by)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
            current_date, localtime, 'present', '20000000-0000-4000-8000-000000000002')$$,
  '23505', NULL, 'Duplicate same-day attendance remains blocked'
);
SELECT throws_ok(
  $$INSERT INTO public.attendance (gym_id, member_id, attendance_date, check_in_time, status, recorded_by)
    VALUES ('10000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002',
            current_date, localtime, 'present', '20000000-0000-4000-8000-000000000002')$$,
  '42501', NULL, 'Gym A staff cannot record attendance for Gym B'
);
SELECT is((
  WITH changed AS (
    UPDATE public.members SET whatsapp_pass_consent = true
    WHERE id = '40000000-0000-4000-8000-000000000001'
    RETURNING whatsapp_pass_consent
  ) SELECT count(*)::integer FROM changed WHERE whatsapp_pass_consent
), 1, 'Authorized staff can persist WhatsApp pass consent');
SELECT is((
  WITH changed AS (
    UPDATE public.members SET whatsapp_pass_consent = false
    WHERE id = '40000000-0000-4000-8000-000000000001'
    RETURNING whatsapp_pass_consent
  ) SELECT count(*)::integer FROM changed WHERE NOT whatsapp_pass_consent
), 1, 'Authorized staff can withdraw WhatsApp pass consent');
SELECT is((
  WITH changed AS (
    UPDATE public.membership_plans SET price = 0
    WHERE id = '30000000-0000-4000-8000-000000000001'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 0, 'Staff cannot perform plan administration');
SELECT is((
  WITH created AS (
    INSERT INTO public.memberships (gym_id, member_id, plan_id, start_date, expiry_date, amount, payment_method, status)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
            '30000000-0000-4000-8000-000000000001', current_date, current_date + 30, 50, 'cash', 'active')
    RETURNING id
  ) SELECT count(*)::integer FROM created
), 1, 'Gym A staff can create a valid membership');
SELECT is((
  WITH removed AS (
    DELETE FROM public.memberships
    WHERE member_id = '40000000-0000-4000-8000-000000000001' AND amount = 50
    RETURNING id
  ) SELECT count(*)::integer FROM removed
), 1, 'Staff can roll back a recent unpaid membership without deleting payment history');
SELECT throws_ok(
  $$UPDATE public.audit_logs SET action = 'tampered'
    WHERE id = '90000000-0000-4000-8000-000000000001'$$,
  '42501', NULL, 'Staff cannot modify audit logs'
);
SELECT throws_ok(
  $$DELETE FROM public.audit_logs WHERE id = '90000000-0000-4000-8000-000000000001'$$,
  '42501', NULL, 'Staff cannot delete audit logs'
);
SELECT is((
  WITH created AS (
    INSERT INTO public.payments (gym_id, member_id, receipt_number, amount, payment_date, payment_method, status, notes)
    VALUES ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
            'SEC-A-STAFF', 10, current_date, 'cash', 'paid', 'authorization test')
    RETURNING id
  ) SELECT count(*)::integer FROM created
), 1, 'Gym A staff can record an authorized payment');
SELECT is((
  WITH created AS (
    INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_name)
    VALUES ('10000000-0000-4000-8000-000000000001',
            '20000000-0000-4000-8000-000000000002', 'test-authorized', 'members')
    RETURNING id
  ) SELECT count(*)::integer FROM created
), 1, 'Staff can append an audit event for their own gym and actor identity');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
SELECT is((SELECT count(*)::integer FROM public.members WHERE id = '40000000-0000-4000-8000-000000000001'), 1, 'Member can read their own member record');
SELECT is((SELECT count(*)::integer FROM public.members WHERE id = '40000000-0000-4000-8000-000000000002'), 0, 'Member cannot read another member record');
SELECT is((SELECT count(*)::integer FROM public.memberships WHERE member_id = '40000000-0000-4000-8000-000000000001'), 1, 'Member can read their own membership');
SELECT is((SELECT count(*)::integer FROM public.payments WHERE member_id = '40000000-0000-4000-8000-000000000001'), 1, 'Member can read their own payment history');
SELECT is((SELECT count(*)::integer FROM public.payments WHERE member_id = '40000000-0000-4000-8000-000000000002'), 0, 'Member cannot read another member payment history');
SELECT throws_ok(
  $$SELECT public.calculate_attendance_streak('40000000-0000-4000-8000-000000000002')$$,
  '42501', NULL, 'Member cannot query another member attendance streak'
);
SELECT is((SELECT count(*)::integer FROM public.member_data_requests), 1, 'Member can read their own deletion request');
SELECT is((
  WITH changed AS (
    UPDATE public.member_data_requests SET status = 'completed'
    WHERE id = '80000000-0000-4000-8000-000000000001'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 0, 'Member cannot alter deletion-request status');
SELECT is((
  WITH changed AS (
    UPDATE public.members SET whatsapp_pass_consent = true
    WHERE id = '40000000-0000-4000-8000-000000000001'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 0, 'Member cannot grant QR-pass consent on the gym record');
SELECT throws_ok(
  $$INSERT INTO public.profiles (id, gym_id, full_name, role)
    VALUES ('20000000-0000-4000-8000-000000000003',
            '10000000-0000-4000-8000-000000000001', 'Member A', 'owner')$$,
  '42501', NULL, 'Member cannot promote or replace their profile role'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000005', true);
SELECT is((SELECT count(*)::integer FROM public.member_data_requests), 0, 'Member B cannot read Member A deletion requests');
SELECT is((
  WITH changed AS (
    UPDATE public.member_data_requests SET status = 'completed'
    WHERE id = '80000000-0000-4000-8000-000000000001'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 0, 'Member B cannot modify Member A deletion requests');
SELECT is((
  WITH submitted AS (
    INSERT INTO public.member_data_requests (gym_id, member_id, requested_by, request_type)
    VALUES ('10000000-0000-4000-8000-000000000002',
            '40000000-0000-4000-8000-000000000002',
            '20000000-0000-4000-8000-000000000005',
            'account_deletion')
    RETURNING id
  ) SELECT count(*)::integer FROM submitted
), 1, 'Member B can submit their own deletion request');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
SELECT is((
  WITH changed AS (
    UPDATE public.member_data_requests SET status = 'in_review'
    WHERE id = '80000000-0000-4000-8000-000000000001'
    RETURNING id
  ) SELECT count(*)::integer FROM changed
), 1, 'Gym A owner can review a deletion request for Gym A');
SELECT throws_ok(
  $$INSERT INTO public.audit_logs (gym_id, actor_id, action, entity_name)
    VALUES ('10000000-0000-4000-8000-000000000002',
            '20000000-0000-4000-8000-000000000001', 'cross-gym', 'members')$$,
  '42501', NULL, 'Gym A owner cannot forge an audit entry for Gym B'
);
RESET ROLE;

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.begin_member_pass_dispatch(uuid)',
    'EXECUTE'
  ),
  'service_role can begin a member-pass dispatch'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.begin_member_pass_dispatch(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot begin a member-pass dispatch directly'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.begin_member_pass_dispatch(uuid)',
    'EXECUTE'
  ),
  'anon cannot begin a member-pass dispatch'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.finish_member_pass_dispatch(uuid, uuid)',
    'EXECUTE'
  ),
  'service_role can finish a member-pass dispatch'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.finish_member_pass_dispatch(uuid, uuid)',
    'EXECUTE'
  ),
  'authenticated cannot finish a member-pass dispatch directly'
);
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.finish_member_pass_dispatch(uuid, uuid)',
    'EXECUTE'
  ),
  'anon cannot finish a member-pass dispatch'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
SELECT is((
  WITH changed AS (
    UPDATE public.members
       SET whatsapp_pass_consent = true
     WHERE id = '40000000-0000-4000-8000-000000000001'
    RETURNING whatsapp_pass_consent
  )
  SELECT count(*)::integer FROM changed WHERE whatsapp_pass_consent
), 1, 'Staff enables consent before dispatch-lock test');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT set_config(
  'test.member_pass_dispatch_id',
  public.begin_member_pass_dispatch(
    '40000000-0000-4000-8000-000000000001'
  )::text,
  true
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
SELECT throws_ok(
  $$UPDATE public.members
       SET whatsapp_pass_consent = false
     WHERE id = '40000000-0000-4000-8000-000000000001'$$,
  '55006',
  NULL,
  'Consent withdrawal is rejected while a pass dispatch is active'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT is(
  public.finish_member_pass_dispatch(
    '40000000-0000-4000-8000-000000000001',
    current_setting('test.member_pass_dispatch_id')::uuid
  ),
  true,
  'service_role releases the active dispatch lock'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '20000000-0000-4000-8000-000000000002',
  true
);
SELECT is((
  WITH changed AS (
    UPDATE public.members
       SET whatsapp_pass_consent = false
     WHERE id = '40000000-0000-4000-8000-000000000001'
    RETURNING whatsapp_pass_consent
  )
  SELECT count(*)::integer FROM changed WHERE NOT whatsapp_pass_consent
), 1, 'Consent withdrawal succeeds after dispatch lock release');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
