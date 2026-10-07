ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;

ALTER TABLE members
  ADD CONSTRAINT members_status_check
  CHECK (status IN ('active', 'expiring_soon', 'expired', 'frozen', 'cancelled', 'archived'));
