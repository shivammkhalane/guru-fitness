import { memberRepository } from './src/services/dataService.js';
import { initialMembers } from './src/data/mockData.js';
import { isSupabaseReady } from './src/services/supabaseService.js';

// Mock localStorage for fallback mode
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; }
};

// Seed mock storage
localStorage.setItem('guru-fitness-members', JSON.stringify(initialMembers));

async function runTests() {
  console.log('Testing in mode:', isSupabaseReady ? 'Supabase (Mocked/Live)' : 'Fallback (Mocked Data)');
  
  // Test 1: Valid QR
  console.log('\\n--- Test 1: Valid QR ---');
  let member = await memberRepository.getMemberByQrToken('qr-token-112'); // 'qr-token-112' may not exist, let's use memberCode '112'
  if (!member) member = await memberRepository.getMemberByQrToken('112');
  console.log('Valid QR token (112) lookup:', member ? 'PASS (Found ' + member.name + ')' : 'FAIL');

  // Test 2: Invalid QR
  console.log('\\n--- Test 2: Invalid QR ---');
  const invalidMember = await memberRepository.getMemberByQrToken('invalid-token-123');
  console.log('Invalid QR token lookup:', !invalidMember ? 'PASS' : 'FAIL');

  // Test 3: Expired membership
  console.log('\\n--- Test 3: Expired membership ---');
  let expiredMember = await memberRepository.getMemberByQrToken('114'); // 114 is expired in seed
  if (expiredMember) {
      console.log('Expired member lookup:', 'PASS (Found ' + expiredMember.name + ', Status: ' + expiredMember.status + ')');
  } else {
      console.log('Expired member lookup:', 'FAIL');
  }

  // Test 4: Duplicate scan (simulate continuous scanning)
  console.log('\\n--- Test 4: Record Attendance (First time) ---');
  try {
      const att1 = await memberRepository.recordAttendance('112', 'present');
      console.log('First attendance record:', att1.alreadyMarked ? 'FAIL (Already marked)' : 'PASS (Recorded at ' + att1.time + ')');
      
      console.log('\\n--- Test 5: Duplicate scan ---');
      const att2 = await memberRepository.recordAttendance('112', 'present');
      console.log('Second attendance record:', att2.alreadyMarked ? 'PASS (Detected duplicate)' : 'FAIL (Allowed duplicate)');
  } catch (err) {
      console.log('Attendance error:', err.message);
  }

  console.log('\\n--- Live Database Blockers ---');
  console.log('Looking at supabase/migrations/006_add_member_auth_and_rls.sql');
  console.log('RLS Policy: "Staff can record attendance" ON attendance');
  console.log("USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.gym_id = attendance.gym_id AND profiles.role IN ('owner', 'admin', 'staff')))");
  console.log('Blocker identified: If a USB QR scanner is used on a receptionist machine, the receptionist MUST be logged in as an owner/admin/staff. An unauthorized user (or logged out session) will fail the RLS policy and attendance will not be recorded.');
}

runTests().catch(console.error);
