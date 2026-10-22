-- ============================================================================
-- MEMBER AUTHENTICATION & RLS IMPLEMENTATION
-- ============================================================================

-- 1. Extend profiles table to include 'member' role
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role in ('owner', 'admin', 'staff', 'member'));

-- 2. Add authentication linkage to members table
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_auth_user_id ON members(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 3. Add claim verification columns
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS claim_token uuid DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_claim_token ON members(claim_token) WHERE claim_token IS NOT NULL;

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- 4. Enable RLS on all tables
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing default policies
DROP POLICY IF EXISTS "Enable all access for service role" ON gyms;
DROP POLICY IF EXISTS "Enable all access for service role" ON profiles;
DROP POLICY IF EXISTS "Enable all access for service role" ON staff;
DROP POLICY IF EXISTS "Enable all access for service role" ON members;
DROP POLICY IF EXISTS "Enable all access for service role" ON memberships;
DROP POLICY IF EXISTS "Enable all access for service role" ON attendance;
DROP POLICY IF EXISTS "Enable all access for service role" ON payments;
DROP POLICY IF EXISTS "Enable all access for service role" ON membership_plans;
DROP POLICY IF EXISTS "Enable all access for service role" ON audit_logs;

-- ============================================================================
-- GYMS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read own gym" ON gyms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = gyms.id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read own gym" ON gyms
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.gym_id = gyms.id 
      AND members.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage gyms" ON gyms
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

CREATE POLICY "Users can read own profile" ON profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
);

CREATE POLICY "Service role can manage profiles" ON profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STAFF TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym staff" ON staff
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = staff.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Service role can manage staff" ON staff
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- MEMBERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym members" ON members
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = members.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can manage gym members" ON members
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = members.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = members.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read own record" ON members
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Service role can manage members" ON members
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- MEMBERSHIPS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym memberships" ON memberships
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = memberships.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can manage gym memberships" ON memberships
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = memberships.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = memberships.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read own memberships" ON memberships
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.id = memberships.member_id 
      AND members.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage memberships" ON memberships
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- ATTENDANCE TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym attendance" ON attendance
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = attendance.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can record attendance" ON attendance
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = attendance.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read own attendance" ON attendance
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.id = attendance.member_id 
      AND members.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage attendance" ON attendance
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym payments" ON payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = payments.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can manage gym payments" ON payments
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = payments.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = payments.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read own payments" ON payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.id = payments.member_id 
      AND members.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage payments" ON payments
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- MEMBERSHIP_PLANS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym plans" ON membership_plans
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = membership_plans.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can manage gym plans" ON membership_plans
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = membership_plans.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = membership_plans.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Members can read gym plans" ON membership_plans
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE members.gym_id = membership_plans.gym_id 
      AND members.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage plans" ON membership_plans
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ============================================================================

CREATE POLICY "Staff can read gym audit logs" ON audit_logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = audit_logs.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Staff can create audit logs" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.gym_id = audit_logs.gym_id
      AND profiles.role IN ('owner', 'admin', 'staff')
  )
);

CREATE POLICY "Service role can manage audit logs" ON audit_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);