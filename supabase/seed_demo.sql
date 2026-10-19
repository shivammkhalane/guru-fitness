-- Demo seed for Guru Fitness Health Club.
-- Safe to re-run: it deletes only the demo gym data before recreating it.
-- This file is intentionally not executed during this task.

DO $$
DECLARE
  demo_gym_id uuid;
BEGIN
  DELETE FROM attendance
  WHERE gym_id = (SELECT id FROM gyms WHERE slug = 'guru-fitness-health-club');

  DELETE FROM memberships
  WHERE gym_id = (SELECT id FROM gyms WHERE slug = 'guru-fitness-health-club');

  DELETE FROM members
  WHERE gym_id = (SELECT id FROM gyms WHERE slug = 'guru-fitness-health-club');

  DELETE FROM membership_plans
  WHERE gym_id = (SELECT id FROM gyms WHERE slug = 'guru-fitness-health-club');

  DELETE FROM gyms
  WHERE slug = 'guru-fitness-health-club';

  INSERT INTO gyms (name, slug, city, state, country, currency, timezone)
  VALUES (
    'Guru Fitness Health Club',
    'guru-fitness-health-club',
    'Dhule',
    'Maharashtra',
    'India',
    'INR',
    'Asia/Kolkata'
  )
  RETURNING id INTO demo_gym_id;

  INSERT INTO membership_plans (gym_id, name, duration_days, price, is_active)
  VALUES (demo_gym_id, 'Monthly', 30, 500, true);

  INSERT INTO members (gym_id, member_code, full_name, phone, photo_url, status)
  VALUES
    (demo_gym_id, '101', 'Aarav Sharma', '9876543210', NULL, 'active'),
    (demo_gym_id, '102', 'Rohan Patil', '9876543211', NULL, 'active'),
    (demo_gym_id, '103', 'Neha Kulkarni', '9876543212', NULL, 'active'),
    (demo_gym_id, '104', 'Vikram Rao', '9876543213', NULL, 'active'),
    (demo_gym_id, '105', 'Anjali More', '9876543214', NULL, 'active'),
    (demo_gym_id, '106', 'Sushant Deshmukh', '9876543215', NULL, 'expiring_soon'),
    (demo_gym_id, '107', 'Priya Nair', '9876543216', NULL, 'active'),
    (demo_gym_id, '108', 'Nikhil Pawar', '9876543217', NULL, 'expired'),
    (demo_gym_id, '109', 'Sneha Borse', '9876543218', NULL, 'active'),
    (demo_gym_id, '110', 'Rahul Jadhav', '9876543219', NULL, 'active'),
    (demo_gym_id, '111', 'Kiran Khairnar', '9876543220', NULL, 'expiring_soon'),
    (demo_gym_id, '112', 'Mehul Patil', '9876543221', NULL, 'active'),
    (demo_gym_id, '113', 'Pooja Yadav', '9876543222', NULL, 'active'),
    (demo_gym_id, '114', 'Harshad Joshi', '9876543223', NULL, 'expired'),
    (demo_gym_id, '115', 'Kavya Patil', '9876543224', NULL, 'active'),
    (demo_gym_id, '116', 'Ajay Verma', '9876543225', NULL, 'active'),
    (demo_gym_id, '117', 'Tanvi Suryawanshi', '9876543226', NULL, 'active'),
    (demo_gym_id, '118', 'Dinesh Shinde', '9876543227', NULL, 'active');

  INSERT INTO memberships (gym_id, member_id, plan_id, start_date, expiry_date, amount, payment_method, status)
  SELECT
    demo_gym_id,
    m.id,
    p.id,
    CASE m.member_code
      WHEN '101' THEN current_date - 30
      WHEN '102' THEN current_date - 27
      WHEN '103' THEN current_date - 26
      WHEN '104' THEN current_date - 25
      WHEN '105' THEN current_date - 24
      WHEN '106' THEN current_date - 21
      WHEN '107' THEN current_date - 20
      WHEN '108' THEN current_date - 45
      WHEN '109' THEN current_date - 18
      WHEN '110' THEN current_date - 19
      WHEN '111' THEN current_date - 16
      WHEN '112' THEN current_date - 15
      WHEN '113' THEN current_date - 14
      WHEN '114' THEN current_date - 50
      WHEN '115' THEN current_date - 20
      WHEN '116' THEN current_date - 12
      WHEN '117' THEN current_date - 9
      WHEN '118' THEN current_date - 10
    END,
    CASE m.member_code
      WHEN '101' THEN current_date + 15
      WHEN '102' THEN current_date + 3
      WHEN '103' THEN current_date + 5
      WHEN '104' THEN current_date + 18
      WHEN '105' THEN current_date + 2
      WHEN '106' THEN current_date + 6
      WHEN '107' THEN current_date + 20
      WHEN '108' THEN current_date - 2
      WHEN '109' THEN current_date + 12
      WHEN '110' THEN current_date + 10
      WHEN '111' THEN current_date + 4
      WHEN '112' THEN current_date + 17
      WHEN '113' THEN current_date + 16
      WHEN '114' THEN current_date - 4
      WHEN '115' THEN current_date + 10
      WHEN '116' THEN current_date + 22
      WHEN '117' THEN current_date + 14
      WHEN '118' THEN current_date + 18
    END,
    500,
    'cash',
    CASE m.member_code
      WHEN '108' THEN 'expired'
      WHEN '114' THEN 'expired'
      ELSE 'active'
    END
  FROM members m
  JOIN membership_plans p ON p.gym_id = demo_gym_id
  WHERE m.gym_id = demo_gym_id;

  INSERT INTO attendance (gym_id, member_id, attendance_date, check_in_time, status)
  SELECT
    demo_gym_id,
    m.id,
    CASE m.member_code
      WHEN '101' THEN current_date - 1
      WHEN '102' THEN current_date - 3
      WHEN '103' THEN current_date
      WHEN '104' THEN current_date - 2
      WHEN '105' THEN current_date - 1
      WHEN '106' THEN current_date - 1
      WHEN '107' THEN current_date
      WHEN '108' THEN current_date - 10
      WHEN '109' THEN current_date
      WHEN '110' THEN current_date - 1
      WHEN '111' THEN current_date - 2
      WHEN '112' THEN current_date
      WHEN '113' THEN current_date - 1
      WHEN '114' THEN current_date - 5
      WHEN '115' THEN current_date - 1
      WHEN '116' THEN current_date
      WHEN '117' THEN current_date - 2
      WHEN '118' THEN current_date
    END,
    CASE m.member_code
      WHEN '101' THEN '07:10:00+05:30'
      WHEN '102' THEN '18:45:00+05:30'
      WHEN '103' THEN '18:30:00+05:30'
      WHEN '104' THEN '18:20:00+05:30'
      WHEN '105' THEN '18:25:00+05:30'
      WHEN '106' THEN '18:15:00+05:30'
      WHEN '107' THEN '18:55:00+05:30'
      WHEN '108' THEN '18:05:00+05:30'
      WHEN '109' THEN '18:42:00+05:30'
      WHEN '110' THEN '18:50:00+05:30'
      WHEN '111' THEN '18:40:00+05:30'
      WHEN '112' THEN '18:28:00+05:30'
      WHEN '113' THEN '18:33:00+05:30'
      WHEN '114' THEN '18:10:00+05:30'
      WHEN '115' THEN '18:14:00+05:30'
      WHEN '116' THEN '18:48:00+05:30'
      WHEN '117' THEN '18:22:00+05:30'
      WHEN '118' THEN '18:35:00+05:30'
    END,
    'present'
  FROM members m
  WHERE m.gym_id = demo_gym_id
    AND m.member_code NOT IN ('102');

  INSERT INTO attendance (gym_id, member_id, attendance_date, check_in_time, status)
  SELECT
    demo_gym_id,
    m.id,
    current_date - 2,
    '18:12:00+05:30',
    'present'
  FROM members m
  WHERE m.gym_id = demo_gym_id
    AND m.member_code = '102';
END $$;
