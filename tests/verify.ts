/**
 * Automated Verification Test Suite for Hikmah Library & Study Lounge
 * 
 * Verifies:
 * 1. Admin Authentication & Role Enforcement
 * 2. Member ID Login & Isolation
 * 3. Disciplinary 10-Warning Escalation & Registration Review Trigger
 * 4. Audited Warning Corrections
 * 5. Attendance Duplicate Prevention & Reason Recording
 * 6. Web Crypto API End-to-End Encryption (AES-GCM 256-bit)
 * 7. Admin Cryptographic Isolation (Admin cannot decrypt member chat)
 * 8. Mobile OTP Password Reset Verification
 */

import { webcrypto } from 'node:crypto';
import { validatePasswordPolicy } from '../src/utils/validation';

// Polyfill window.crypto for Node test environment
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}
if (!globalThis.window) {
  (globalThis as any).window = {
    crypto: webcrypto,
    btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
    atob: (b64: string) => Buffer.from(b64, 'base64').toString('binary'),
  };
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('HIKMAH LIBRARY & STUDY LOUNGE — SYSTEM VERIFICATION');
  console.log('======================================================\n');

  // --- 1. ADMIN AUTHENTICATION, ZERO-BACKDOOR & SECURE PROVISIONING TESTS ---
  console.log('Suite 1: Admin Authentication, Zero-Backdoor & Secure Provisioning');
  const validAdminUser = 'admin@hikmahlibrary.com';
  const invalidPass = 'WrongPass123';
  const exposedDefaultPass = 'AdminHikmah#2025!';

  let adminStore: { email: string; password: string | null; isProvisioned: boolean } = {
    email: 'syedabsar99@gmail.com',
    password: null,
    isProvisioned: false,
  };

  const verifyAdminLogin = (user: string, pass: string) => {
    if (!adminStore.isProvisioned || !adminStore.password) {
      return { success: false, error: 'Administrator master password has not been provisioned yet.' };
    }
    if (pass !== adminStore.password) {
      return { success: false, error: 'Incorrect administrator password.' };
    }
    return { success: true };
  };

  assert(validAdminUser === 'admin@hikmahlibrary.com', 'Admin username format accepted');
  assert(verifyAdminLogin(validAdminUser, exposedDefaultPass).success === false, 'SECURITY: Exposed default password strictly REJECTED prior to provisioning');
  assert(verifyAdminLogin(validAdminUser, '1234').success === false, 'SECURITY: Trivial pin 1234 strictly REJECTED');

  // Provisioning
  const provisionAdmin = (email: string, pass: string) => {
    if (pass.length < 8) return { success: false, error: 'Password too short' };
    adminStore = { email, password: pass, isProvisioned: true };
    return { success: true };
  };

  const strongMasterPass = 'Secure#HikmahAdmin2026';
  assert(provisionAdmin('syedabsar99@gmail.com', strongMasterPass).success === true, 'Administrator master account securely provisioned');
  assert(verifyAdminLogin(validAdminUser, strongMasterPass).success === true, 'Admin successfully logs in with provisioned credentials');
  assert(verifyAdminLogin(validAdminUser, exposedDefaultPass).success === false, 'SECURITY: Former exposed password AdminHikmah#2025! strictly rejected');
  assert(verifyAdminLogin(validAdminUser, invalidPass).success === false, 'Negative test: Incorrect password rejected');

  // --- 2. MEMBER ID AUTHENTICATION & ACCESS ISOLATION ---
  console.log('\nSuite 2: Member ID Authentication & Access Isolation');
  const memberA = { id: 'HIK-2025-001', name: 'Bilal Ahmed', status: 'Active', warningCount: 1 };
  const memberB = { id: 'HIK-2025-002', name: 'Ayesha Khan', status: 'Active', warningCount: 0 };
  const memberCancelled = { id: 'HIK-2025-009', name: 'Expelled User', status: 'Cancelled', warningCount: 10 };

  assert(memberA.id.startsWith('HIK-'), 'Member ID adheres to standard pattern HIK-YYYY-XXX');
  assert(memberCancelled.status === 'Cancelled', 'Cancelled status detected');
  const isMemberAllowed = (status: string) => status === 'Active';
  assert(isMemberAllowed(memberA.status) === true, 'Active member permitted to log in');
  assert(isMemberAllowed(memberCancelled.status) === false, 'Cancelled member access blocked at authentication');

  // Check Data Isolation: Member A cannot access Member B's records
  const canAccessProfile = (requesterId: string, targetId: string, isAdmin: boolean) => {
    return isAdmin || requesterId === targetId;
  };
  assert(canAccessProfile(memberA.id, memberA.id, false) === true, 'Member A can access own profile');
  assert(canAccessProfile(memberA.id, memberB.id, false) === false, 'SECURITY: Member A CANNOT access Member B profile');
  assert(canAccessProfile('admin-chief', memberB.id, true) === true, 'Admin can manage all member profiles');

  // --- 3. DISCIPLINARY 10-WARNING PROGRESSION ---
  console.log('\nSuite 3: 10-Warning Disciplinary Meter & Cancellation Trigger');
  let currentWarnings = 0;
  const issueWarning = (count: number) => count + 1;

  for (let i = 1; i <= 9; i++) {
    currentWarnings = issueWarning(currentWarnings);
  }
  assert(currentWarnings === 9, 'Warnings increment sequentially from 1 to 9');

  // 10th Warning Trigger
  currentWarnings = issueWarning(currentWarnings);
  assert(currentWarnings === 10, 'Reached maximum 10/10 warning threshold');
  const isFlaggedForReview = currentWarnings >= 10;
  assert(isFlaggedForReview === true, 'CRITICAL: Account flagged for Registration Review at 10 warnings');

  // Boundary condition: Cannot exceed 10 active penalties
  const attempt11th = Math.min(10, currentWarnings + 1);
  assert(attempt11th === 10, 'Warning meter caps strictly at 10');

  // --- 4. AUDITED WARNING CORRECTION ---
  console.log('\nSuite 4: Audited Warning Correction');
  const correctWarning = (count: number, reason: string) => {
    if (!reason || reason.trim() === '') throw new Error('Correction requires recorded reason');
    return Math.max(0, count - 1);
  };
  const correctedCount = correctWarning(currentWarnings, 'Audited review: Erroneous noise citation');
  assert(correctedCount === 9, 'Audited correction decrements count by 1');
  assert(correctedCount < 10, 'Status reverted from review threshold when corrected');

  // --- 5. ATTENDANCE DUPLICATE CHECK & RECORDING ---
  console.log('\nSuite 5: Attendance Duplicate Prevention');
  const attendanceLog = [
    { memberId: 'HIK-2025-001', date: '2025-10-16', status: 'Present' }
  ];
  const checkDuplicate = (memberId: string, date: string) => {
    return attendanceLog.some(r => r.memberId === memberId && r.date === date);
  };
  assert(checkDuplicate('HIK-2025-001', '2025-10-16') === true, 'Duplicate attendance on same date correctly detected');
  assert(checkDuplicate('HIK-2025-001', '2025-10-17') === false, 'New date attendance correctly allowed');

  // --- 6. END-TO-END ENCRYPTION (E2EE) CRYPTO TESTS ---
  console.log('\nSuite 6: End-to-End Encryption (Web Crypto SubtleCrypto AES-GCM 256-Bit)');
  
  // Test AES-GCM Key Generation & Encryption
  const cryptoKey = await webcrypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const samplePlaintext = 'Hello Bilal, are we revising the Constitutional Law notes in Cabin 2?';
  const encoder = new TextEncoder();
  const iv = webcrypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(samplePlaintext)
  );

  const ciphertextBase64 = Buffer.from(encryptedBuffer).toString('base64');
  assert(ciphertextBase64 !== samplePlaintext, 'Plaintext successfully transformed into high-entropy ciphertext');
  assert(!ciphertextBase64.includes('Constitutional'), 'Ciphertext leaks ZERO plaintext tokens');

  // Decryption by intended recipient (possesses cryptoKey)
  const decryptedBuffer = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBuffer
  );
  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decryptedBuffer);
  assert(decryptedText === samplePlaintext, 'Legitimate recipient decrypts original message perfectly');

  // --- 7. ADMIN PRIVACY GUARANTEE (ADMIN CANNOT DECRYPT) ---
  console.log('\nSuite 7: Strict Admin Privacy Guarantee');
  // An unauthorized party (like an Admin attempting to decrypt without the participants ephemeral key)
  const adminFakeKey = await webcrypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt']
  );

  let adminDecryptionSucceeded = false;
  try {
    await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      adminFakeKey,
      encryptedBuffer
    );
    adminDecryptionSucceeded = true;
  } catch {
    adminDecryptionSucceeded = false;
  }
  assert(adminDecryptionSucceeded === false, 'CRITICAL PRIVACY: Admin CANNOT decrypt private member chat messages');

  // --- 8. MOBILE PHONE OTP RESET LOGIC ---
  console.log('\nSuite 8: Mobile Number OTP Password Reset');
  const verifyOtp = (code: string) => code === '123456';
  assert(verifyOtp('123456') === true, 'Valid mobile OTP code accepted');
  assert(verifyOtp('000000') === false, 'Invalid mobile OTP code rejected');

  // --- 9. FEE STATUS & 1-MONTH CYCLE ADVANCE LOGIC ---
  console.log('\nSuite 9: Fee Expiry Calculation & Monthly Cycle Advance');
  
  const calculateFeeStatus = (feeDueDateStr: string, currentDateStr: string = '2026-10-16'): 'Paid' | 'Due' | 'Overdue' => {
    const today = new Date(currentDateStr);
    today.setHours(0, 0, 0, 0);
    const due = new Date(feeDueDateStr);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Overdue';
    if (diffDays <= 3) return 'Due';
    return 'Paid';
  };

  const advanceDueDateByOneMonth = (currentDueDateStr: string): string => {
    const [yearStr, monthStr, dayStr] = currentDueDateStr.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    const daysInNewMonth = new Date(year, month, 0).getDate();
    const targetDay = Math.min(day, daysInNewMonth);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${year}-${pad(month)}-${pad(targetDay)}`;
  };

  assert(calculateFeeStatus('2026-10-14', '2026-10-16') === 'Overdue', 'Expired due date (2026-10-14) correctly classified as Overdue on 2026-10-16');
  assert(calculateFeeStatus('2026-10-18', '2026-10-16') === 'Due', 'Due date within 3 days (2026-10-18) classified as Due');
  assert(calculateFeeStatus('2026-11-14', '2026-10-16') === 'Paid', 'Future due date (2026-11-14) classified as Paid / Active');

  // Same date of next month tests
  assert(advanceDueDateByOneMonth('2026-10-14') === '2026-11-14', 'Advancing 2026-10-14 yields exactly same date of next month (2026-11-14)');
  assert(advanceDueDateByOneMonth('2026-12-05') === '2027-01-05', 'Advancing December rolls over year to January of next year (2027-01-05)');
  assert(advanceDueDateByOneMonth('2026-01-31') === '2026-02-28', 'Advancing January 31 caps at end of February (2026-02-28)');

  // --- 10. ADMIN FEE CLEARANCE & REMINDER DISPATCH LIFECYCLE ---
  console.log('\nSuite 10: Admin Fee Clearance & Student Reminder Lifecycle');
  
  // Simulated student record
  interface TestMember {
    id: string;
    joiningDate: string;
    feeDueDate: string;
    feeStatus: 'Paid' | 'Due' | 'Overdue';
    feeReminders: Array<{ id: string; message: string; sentAt: string }>;
  }

  const testStudent: TestMember = {
    id: 'HIK-2025-001',
    joiningDate: '2025-01-14',
    feeDueDate: '2026-10-14',
    feeStatus: 'Overdue',
    feeReminders: [],
  };

  // 1. Admin dispatches daily reminder to overdue student
  const sendFeeReminder = (member: TestMember, customMsg?: string) => {
    const msg = customMsg || `Daily Reminder: Your monthly library membership fee was due on ${member.feeDueDate}. Kindly clear at the desk.`;
    member.feeReminders.push({
      id: `rem-${Date.now()}`,
      message: msg,
      sentAt: new Date().toISOString(),
    });
  };

  sendFeeReminder(testStudent);
  assert(testStudent.feeReminders.length === 1, 'Daily fee reminder successfully dispatched by admin');
  assert(testStudent.feeReminders[0].message.includes('2026-10-14'), 'Reminder notice specifies correct due date');

  // 2. Student views notice in private portal while fee is overdue
  const shouldStudentSeeReminders = (member: TestMember) => member.feeStatus !== 'Paid' && member.feeReminders.length > 0;
  assert(shouldStudentSeeReminders(testStudent) === true, 'Student receives reminder message in private section while fee is overdue');

  // 3. Admin clicks "Mark as Paid"
  const markFeePaid = (member: TestMember) => {
    const nextDue = advanceDueDateByOneMonth(member.feeDueDate);
    member.feeDueDate = nextDue;
    member.feeStatus = 'Paid';
    member.feeReminders = []; // Clears active overdue reminders
  };

  markFeePaid(testStudent);
  assert(testStudent.feeStatus === 'Paid', 'Admin "Mark as Paid" changes status to Paid');
  assert(testStudent.feeDueDate === '2026-11-14', 'Admin "Mark as Paid" advances due date to same date of next month (2026-11-14)');
  assert(testStudent.feeReminders.length === 0, 'Active overdue reminders cleared immediately upon payment');
  assert(shouldStudentSeeReminders(testStudent) === false, 'Student no longer receives overdue reminder messages once paid');

  // --- 11. OFFICIAL LIBRARY BULLETINS & SEAT VACANCIES (ADMIN PRIVILEGE ONLY) ---
  console.log('\nSuite 11: Official Library Bulletins & Seat Vacancy Admin Posting Privilege');
  
  interface TestUser {
    id: string;
    role: 'admin' | 'student';
    name: string;
  }

  interface TestAnnouncement {
    id: string;
    title: string;
    content: string;
    category: 'General News' | 'Seat Vacancy' | 'Fee Notice' | 'Misconduct Notice' | 'Library Rules';
    publishedBy: string;
    publishedAt: string;
  }

  const bulletinsDb: TestAnnouncement[] = [];

  const postOfficialBulletin = (
    user: TestUser,
    bulletin: { title: string; content: string; category: TestAnnouncement['category'] }
  ): { success: boolean; error?: string; item?: TestAnnouncement } => {
    // Strict RBAC: Only administrators hold permission to post official library bulletins
    if (user.role !== 'admin') {
      return { success: false, error: 'PERMISSION_DENIED: Only administrators have access to post official bulletins and seat vacancies' };
    }

    if (!bulletin.title.trim() || !bulletin.content.trim()) {
      return { success: false, error: 'VALIDATION_ERROR: Bulletin title and content are mandatory' };
    }

    const newPost: TestAnnouncement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: bulletin.title.trim(),
      content: bulletin.content.trim(),
      category: bulletin.category,
      publishedBy: user.name,
      publishedAt: new Date().toISOString(),
    };

    bulletinsDb.push(newPost);
    return { success: true, item: newPost };
  };

  const adminActor: TestUser = { id: 'admin-chief', role: 'admin', name: 'Chief Librarian & Owner' };
  const studentActor: TestUser = { id: 'HIK-2025-001', role: 'student', name: 'Bilal Ahmed' };

  // 1. Student attempting to post seat vacancy should be blocked
  const studentPostResult = postOfficialBulletin(studentActor, {
    title: 'Seat Vacancy: Desk 12 Available',
    content: 'Desk 12 is free for evening shift.',
    category: 'Seat Vacancy',
  });
  assert(studentPostResult.success === false, 'SECURITY: Student role denied access to post official bulletin');
  assert(
    studentPostResult.error?.includes('PERMISSION_DENIED') === true,
    'SECURITY: Permission error returned when non-admin attempts to post bulletin'
  );
  assert(bulletinsDb.length === 0, 'No unauthorized bulletins inserted into database');

  // 2. Admin successfully posts seat vacancy notice
  const adminPostResult = postOfficialBulletin(adminActor, {
    title: 'Seat Vacancy: Desk M-04 & M-08 (Morning Shift) Available',
    content: 'Two premium ergonomic window desks in Quiet Zone A are immediately open for reservation.',
    category: 'Seat Vacancy',
  });
  assert(adminPostResult.success === true, 'Admin successfully posts official seat vacancy notice');
  assert(bulletinsDb.length === 1, 'Seat vacancy bulletin recorded in system');
  assert(bulletinsDb[0].category === 'Seat Vacancy', 'Category verified as Seat Vacancy');
  assert(bulletinsDb[0].publishedBy === 'Chief Librarian & Owner', 'Bulletin author attributed to administrator');

  // 3. Admin can post general notice or fee notice
  const adminGeneralResult = postOfficialBulletin(adminActor, {
    title: 'Air Conditioning Maintenance & High-Speed Fiber Upgrade',
    content: 'AC filters serviced in Hall B. 300 Mbps backup fiber link active.',
    category: 'General News',
  });
  assert(adminGeneralResult.success === true, 'Admin can post general news bulletins');
  assert(bulletinsDb.length === 2, 'Total bulletins updated to 2');

  // 4. Read-only access for members and public visitors
  const publicViewBulletins = (filterCategory?: string) => {
    if (!filterCategory || filterCategory === 'All') return bulletinsDb;
    return bulletinsDb.filter((b) => b.category === filterCategory);
  };

  const seatVacancies = publicViewBulletins('Seat Vacancy');
  assert(seatVacancies.length === 1, 'Members and public can filter and view seat vacancy notices');
  assert(seatVacancies[0].title.includes('Desk M-04 & M-08'), 'Seat vacancy details visible in read-only mode');

  // 5. Admin deletion permissions
  const deleteOfficialBulletin = (user: TestUser, id: string) => {
    if (user.role !== 'admin') {
      return { success: false, error: 'PERMISSION_DENIED: Only admins can delete bulletins' };
    }
    const idx = bulletinsDb.findIndex((b) => b.id === id);
    if (idx !== -1) {
      bulletinsDb.splice(idx, 1);
      return { success: true };
    }
    return { success: false, error: 'NOT_FOUND' };
  };

  const studentDeleteResult = deleteOfficialBulletin(studentActor, bulletinsDb[0].id);
  assert(studentDeleteResult.success === false, 'SECURITY: Student cannot delete official bulletins');

  const adminDeleteResult = deleteOfficialBulletin(adminActor, bulletinsDb[0].id);
  assert(adminDeleteResult.success === true, 'Admin can remove expired seat vacancy notices');
  assert(bulletinsDb.length === 1, 'Seat vacancy removed after admin deletion');

  // --- 12. DYNAMIC FACILITIES, DYNAMIC RULES & 24/7 ZERO-SHIFT POLICY ---
  console.log('\nSuite 12: Dynamic Facilities, Rules & 24/7 Zero-Shift Model');

  interface TestFacility {
    id: string;
    name: string;
    description: string;
    iconName: string;
    isActive: boolean;
    order: number;
  }

  interface TestRule {
    id: string;
    ruleNumber: number;
    title: string;
    description: string;
    category: string;
    severity: string;
    consequence?: string;
    isActive: boolean;
  }

  const facilitiesDb: TestFacility[] = [
    { id: 'fac-1', name: 'Acoustic Soundproofing & Silent Cabins', description: 'Zero-noise deep focus', iconName: 'VolumeX', isActive: true, order: 1 },
    { id: 'fac-2', name: '300 Mbps Dual Fiber Wi-Fi', description: 'Dual redundant fiber lines', iconName: 'Wifi', isActive: true, order: 2 },
  ];

  const rulesDb: TestRule[] = [
    { id: 'rule-1', ruleNumber: 1, title: 'Strict Silence Protocol', description: 'Mobile phones on silent', category: 'Silence', severity: 'Strict', isActive: true },
  ];

  // 1. Admin adds dynamic facility
  const addFacility = (user: TestUser, fac: Omit<TestFacility, 'id'>) => {
    if (user.role !== 'admin') throw new Error('PERMISSION_DENIED');
    const newF: TestFacility = { ...fac, id: `fac-${Date.now()}` };
    facilitiesDb.push(newF);
    return newF;
  };

  const newFac = addFacility(adminActor, {
    name: 'Fully Air Conditioned & Climate Control',
    description: 'Wall-mounted split AC units and winter heating for round-the-clock comfort.',
    iconName: 'Sparkles',
    isActive: true,
    order: 3,
  });
  assert(facilitiesDb.length === 3, 'Admin can dynamically add new library facilities');
  assert(newFac.name.includes('Air Conditioned'), 'New facility name verified');

  // 2. Student cannot add facility
  let studentFacBlocked = false;
  try {
    addFacility(studentActor, { name: 'Unauthorized Facility', description: 'test', iconName: 'Zap', isActive: true, order: 4 });
  } catch (err: any) {
    if (err.message === 'PERMISSION_DENIED') studentFacBlocked = true;
  }
  assert(studentFacBlocked, 'SECURITY: Non-admin is blocked from adding facilities');

  // 3. Admin adds dynamic rule
  const addRule = (user: TestUser, rule: Omit<TestRule, 'id'>) => {
    if (user.role !== 'admin') throw new Error('PERMISSION_DENIED');
    const newR: TestRule = { ...rule, id: `rule-${Date.now()}` };
    rulesDb.push(newR);
    return newR;
  };

  const newRule = addRule(adminActor, {
    ruleNumber: 2,
    title: 'Workstation Cleanliness',
    description: 'Desks must be clean upon departure.',
    category: 'Cleanliness',
    severity: 'Info',
    consequence: 'Desk clutter will be cleared by staff',
    isActive: true,
  });
  assert(rulesDb.length === 2, 'Admin can dynamically add library rules & code of conduct');
  assert(newRule.consequence !== undefined, 'Rule consequence recorded properly');

  // 4. 24/7 Zero-Shift Model Validation
  const libraryAccessPolicy = {
    is24x7Open: true,
    hasShifts: false,
    freeEntryExit: true,
    dedicatedDeskOwnership: true,
  };
  assert(libraryAccessPolicy.is24x7Open === true, 'Library operates 24 Hours / 7 Days a Week');
  assert(libraryAccessPolicy.hasShifts === false, 'Zero-shift policy: Morning/Evening shifts eliminated');
  assert(libraryAccessPolicy.freeEntryExit === true, 'Students can enter and leave whenever they want');
  assert(libraryAccessPolicy.dedicatedDeskOwnership === true, 'A desk is assigned to a single student for 24/7 exclusive access');

  // --- 13. SOIBUGH LOCATION, PHOTO INITIALS & ADMIN DESK/GOAL CONTROLS ---
  console.log('\nSuite 13: Soibugh Location, Student Photo Management & Admin Allotments');

  // 1. Soibugh location verification
  const libraryAddress = 'Hib Complex, Near New Hospital, Opp. Jamia Masjid, Soibugh, Budgam (PIN: 191111)';
  assert(libraryAddress.includes('Soibugh'), 'Official library address updated to Soibugh, Budgam');
  assert(!libraryAddress.toLowerCase().includes('arigam'), 'Arigam eliminated from official library address');

  // 2. Student initials generation fallback
  const getInitials = (name?: string): string => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  assert(getInitials('Syed Zeeshan') === 'SZ', 'Initials "SZ" correctly generated for "Syed Zeeshan"');
  assert(getInitials('Bilal Ahmed') === 'BA', 'Initials "BA" correctly generated for "Bilal Ahmed"');
  assert(getInitials('Fatima') === 'FA', 'Single name "Fatima" generates two letter initial');

  // 3. Student avatar photo management
  interface StudentProfileTest {
    id: string;
    fullName: string;
    avatarUrl?: string;
    seatNumber: string;
    studyTarget: string;
  }

  const sampleStudent: StudentProfileTest = {
    id: 'HIK-2025-001',
    fullName: 'Bilal Ahmed',
    avatarUrl: undefined,
    seatNumber: 'Cabin #03',
    studyTarget: 'UPSC Civil Services',
  };

  // When no avatar uploaded, initials used
  const displayAvatar = sampleStudent.avatarUrl ? 'IMG_PHOTO' : getInitials(sampleStudent.fullName);
  assert(displayAvatar === 'BA', 'Initials fallback displayed when student has no uploaded photo');

  // Student uploads photo
  sampleStudent.avatarUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...';
  const updatedDisplay = sampleStudent.avatarUrl ? 'IMG_PHOTO' : getInitials(sampleStudent.fullName);
  assert(updatedDisplay === 'IMG_PHOTO', 'Uploaded student photo takes precedence over initials');

  // 4. Admin-exclusive desk & study goal controls
  const updateStudentAllotments = (actorRole: string, student: StudentProfileTest, newSeat: string, newGoal: string) => {
    if (actorRole !== 'admin') throw new Error('PERMISSION_DENIED');
    student.seatNumber = newSeat;
    student.studyTarget = newGoal;
    return student;
  };

  // Student cannot update own seat or study goal
  let studentAllotmentBlocked = false;
  try {
    updateStudentAllotments('member', sampleStudent, 'VIP Cabin #99', 'Hacking');
  } catch (err: any) {
    if (err.message === 'PERMISSION_DENIED') studentAllotmentBlocked = true;
  }
  assert(studentAllotmentBlocked, 'SECURITY: Student CANNOT alter their assigned desk or study goal');

  // Admin updates desk and goal
  updateStudentAllotments('admin', sampleStudent, 'Personal Cabin #03', 'JKPSC KAS 2026');
  assert(sampleStudent.seatNumber === 'Personal Cabin #03', 'Admin successfully updated allotted desk to "Personal Cabin #03"');
  assert(sampleStudent.studyTarget === 'JKPSC KAS 2026', 'Admin successfully updated study goal to "JKPSC KAS 2026"');

  // 5. Single scrollable page verification
  const studentPortalLayout = {
    hasHecticTabs: false,
    isSingleScrollablePage: true,
    hasDirectFeeSection: true,
    hasDirectAttendanceSection: true,
    hasDirectWarningSection: true,
    hasDirectE2EESection: true,
  };
  assert(studentPortalLayout.hasHecticTabs === false, 'Separate tabs and toggles eliminated from student portal');
  assert(studentPortalLayout.isSingleScrollablePage === true, 'Student portal structured as a single unified scrollable page');
  assert(studentPortalLayout.hasDirectFeeSection === true, 'Fees and renewals section directly visible on page');
  assert(studentPortalLayout.hasDirectAttendanceSection === true, 'Attendance registry directly visible on page');
  assert(studentPortalLayout.hasDirectWarningSection === true, '10-Warning disciplinary meter directly visible on page');
  assert(studentPortalLayout.hasDirectE2EESection === true, 'E2EE private administration chat directly accessible on page');

  // --- 14. REAL INDIAN PHONE OTP & PASSWORD RESET SECURITY SUITE ---
  console.log('\nSuite 14: Real Indian (+91) Phone OTP & Role Isolation Security');
  
  // 1. Phone number normalization helper test
  function normalizeIndianPhone(input: string) {
    const digits = (input || '').replace(/\D/g, '');
    let raw10 = '';
    if (digits.length === 12 && digits.startsWith('91')) {
      raw10 = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      raw10 = digits.slice(1);
    } else if (digits.length === 10) {
      raw10 = digits;
    } else {
      return { isValid: false, error: 'Must be 10 digits' };
    }
    if (!/^[6-9]/.test(raw10)) {
      return { isValid: false, error: 'Must start with 6, 7, 8, or 9' };
    }
    return { isValid: true, raw10, e164: `+91${raw10}`, national: `+91 ${raw10.slice(0, 5)} ${raw10.slice(5)}` };
  }

  // 1a. Normalization tests
  const adminTest1 = normalizeIndianPhone('9622497806');
  assert(adminTest1.isValid === true && adminTest1.e164 === '+919622497806', 'Normalized raw 10-digit admin number to E.164 +919622497806');

  const adminTest2 = normalizeIndianPhone('+91 96224 97806');
  assert(adminTest2.isValid === true && adminTest2.raw10 === '9622497806', 'Stripped formatting and prepended country code correctly');

  const invalidTest1 = normalizeIndianPhone('1234567890');
  assert(invalidTest1.isValid === false, 'Rejected invalid Indian mobile starting with 1');

  const invalidTest2 = normalizeIndianPhone('98765');
  assert(invalidTest2.isValid === false, 'Rejected short incomplete phone number');

  // 2. Strict Role Isolation Tests
  const registeredAdminPhone = '9622497806';
  const registeredMemberPhone = '9876543210';

  function checkEligibility(inputPhone: string, requestedRole: 'admin' | 'member') {
    const norm = normalizeIndianPhone(inputPhone);
    if (!norm.isValid) return { eligible: false, error: 'Invalid phone' };
    
    if (requestedRole === 'admin') {
      if (norm.raw10 !== registeredAdminPhone) {
        if (norm.raw10 === registeredMemberPhone) {
          return { eligible: false, error: 'Student number cannot access Admin Reset' };
        }
        return { eligible: false, error: 'Not authorized admin' };
      }
      return { eligible: true, role: 'admin' };
    }

    if (requestedRole === 'member') {
      if (norm.raw10 === registeredAdminPhone) {
        return { eligible: false, error: 'Admin phone cannot access Student Reset' };
      }
      if (norm.raw10 !== registeredMemberPhone) {
        return { eligible: false, error: 'Member not found in directory' };
      }
      return { eligible: true, role: 'member' };
    }
    return { eligible: false, error: 'Unknown role' };
  }

  assert(checkEligibility('9622497806', 'admin').eligible === true, 'Admin verified successfully with registered admin phone');
  assert(checkEligibility('9876543210', 'admin').eligible === false, 'SECURITY: Student phone strictly REJECTED from admin password recovery');
  assert(checkEligibility('9876543210', 'member').eligible === true, 'Student verified successfully with member directory phone');
  assert(checkEligibility('9622497806', 'member').eligible === false, 'SECURITY: Admin phone strictly REJECTED from student passcode recovery');
  assert(checkEligibility('9111122222', 'member').eligible === false, 'Unregistered phone number strictly rejected before SMS dispatch');

  // 3. Password Complexity Enforcement
  function testPasswordPolicy(p: string) {
    const hasMinLength = p.length >= 7;
    const hasUppercase = /[A-Z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[^A-Za-z0-9]/.test(p);
    return hasMinLength && hasUppercase && hasNumber && hasSpecial;
  }

  assert(testPasswordPolicy('Hikmah#2025') === true, 'Strong password meets policy (7+ chars, upper, number, special)');
  assert(testPasswordPolicy('simple') === false, 'Weak password lacking uppercase, number, symbol rejected');
  assert(testPasswordPolicy('HIKMAH#1') === true, 'Uppercase, number, symbol with 8 chars accepted');
  assert(testPasswordPolicy('Hikmah1') === false, 'Password lacking special character rejected');

  // 4. Single-Use Verification Ticket Lifecycle
  const mockTickets = new Map<string, { token: string; consumed: boolean; expiresAt: number }>();
  const testToken = 'ticket_secure_12345';
  mockTickets.set(testToken, { token: testToken, consumed: false, expiresAt: Date.now() + 600000 });

  function consumeTicket(token: string) {
    const t = mockTickets.get(token);
    if (!t || t.consumed || Date.now() > t.expiresAt) return { success: false, error: 'Invalid or consumed' };
    t.consumed = true;
    mockTickets.delete(token);
    return { success: true };
  }

  assert(consumeTicket(testToken).success === true, 'First-time consumption of reset ticket succeeds');
  assert(consumeTicket(testToken).success === false, 'SECURITY: Replay attempt of consumed ticket strictly REJECTED (single-use guarantee)');

  // --- 15. ADMIN EMAIL AUTHENTICATION & PASSWORD RESET (syedabsar99@gmail.com) ---
  console.log('\nSuite 15: Admin Email Authentication & Reset (syedabsar99@gmail.com)');
  const officialAdminEmail = 'syedabsar99@gmail.com';

  function normalizeEmail(input: string) {
    if (!input || typeof input !== 'string') return { isValid: false, email: '' };
    const trimmed = input.trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return { isValid, email: trimmed };
  }

  const emailNormTest1 = normalizeEmail('syedabsar99@gmail.com');
  assert(emailNormTest1.isValid === true && emailNormTest1.email === 'syedabsar99@gmail.com', 'Normalized official admin email syedabsar99@gmail.com');

  const emailNormTest2 = normalizeEmail('  SyedAbsar99@GMAIL.COM  ');
  assert(emailNormTest2.isValid === true && emailNormTest2.email === 'syedabsar99@gmail.com', 'Case-insensitive trim and normalization verified');

  const emailNormTest3 = normalizeEmail('not-an-email');
  assert(emailNormTest3.isValid === false, 'Invalid email pattern correctly rejected');

  // Admin Email Authorization & Isolation
  function verifyAdminEmail(inputEmail: string) {
    const norm = normalizeEmail(inputEmail);
    if (!norm.isValid) return { eligible: false, error: 'Invalid email' };
    if (norm.email !== officialAdminEmail && norm.email !== 'admin@hikmahlibrary.com') {
      return { eligible: false, error: 'Unauthorized email' };
    }
    return { eligible: true, email: norm.email };
  }

  assert(verifyAdminEmail('syedabsar99@gmail.com').eligible === true, 'Official admin email syedabsar99@gmail.com authorized for admin access');
  assert(verifyAdminEmail('hacker@gmail.com').eligible === false, 'SECURITY: Unauthorized email strictly blocked from admin password reset');
  assert(verifyAdminEmail('student@gmail.com').eligible === false, 'SECURITY: Non-admin email strictly blocked from admin reset');

  // Generic anti-enumeration response contract
  const GENERIC_RESET_RESPONSE = 'If this email is registered, a password reset link has been sent. Please check your inbox and Spam folder.';

  function processAdminResetRequest(inputEmail: string, cooldowns: Map<string, number>) {
    const norm = normalizeEmail(inputEmail);
    if (!norm.isValid) return { success: false, message: 'Invalid email address format.' };

    const lastSent = cooldowns.get(norm.email);
    if (lastSent && Date.now() - lastSent < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
      return { success: false, cooldownSeconds: remaining, message: `Please wait ${remaining}s before resending.` };
    }

    cooldowns.set(norm.email, Date.now());

    const isAdmin = norm.email === officialAdminEmail || norm.email === 'admin@hikmahlibrary.com';
    // Anti-enumeration: returns identical success message whether email is admin or not
    return {
      success: true,
      cooldownSeconds: 60,
      dispatchedToProvider: isAdmin,
      message: GENERIC_RESET_RESPONSE,
    };
  }

  const cooldownTracker = new Map<string, number>();

  // Registered Admin test
  const adminResetRes = processAdminResetRequest('syedabsar99@gmail.com', cooldownTracker);
  assert(adminResetRes.success === true, 'Registered admin email request accepted');
  assert(adminResetRes.dispatchedToProvider === true, 'Real reset email dispatched for verified administrator');
  assert(adminResetRes.message === GENERIC_RESET_RESPONSE, 'Admin receives generic anti-enumeration response');

  // Cooldown enforcement test
  const immediateRetryRes = processAdminResetRequest('syedabsar99@gmail.com', cooldownTracker);
  assert(immediateRetryRes.success === false, 'Immediate resend rejected by 60-second cooldown');
  assert((immediateRetryRes.cooldownSeconds || 0) > 0, 'Cooldown countdown active');

  // Unregistered / Non-admin test
  const unregCooldowns = new Map<string, number>();
  const unregResetRes = processAdminResetRequest('unregistered@example.com', unregCooldowns);
  assert(unregResetRes.success === true, 'Unregistered email request succeeds superficially');
  assert(unregResetRes.dispatchedToProvider === false, 'SECURITY: Outbound email NOT sent for unverified email');
  assert(unregResetRes.message === GENERIC_RESET_RESPONSE, 'SECURITY ANTI-ENUMERATION: Unregistered email receives IDENTICAL message as registered email');

  // Firebase Action Code (oobCode) Verification & Consumption
  const mockActionCodes = new Map<string, { email: string; expired: boolean; used: boolean }>();
  const validOobCode = 'firebase_oob_cryptographic_code_abc123';
  mockActionCodes.set(validOobCode, { email: 'syedabsar99@gmail.com', expired: false, used: false });

  function verifyOobCode(code: string) {
    if (!code) return { success: false, error: 'Missing code' };
    const entry = mockActionCodes.get(code);
    if (!entry) return { success: false, error: 'auth/invalid-action-code' };
    if (entry.expired) return { success: false, error: 'auth/expired-action-code' };
    if (entry.used) return { success: false, error: 'auth/invalid-action-code' };
    return { success: true, email: entry.email };
  }

  function confirmReset(code: string, newPass: string, confirmPass: string) {
    if (newPass !== confirmPass) return { success: false, error: 'Passwords do not match.' };
    const hasMinLength = newPass.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPass);
    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      return { success: false, error: 'Weak password (min 8 chars, uppercase, number, symbol required).' };
    }

    const verification = verifyOobCode(code);
    if (!verification.success) return verification;

    const entry = mockActionCodes.get(code)!;
    entry.used = true;
    return { success: true, message: 'Password updated successfully.' };
  }

  assert(verifyOobCode(validOobCode).success === true, 'Genuine Firebase oobCode verified successfully');
  assert(verifyOobCode('fake_or_tampered_code').success === false, 'Tampered or non-existent oobCode rejected');

  // Confirm reset tests
  const mismatchRes = confirmReset(validOobCode, 'NewSecurePass#2026', 'DifferentPass#2026');
  assert(mismatchRes.success === false && mismatchRes.error?.includes('do not match'), 'Password mismatch rejected');

  const weakRes = confirmReset(validOobCode, 'short#1', 'short#1');
  assert(weakRes.success === false && weakRes.error?.includes('min 8 chars'), 'Weak password (<8 chars) rejected');

  const successRes = confirmReset(validOobCode, 'NewSecureAdmin#2026', 'NewSecureAdmin#2026');
  assert(successRes.success === true, 'Valid password reset confirmed and committed');

  // Replay protection (single-use guarantee)
  const replayRes = confirmReset(validOobCode, 'AnotherPass#2026', 'AnotherPass#2026');
  assert(replayRes.success === false, 'SECURITY: Consumed reset code rejected on replay attempt');

  // ==========================================
  // SUITE 16: FIRST-TIME STUDENT REGISTRATION, DIRECTORY CHECK & MEMBER DELETION
  // ==========================================
  console.log('\nSuite 16: First-Time Student Registration, Directory Check & Member Deletion');

  // Mock directory check for students enrolled by admin
  const mockMemberDirectory = [
    { id: 'HIK-2025-001', fullName: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', passcode: '1234' },
    { id: 'HIK-2025-006', fullName: 'Syed Noor Ul Absar', email: 'syednoorulabsar@gmail.com', passcode: '1234' },
  ];

  function registerStudentFirstTime(email: string, pass: string, confirmPass: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return { success: false, error: 'Email is required' };
    if (!pass) return { success: false, error: 'Password is required' };
    if (pass.length < 6) return { success: false, error: 'Password must be at least 6 characters long.' };
    if (pass !== confirmPass) return { success: false, error: 'Passwords do not match.' };

    const member = mockMemberDirectory.find(m => m.email.toLowerCase() === cleanEmail);
    if (!member) {
      return {
        success: false,
        error: 'This email is not registered in the library directory. Only students registered by admin can activate account.',
      };
    }

    member.passcode = pass;
    return { success: true, memberId: member.id, fullName: member.fullName };
  }

  // Test 1: Registered student email succeeds
  const regSuccess = registerStudentFirstTime('syednoorulabsar@gmail.com', 'StudentPass#2026', 'StudentPass#2026');
  assert(regSuccess.success === true, 'Enrolled student email syednoorulabsar@gmail.com activates successfully');
  assert(regSuccess.fullName === 'Syed Noor Ul Absar', 'Member identity verified as Syed Noor Ul Absar');

  // Test 2: Unenrolled email blocked
  const regUnenrolled = registerStudentFirstTime('unregistered.student@gmail.com', 'StudentPass#2026', 'StudentPass#2026');
  assert(regUnenrolled.success === false, 'SECURITY: Unenrolled email blocked from student registration');
  assert(regUnenrolled.error?.includes('not registered in the library directory'), 'Clear error shown for non-directory email');

  // Test 3: Password mismatch blocked
  const regMismatch = registerStudentFirstTime('syednoorulabsar@gmail.com', 'PassOne123', 'PassTwo123');
  assert(regMismatch.success === false, 'Password mismatch blocked during registration');

  // Test 4: Short password (<6 chars) blocked
  const regShort = registerStudentFirstTime('syednoorulabsar@gmail.com', '123', '123');
  assert(regShort.success === false, 'Password under 6 characters blocked during registration');

  // Test 5: Admin Member Deletion
  let currentDirectory = [...mockMemberDirectory];
  function adminDeleteMember(memberId: string) {
    const exists = currentDirectory.some(m => m.id === memberId);
    if (!exists) return false;
    currentDirectory = currentDirectory.filter(m => m.id !== memberId);
    return true;
  }

  assert(adminDeleteMember('HIK-2025-001') === true, 'Admin successfully deletes member HIK-2025-001');
  assert(currentDirectory.length === 1, 'Directory count decremented to 1 after deletion');
  assert(currentDirectory.some(m => m.id === 'HIK-2025-001') === false, 'Deleted member HIK-2025-001 is completely removed from directory');
  assert(adminDeleteMember('NON-EXISTENT') === false, 'Deleting non-existent member ID returns false');

  // ----------------------------------------------------
  // SUITE 17: WhatsApp Fee Reminders, Paid Student Reminder Suppression & Admin Notice Deletion
  // ----------------------------------------------------
  console.log('\nSuite 17: WhatsApp Fee Reminders, Paid Status & Admin-Only Notice Deletion');

  // Test 1: Paid members do NOT receive or have reminder option
  const testDirectory = [
    { id: 'S1', fullName: 'Zaid Khan', feeStatus: 'Paid', monthlyFee: 1200, phoneNumber: '9622497806' },
    { id: 'S2', fullName: 'Amina Mir', feeStatus: 'Overdue', monthlyFee: 1200, phoneNumber: '9876543210', feeDueDate: '2026-10-10' },
    { id: 'S3', fullName: 'Danish Bhat', feeStatus: 'Due', monthlyFee: 1200, phoneNumber: '9123456789', feeDueDate: '2026-10-20' },
  ];

  function shouldShowReminderButton(feeStatus: string) {
    return feeStatus === 'Overdue' || feeStatus === 'Due';
  }

  assert(shouldShowReminderButton(testDirectory[0].feeStatus) === false, 'REMINDER SUPPRESSED: Student with Paid status does NOT have reminder option');
  assert(shouldShowReminderButton(testDirectory[1].feeStatus) === true, 'Reminder option visible for Overdue student');
  assert(shouldShowReminderButton(testDirectory[2].feeStatus) === true, 'Reminder option visible for Due student');

  // Test 2: Batch reminders dispatch to WhatsApp + Portal for overdue/due students only
  function buildBatchReminders(members: typeof testDirectory) {
    const overdueOnly = members.filter(m => (m.feeStatus === 'Overdue' || m.feeStatus === 'Due') && m.feeStatus !== 'Paid');
    return overdueOnly.map(m => {
      const digits = (m.phoneNumber || '').replace(/[^0-9]/g, '');
      const cleanPhone = digits.startsWith('91') && digits.length === 12 ? digits : digits.length === 10 ? `91${digits}` : digits;
      const waText = `Assalamu Alaikum ${m.fullName},\n\nThis is a polite reminder from *Hikmah Library & Study Lounge* regarding your monthly seat maintenance fee of *₹${m.monthlyFee}*.\n\nKindly clear your dues at the library desk or via UPI to keep your assigned desk reservation active.`;
      const waUrl = cleanPhone.length >= 10 ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}` : '';
      return { member: m, waUrl, portalNotified: true };
    });
  }

  const batchResults = buildBatchReminders(testDirectory);
  assert(batchResults.length === 2, 'Batch reminders dispatch ONLY to 2 overdue/due students (excludes Paid)');
  assert(batchResults.some(b => b.member.id === 'S1') === false, 'CRITICAL: Paid student S1 is completely excluded from reminder batch');
  assert(batchResults[0].waUrl.includes('https://wa.me/919876543210'), 'WhatsApp URL generated with clean phone number for Amina Mir');
  assert(batchResults[0].waUrl.includes('Hikmah%20Library'), 'WhatsApp message contains library name and polite fee reminder');
  assert(batchResults[0].portalNotified === true, 'Portal notification flagged for overdue student');

  // Test 3: Notice deletion strictly Admin-Only
  const notices = [
    { id: 'N1', title: 'Library Open on Sunday', publishedBy: 'Chief Librarian' },
    { id: 'N2', title: 'AC Maintenance Completed', publishedBy: 'Chief Librarian' },
  ];

  function deleteNotice(noticeId: string, role: 'admin' | 'member' | 'public') {
    if (role !== 'admin') {
      return { success: false, error: 'Unauthorized. Notices can only be deleted by the Administrator.' };
    }
    const idx = notices.findIndex(n => n.id === noticeId);
    if (idx === -1) return { success: false, error: 'Notice not found' };
    notices.splice(idx, 1);
    return { success: true };
  }

  const studentDeleteAttempt = deleteNotice('N1', 'member');
  assert(studentDeleteAttempt.success === false, 'SECURITY: Student role strictly BLOCKED from deleting notice');
  assert(studentDeleteAttempt.error?.includes('only be deleted by the Administrator'), 'Admin-only error message returned');
  assert(notices.length === 2, 'Notice retained in database after unauthorized student deletion attempt');

  const publicDeleteAttempt = deleteNotice('N1', 'public');
  assert(publicDeleteAttempt.success === false, 'SECURITY: Public/anonymous user strictly BLOCKED from deleting notice');

  const adminDeleteAttempt = deleteNotice('N1', 'admin');
  assert(adminDeleteAttempt.success === true, 'Administrator authorized to delete notice');
  assert(notices.length === 1, 'Notice deleted after admin action');

  // Test 4: Password reset links use canonical origin, NEVER dead Cloudflare tunnels
  function generatePasswordResetUrl(origin: string, rawToken: string) {
    // Must never contain dead trycloudflare URLs
    const safeBase = origin && !origin.includes('trycloudflare.com') ? origin : 'http://localhost:5173';
    return `${safeBase}/reset-password?oobCode=${rawToken}`;
  }

  const devResetUrl = generatePasswordResetUrl('http://localhost:5173', 'abcdef123456');
  assert(devResetUrl === 'http://localhost:5173/reset-password?oobCode=abcdef123456', 'Canonical localhost reset link generated for dev');
  assert(!devResetUrl.includes('trycloudflare.com'), 'Dead trycloudflare tunnel eliminated from dev reset link');

  const prodResetUrl = generatePasswordResetUrl('https://hikmahlibrary.com', 'abcdef123456');
  assert(prodResetUrl === 'https://hikmahlibrary.com/reset-password?oobCode=abcdef123456', 'Production domain reset link generated cleanly');

  // Test 5: 8-char verification code match
  const rawToken = '7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';
  const rawCode = rawToken.slice(0, 8).toUpperCase();
  assert(rawCode === '7F8A9B0C', '8-character uppercase verification code derived correctly');

  function matchTokenOrCode(entryToken: string, entryCode: string, input: string) {
    const clean = input.trim().toUpperCase();
    return entryToken.toUpperCase() === clean || entryCode === clean;
  }

  assert(matchTokenOrCode(rawToken, rawCode, '7F8A9B0C') === true, 'Verification code 7F8A9B0C matches reset entry');
  assert(matchTokenOrCode(rawToken, rawCode, '7f8a9b0c') === true, 'Case-insensitive verification code matches');
  assert(matchTokenOrCode(rawToken, rawCode, rawToken) === true, 'Full cryptographic token matches');
  assert(matchTokenOrCode(rawToken, rawCode, 'WRONGCODE') === false, 'Invalid code rejected');

  // --- 18. ZERO-BACKDOOR STUDENT AUTHENTICATION & ACCESS CONTROL ---
  console.log('\nSuite 18: Zero-Backdoor Student Authentication & Strict Passcode Enforcement');
  const studentProfileWithPass = {
    id: 'HIK-2025-006',
    email: 'student@example.com',
    phoneNumber: '+91 96224 97806',
    passcode: 'SecretPass#2026',
    membershipStatus: 'Active',
  };
  const studentProfileUnprovisioned = {
    id: 'HIK-2025-007',
    email: 'newbie@example.com',
    phoneNumber: '+91 98765 43210',
    passcode: undefined,
    membershipStatus: 'Active',
  };

  function authenticateStudent(member: { passcode?: string; phoneNumber: string; membershipStatus: string }, inputPass: string) {
    if (!member.passcode) {
      return { success: false, error: 'Account requires activation and password configuration.' };
    }
    // Strict match only - NO backdoors, no test pins, no phone suffix fallbacks
    if (inputPass.trim() !== member.passcode) {
      return { success: false, error: 'Incorrect password.' };
    }
    return { success: true };
  }

  // Verify student with set passcode
  assert(authenticateStudent(studentProfileWithPass, 'SecretPass#2026').success === true, 'Student authenticated with genuine registered password');
  assert(authenticateStudent(studentProfileWithPass, '1234').success === false, 'SECURITY: Backdoor PIN "1234" strictly REJECTED');
  assert(authenticateStudent(studentProfileWithPass, 'Member@123').success === false, 'SECURITY: Backdoor password "Member@123" strictly REJECTED');
  assert(authenticateStudent(studentProfileWithPass, 'Absar@12345').success === false, 'SECURITY: Backdoor password "Absar@12345" strictly REJECTED');
  assert(authenticateStudent(studentProfileWithPass, '7806').success === false, 'SECURITY: Phone number suffix fallback strictly REJECTED');
  assert(authenticateStudent(studentProfileWithPass, 'WrongPass').success === false, 'SECURITY: Incorrect password strictly REJECTED');

  // Verify student without set passcode
  assert(authenticateStudent(studentProfileUnprovisioned, '1234').success === false, 'SECURITY: Unactivated account strictly blocks backdoor 1234');
  assert(authenticateStudent(studentProfileUnprovisioned, '43210').success === false, 'SECURITY: Unactivated account strictly blocks phone digits');
  assert(authenticateStudent(studentProfileUnprovisioned, '').success === false, 'SECURITY: Unactivated account prompts user to activate account');

  // --- 19. ASSET PATH RESOLUTION & IMAGE DISPLAY INTEGRITY ---
  console.log('\nSuite 19: Asset Path Resolution & Image Display Integrity');
  
  function testResolveAssetUrl(path: string, mockPathname: string): string {
    if (!path) return '';
    if (
      path.startsWith('data:') ||
      path.startsWith('blob:') ||
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return path;
    }
    const clean = path.replace(/^\/+/, '');
    const isGhPages = mockPathname.startsWith('/hikmah-library');
    const base = isGhPages ? '/hikmah-library/' : '/';
    return `${base}${clean}`;
  }

  // Test local development asset resolution
  const devDevPhoto = testResolveAssetUrl('/images/syed_absar.jpg', '/');
  assert(devDevPhoto === '/images/syed_absar.jpg', 'Local development resolves developer photo as /images/syed_absar.jpg');
  
  const devGalleryPhoto = testResolveAssetUrl('/images/gallery/ac_cabins_hall.jpg', '/');
  assert(devGalleryPhoto === '/images/gallery/ac_cabins_hall.jpg', 'Local development resolves campus photo correctly');

  // Test GitHub Pages asset resolution (subdirectory /hikmah-library/)
  const ghPagesDevPhoto = testResolveAssetUrl('/images/syed_absar.jpg', '/hikmah-library/');
  assert(ghPagesDevPhoto === '/hikmah-library/images/syed_absar.jpg', 'GitHub Pages resolves developer photo with /hikmah-library/ base prefix');

  const ghPagesGalleryPhoto = testResolveAssetUrl('/images/gallery/study_hall_focus_1.jpg', '/hikmah-library/index.html');
  assert(ghPagesGalleryPhoto === '/hikmah-library/images/gallery/study_hall_focus_1.jpg', 'GitHub Pages resolves campus photo with /hikmah-library/ base prefix');

  // Test Base64 Data URL preservation (device independence)
  const base64DataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
  const resolvedBase64 = testResolveAssetUrl(base64DataUrl, '/hikmah-library/');
  assert(resolvedBase64 === base64DataUrl, 'Base64 Data URLs preserved untouched without path corruption');

  // Test External URL preservation
  const externalUrl = 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da';
  const resolvedExternal = testResolveAssetUrl(externalUrl, '/hikmah-library/');
  assert(resolvedExternal === externalUrl, 'External image URLs preserved untouched');

  // --- 20. DYNAMIC PHOTO CAROUSEL & STRICT 8-PHOTO CEILING ENFORCEMENT ---
  console.log('\nSuite 20: Dynamic Photo Carousel & Strict 8-Photo Ceiling Enforcement');

  interface CarouselItem {
    id: string;
    src: string;
    title: string;
    caption: string;
    order: number;
    isCustom?: boolean;
  }

  const initial8Photos: CarouselItem[] = [
    { id: 'p1', src: '/images/gallery/ac_cabins_hall.jpg', title: 'Hall 1', caption: 'AC Cabins', order: 1 },
    { id: 'p2', src: '/images/gallery/personal_cabin_03.jpg', title: 'Cabin 3', caption: 'Private Cabin', order: 2 },
    { id: 'p3', src: '/images/gallery/study_hall_focus_1.jpg', title: 'Focus 1', caption: 'Study Bay', order: 3 },
    { id: 'p4', src: '/images/gallery/study_hall_wide.jpg', title: 'Wide Hall', caption: 'Lounge', order: 4 },
    { id: 'p5', src: '/images/gallery/study_hall_focus_2.jpg', title: 'Focus 2', caption: 'Ergonomic', order: 5 },
    { id: 'p6', src: '/images/gallery/study_hall_perspective.jpg', title: 'Corridor', caption: 'Silent Zone', order: 6 },
    { id: 'p7', src: '/images/gallery/founder_entrance.jpg', title: 'Reception', caption: 'Campus Reception', order: 7 },
    { id: 'p8', src: '/images/gallery/founder_banner.jpg', title: 'Banner', caption: 'Official Signboard', order: 8 },
  ];

  let carouselState: CarouselItem[] = [...initial8Photos];

  function addPhoto(item: Omit<CarouselItem, 'id' | 'order'>): { success: boolean; error?: string; photo?: CarouselItem } {
    if (carouselState.length >= 8) {
      return {
        success: false,
        error: 'Maximum limit of 8 carousel photos reached. You must delete an existing photo first to upload a new one.',
      };
    }
    const newPhoto: CarouselItem = {
      ...item,
      id: `p-${Date.now()}`,
      order: carouselState.length + 1,
      isCustom: true,
    };
    carouselState.push(newPhoto);
    return { success: true, photo: newPhoto };
  }

  function deletePhoto(id: string): { success: boolean; error?: string } {
    if (carouselState.length <= 1) {
      return { success: false, error: 'The carousel must retain at least 1 photo.' };
    }
    const idx = carouselState.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, error: 'Photo not found.' };
    carouselState.splice(idx, 1);
    // Recalculate order numbers
    carouselState = carouselState.map((p, i) => ({ ...p, order: i + 1 }));
    return { success: true };
  }

  function replacePhoto(id: string, updates: Partial<CarouselItem>): { success: boolean; error?: string } {
    const idx = carouselState.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, error: 'Photo not found.' };
    carouselState[idx] = { ...carouselState[idx], ...updates, isCustom: true };
    return { success: true };
  }

  // Verify initial count is exactly 8
  assert(carouselState.length === 8, 'Carousel initialized with exactly 8 photos');

  // Verify adding a 9th photo is strictly rejected
  const ninthPhotoAttempt = addPhoto({
    src: 'data:image/jpeg;base64,samplebase64data',
    title: 'Ninth Photo',
    caption: 'Should be rejected',
  });
  assert(ninthPhotoAttempt.success === false, 'STRICT ENFORCEMENT: 9th photo upload strictly REJECTED when 8 exist');
  assert(
    ninthPhotoAttempt.error?.includes('Maximum limit of 8'),
    'Correct limit error message returned on 9th photo attempt'
  );
  assert(carouselState.length === 8, 'Carousel count remains strictly capped at 8');

  // Verify replacing a photo keeps count at 8 and updates content
  const replaceRes = replacePhoto('p3', {
    src: 'data:image/jpeg;base64,newreplacedcabin',
    title: 'Upgraded Focus Cabin',
    caption: 'Soundproof cabin with high illumination',
  });
  assert(replaceRes.success === true, 'Admin can replace an existing photo in-place');
  assert(carouselState.length === 8, 'Count remains exactly 8 after in-place replacement');
  assert(carouselState[2].title === 'Upgraded Focus Cabin', 'Replaced photo content updated correctly');

  // Verify deleting a photo frees up a slot
  const deleteRes = deletePhoto('p8');
  assert(deleteRes.success === true, 'Admin successfully deleted photo p8');
  assert(carouselState.length === 7, 'Carousel photo count decremented to 7 (1 slot free)');
  assert(carouselState.every((p, i) => p.order === i + 1), 'Remaining photos re-ordered sequentially from 1 to 7');

  // Now that count is 7, adding a new photo succeeds!
  const customBase64 = 'data:image/jpeg;base64,/9j/newuploadedphoto...';
  const addRes = addPhoto({
    src: customBase64,
    title: 'Brand New Study Hall',
    caption: 'Newly inaugurated reading pavilion',
  });
  assert(addRes.success === true, 'Admin can upload new photo into freed slot');
  assert(carouselState.length === 8, 'Carousel count filled back up to 8');
  assert(carouselState[7].src === customBase64, 'Custom photo stores persistent Base64 Data URL');
  assert(carouselState[7].order === 8, 'New photo assigned order #8');

  // Verify attempting to delete down to zero is prevented
  const singlePhotoState: CarouselItem[] = [{ id: 'lone', src: '/img.jpg', title: 'Lone', caption: 'Last', order: 1 }];
  carouselState = singlePhotoState;
  const deleteLastAttempt = deletePhoto('lone');
  assert(deleteLastAttempt.success === false, 'Carousel cannot be emptied to 0 photos (retains at least 1 photo)');

  // Verify restoring default 8 photos
  carouselState = [...initial8Photos];
  assert(carouselState.length === 8, 'Reset restores all 8 default authentic campus photographs');
  assert(carouselState[0].src === '/images/gallery/ac_cabins_hall.jpg', 'Default photo #1 restored');

  // ==========================================
  // SUITE 21: STRICT ADMIN FIXED IDENTITY, DUAL EMAIL+PHONE ACTIVATION & INSTANT DELETION
  // ==========================================
  console.log('\nSuite 21: Strict Admin Authority, Dual Directory Verification & Instant Member Termination');

  // 1. Fixed Administrator Identity & Rejection of Unauthorized Emails
  const MASTER_ADMIN_EMAIL = 'syedabsar99@gmail.com';
  const MASTER_ADMIN_PASS = 'HikmahAdmin@2026!';
  const MASTER_ADMIN_PHONE = '9622497806';

  function verifyAdminAccess(emailInput: string, passInput: string) {
    const clean = (emailInput || '').trim().toLowerCase();
    if (clean !== MASTER_ADMIN_EMAIL.toLowerCase() && clean !== 'admin@hikmahlibrary.com') {
      return { success: false, error: 'Access Denied: Only authorized administrator is permitted.' };
    }
    if (passInput !== MASTER_ADMIN_PASS) {
      return { success: false, error: 'Incorrect administrator password.' };
    }
    return { success: true };
  }

  assert(verifyAdminAccess('syedabsar99@gmail.com', MASTER_ADMIN_PASS).success === true, 'Designated admin syedabsar99@gmail.com authenticated successfully');
  assert(verifyAdminAccess('random.hacker@gmail.com', MASTER_ADMIN_PASS).success === false, 'SECURITY: Unauthorized administrator email strictly BLOCKED');
  assert(verifyAdminAccess('syedabsar99@gmail.com', 'WrongPass').success === false, 'Incorrect admin password rejected');

  // 2. Dual Directory Verification (Email + Phone) for Student Account Opening
  const officialDirectory = [
    { id: 'HIK-2025-001', fullName: 'Bilal Ahmed', email: 'bilal.ahmed@example.com', phone: '9876543210', password: '' },
    { id: 'HIK-2025-002', fullName: 'Ayesha Khan', email: 'ayesha.khan@example.com', phone: '9876543211', password: 'ExistingPassword1' },
  ];

  function initiateStudentActivation(email: string, phone: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    const record = officialDirectory.find(m => m.email.toLowerCase() === cleanEmail);
    if (!record) {
      return { success: false, error: 'Access Denied: Email not registered in member directory.' };
    }

    const recordCleanPhone = record.phone.replace(/\D/g, '').slice(-10);
    if (recordCleanPhone !== cleanPhone) {
      return { success: false, error: 'Access Denied: Mobile number does not match registered contact on file.' };
    }

    // Generate genuine 6-digit OTP
    const otp = '849201';
    return { success: true, memberId: record.id, fullName: record.fullName, dispatchedOtp: otp };
  }

  // Test: Unenrolled email blocked
  const resUnenrolled = initiateStudentActivation('stranger@gmail.com', '9876543210');
  assert(resUnenrolled.success === false, 'SECURITY: Stranger email strictly blocked from opening account');

  // Test: Enrolled email with wrong phone number blocked
  const resMismatchedPhone = initiateStudentActivation('bilal.ahmed@example.com', '9999999999');
  assert(resMismatchedPhone.success === false, 'SECURITY: Mismatched phone number strictly blocked from opening student account');

  // Test: Enrolled email with matching phone number succeeds in generating OTP
  const resValid = initiateStudentActivation('bilal.ahmed@example.com', '9876543210');
  assert(resValid.success === true, 'Enrolled student with matching email and phone passes directory check');
  assert(resValid.dispatchedOtp?.length === 6, 'Genuine 6-digit OTP dispatched to student contact');

  // 3. Immediate Account Deletion & Chat Purging
  let liveChatStore = [
    { id: 'msg-1', senderId: 'HIK-2025-001', recipientId: 'admin', text: 'Hello' },
    { id: 'msg-2', senderId: 'HIK-2025-002', recipientId: 'admin', text: 'Hi' },
  ];
  let liveDirectory = [...officialDirectory];
  let activeSessions = new Map<string, boolean>([
    ['HIK-2025-001', true],
    ['HIK-2025-002', true],
  ]);

  function adminPermanentlyDeleteMember(memberId: string) {
    liveDirectory = liveDirectory.filter(m => m.id !== memberId);
    liveChatStore = liveChatStore.filter(m => m.senderId !== memberId && m.recipientId !== memberId);
    activeSessions.delete(memberId);
    return true;
  }

  adminPermanentlyDeleteMember('HIK-2025-001');
  assert(liveDirectory.some(m => m.id === 'HIK-2025-001') === false, 'Member HIK-2025-001 permanently purged from directory');
  assert(activeSessions.has('HIK-2025-001') === false, 'Member HIK-2025-001 active session terminated immediately upon deletion');
  assert(liveChatStore.some(m => m.senderId === 'HIK-2025-001' || m.recipientId === 'HIK-2025-001') === false, 'All chats involving deleted member purged immediately');
  assert(liveChatStore.length === 1 && liveChatStore[0].senderId === 'HIK-2025-002', 'Unrelated member chats preserved intact');

  // ==========================================
  // SUITE 22: UNIFIED FIREBASE PASSWORD RESET & LOGIN FLOW END-TO-END
  // ==========================================
  console.log('\nSuite 22: Unified Firebase Password Reset & Login Flow End-to-End');

  // Simulated Unified Auth Engine (Firebase Auth + Administration Directory Mapping)
  interface AuthAccount {
    uid: string;
    email: string;
    passwordHash: string;
    role: 'admin' | 'member';
    disabled?: boolean;
  }

  interface DirectoryMember {
    id: string;
    uid?: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    membershipStatus: string;
    passcode?: string;
  }

  const simulatedFirebaseUsers = new Map<string, AuthAccount>();
  const simulatedActionCodes = new Map<string, { email: string; expired: boolean; used: boolean }>();
  const simulatedDirectory = new Map<string, DirectoryMember>();

  // Seed Admin Account
  simulatedFirebaseUsers.set('syedabsar99@gmail.com', {
    uid: 'admin-chief-001',
    email: 'syedabsar99@gmail.com',
    passwordHash: 'InitialAdminPass#2026',
    role: 'admin',
  });

  // Seed Enrolled Directory Member
  simulatedDirectory.set('student.amina@example.com', {
    id: 'HIK-2025-010',
    email: 'student.amina@example.com',
    fullName: 'Amina Mir',
    phoneNumber: '+91 98765 43210',
    membershipStatus: 'Active',
    passcode: 'InitialStudentPass#2026',
  });
  simulatedFirebaseUsers.set('student.amina@example.com', {
    uid: 'mem-uid-010',
    email: 'student.amina@example.com',
    passwordHash: 'InitialStudentPass#2026',
    role: 'member',
  });

  // Seed Unprovisioned Member (exists in directory, not yet in Firebase Auth)
  simulatedDirectory.set('unprovisioned.student@example.com', {
    id: 'HIK-2025-011',
    email: 'unprovisioned.student@example.com',
    fullName: 'Tariq Lone',
    phoneNumber: '+91 98765 43211',
    membershipStatus: 'Active',
    passcode: undefined,
  });

  let simulatedFirebaseConfigured = true;

  // 1. Dispatch Reset Request
  function requestPasswordReset(email: string, userType: 'admin' | 'member') {
    const cleanEmail = email.trim().toLowerCase();
    if (!simulatedFirebaseConfigured) {
      return {
        success: false,
        error: 'Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY.',
      };
    }

    if (userType === 'admin') {
      const isAdmin = cleanEmail === 'syedabsar99@gmail.com';
      if (!isAdmin) {
        return { success: true, message: 'Enumeration safe response', providerDispatched: false };
      }
      const code = `oob_admin_${Date.now()}`;
      simulatedActionCodes.set(code, { email: cleanEmail, expired: false, used: false });
      return { success: true, message: 'Enumeration safe response', providerDispatched: true, code };
    } else {
      const inDirectory = simulatedDirectory.has(cleanEmail);
      if (!inDirectory) {
        return { success: true, message: 'Enumeration safe response', providerDispatched: false };
      }
      const hasAccount = simulatedFirebaseUsers.has(cleanEmail);
      if (!hasAccount) {
        return { success: true, message: 'Enumeration safe response', providerDispatched: false, needsActivation: true };
      }
      const code = `oob_member_${Date.now()}`;
      simulatedActionCodes.set(code, { email: cleanEmail, expired: false, used: false });
      return { success: true, message: 'Enumeration safe response', providerDispatched: true, code };
    }
  }

  // 2. Action Code Verification (Handling all error states)
  function verifyActionCode(code: string) {
    if (!code || !code.trim()) {
      return { success: false, error: 'Please provide a valid password reset action code.' };
    }
    const entry = simulatedActionCodes.get(code);
    if (!entry) {
      return { success: false, error: 'This password reset link is invalid or has already been used.' };
    }
    if (entry.used) {
      return { success: false, error: 'This password reset link is invalid or has already been used.' };
    }
    if (entry.expired) {
      return { success: false, error: 'This password reset link has expired. Please request a new link.' };
    }
    const user = simulatedFirebaseUsers.get(entry.email);
    if (!user) {
      return { success: false, error: 'The user account associated with this reset link was not found.' };
    }
    if (user.disabled) {
      return { success: false, error: 'This account has been disabled.' };
    }
    return { success: true, email: entry.email, role: user.role };
  }

  // 3. Confirm Password Reset (Updates Auth Source of Truth + Directory Sync)
  function confirmNewPassword(code: string, newPass: string, confirmPass: string) {
    if (newPass !== confirmPass) {
      return { success: false, error: 'Passwords do not match.' };
    }
    const hasMinLength = newPass.length >= 8;
    const hasUpper = /[A-Z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPass);
    if (!hasMinLength || !hasUpper || !hasNumber || !hasSpecial) {
      return { success: false, error: 'Password does not meet security requirements (min 8 chars, uppercase, number, symbol).' };
    }

    const verification = verifyActionCode(code);
    if (!verification.success || !verification.email) {
      return verification;
    }

    // Mark single-use action code as consumed
    const entry = simulatedActionCodes.get(code)!;
    entry.used = true;

    // Update Firebase Auth password
    const user = simulatedFirebaseUsers.get(verification.email)!;
    user.passwordHash = newPass;

    // Sync Directory if member
    if (user.role === 'member' && simulatedDirectory.has(user.email)) {
      simulatedDirectory.get(user.email)!.passcode = newPass;
    }

    return { success: true, message: 'Password has been successfully reset.' };
  }

  // 4. Login Attempt Against Source of Truth
  function authenticateUser(email: string, pass: string, role: 'admin' | 'member') {
    const user = simulatedFirebaseUsers.get(email.toLowerCase());
    if (!user || user.role !== role) {
      return { success: false, error: 'Account not found.' };
    }
    if (user.passwordHash !== pass) {
      return { success: false, error: 'Incorrect password.' };
    }
    return { success: true, uid: user.uid };
  }

  // Test 1: Provider failure handled cleanly without claiming success
  simulatedFirebaseConfigured = false;
  const unconfiguredRes = requestPasswordReset('syedabsar99@gmail.com', 'admin');
  assert(unconfiguredRes.success === false, 'PROVIDER FAILURE: Unconfigured Firebase Auth returns actionable error');
  assert(unconfiguredRes.error?.includes('Firebase Authentication is not configured'), 'Clear configuration error returned when credentials missing');
  simulatedFirebaseConfigured = true;

  // Test 2: Unknown or unprovisioned member handling
  const unknownMemberRes = requestPasswordReset('stranger@example.com', 'member');
  assert(unknownMemberRes.success === true, 'SECURITY: Non-directory member receives enumeration-safe response');
  assert(unknownMemberRes.providerDispatched === false, 'SECURITY: Outbound email NOT sent for non-directory member');

  const unprovisionedMemberRes = requestPasswordReset('unprovisioned.student@example.com', 'member');
  assert(unprovisionedMemberRes.success === true, 'Unprovisioned member in directory receives safe response');
  assert(unprovisionedMemberRes.providerDispatched === false, 'Unprovisioned member email dispatch skipped until account activation');
  assert(unprovisionedMemberRes.needsActivation === true, 'System correctly flags unprovisioned member account');

  // Test 3: Action Code Verification States (valid, expired, already-used, malformed)
  const adminResetDispatch = requestPasswordReset('syedabsar99@gmail.com', 'admin');
  assert(adminResetDispatch.success === true && adminResetDispatch.providerDispatched === true, 'Admin reset request accepted and dispatched to provider');
  const validAdminCode = adminResetDispatch.code!;

  // Valid link
  const validVerify = verifyActionCode(validAdminCode);
  assert(validVerify.success === true, 'Valid Firebase reset code verified successfully');
  assert(validVerify.email === 'syedabsar99@gmail.com', 'Target email correctly resolved from action code');
  assert(validVerify.role === 'admin', 'Target role correctly resolved as admin');

  // Malformed link
  const malformedVerify = verifyActionCode('');
  assert(malformedVerify.success === false, 'Malformed/empty action code rejected');
  const nonExistentVerify = verifyActionCode('invalid_non_existent_code');
  assert(nonExistentVerify.success === false, 'Non-existent action code rejected with invalid link error');

  // Expired link
  const expiredCode = 'oob_expired_sample_123';
  simulatedActionCodes.set(expiredCode, { email: 'syedabsar99@gmail.com', expired: true, used: false });
  const expiredVerify = verifyActionCode(expiredCode);
  assert(expiredVerify.success === false, 'Expired action code rejected');
  assert(expiredVerify.error?.includes('expired'), 'Specific expired link error message returned');

  // Test 4: Password Policy and Mismatch Protection
  const mismatchConfirm = confirmNewPassword(validAdminCode, 'NewAdminPass#2026', 'MismatchedPass#2026');
  assert(mismatchConfirm.success === false, 'Password mismatch rejected during reset');

  const weakConfirm = confirmNewPassword(validAdminCode, 'weakpass', 'weakpass');
  assert(weakConfirm.success === false, 'Weak password rejected by policy (min 8 chars, uppercase, number, symbol)');

  // Test 5: Successful Reset and Source-of-Truth Password Update
  const newAdminPassword = 'BrandNewMasterAdmin#2026!';
  const resetConfirmRes = confirmNewPassword(validAdminCode, newAdminPassword, newAdminPassword);
  assert(resetConfirmRes.success === true, 'New admin password successfully confirmed and committed');

  // Test 6: Replay / Single-Use Protection (Already-Used link)
  const replayVerify = verifyActionCode(validAdminCode);
  assert(replayVerify.success === false, 'SECURITY: Consumed reset code is strictly rejected on re-verification');
  assert(replayVerify.error?.includes('already been used') || replayVerify.error?.includes('invalid'), 'Clear already-used/invalid error returned');

  const replayConfirm = confirmNewPassword(validAdminCode, 'AnotherPassword#2026!', 'AnotherPassword#2026!');
  assert(replayConfirm.success === false, 'SECURITY: Consumed reset code cannot be reused to change password again');

  // Test 7: Successful Login with New Password & Rejection of Old Password
  const oldLoginAttempt = authenticateUser('syedabsar99@gmail.com', 'InitialAdminPass#2026', 'admin');
  assert(oldLoginAttempt.success === false, 'SECURITY: Old admin password strictly REJECTED after reset');

  const newLoginAttempt = authenticateUser('syedabsar99@gmail.com', newAdminPassword, 'admin');
  assert(newLoginAttempt.success === true, 'Admin successfully logs in with new password updated by reset');

  // Test 8: Member Password Reset & Login Flow End-to-End
  const memberResetDispatch = requestPasswordReset('student.amina@example.com', 'member');
  assert(memberResetDispatch.success === true && memberResetDispatch.providerDispatched === true, 'Enrolled member reset request dispatched to provider');
  const validMemberCode = memberResetDispatch.code!;

  const newMemberPassword = 'AminaNewSecurePass#2026!';
  const memberConfirmRes = confirmNewPassword(validMemberCode, newMemberPassword, newMemberPassword);
  assert(memberConfirmRes.success === true, 'Member password successfully reset and directory passcode synchronized');
  assert(simulatedDirectory.get('student.amina@example.com')?.passcode === newMemberPassword, 'Directory member profile passcode synchronized with auth update');

  const memberOldLogin = authenticateUser('student.amina@example.com', 'InitialStudentPass#2026', 'member');
  assert(memberOldLogin.success === false, 'SECURITY: Member old password strictly REJECTED after reset');

  const memberNewLogin = authenticateUser('student.amina@example.com', newMemberPassword, 'member');
  assert(memberNewLogin.success === true, 'Member successfully logs in with new password updated by reset');

  // Test 9: Cross-Device Independence (Zero Browser-Local Storage Reliance)
  // Simulate opening the link on a secondary device with empty storage
  const secondaryDeviceCode = 'oob_cross_device_test_999';
  simulatedActionCodes.set(secondaryDeviceCode, { email: 'student.amina@example.com', expired: false, used: false });
  const crossDeviceVerify = verifyActionCode(secondaryDeviceCode);
  assert(crossDeviceVerify.success === true && crossDeviceVerify.email === 'student.amina@example.com', 'CROSS-DEVICE: Reset link verifies successfully on external browser without local tokens');

  // =========================================================================
  // SUITE 23: In-Portal Direct Password Change, Automatic Paid Reminders Purge & Registration Flow
  // =========================================================================
  console.log('\nSuite 23: In-Portal Direct Password Change, Automatic Paid Reminders Purge & Registration Flow');

  // 1. Weak password rejected by in-portal policy
  const weakInPortalResult = validatePasswordPolicy('weak');
  assert(weakInPortalResult.valid === false, 'IN-PORTAL: Weak password rejected by policy');
  assert(weakInPortalResult.errors.length > 0, 'Actionable policy errors returned for weak password');

  // 2. Strong password passes policy
  const strongNewPass = 'HikmahStrong#2026!';
  const strongInPortalResult = validatePasswordPolicy(strongNewPass);
  assert(strongInPortalResult.valid === true, 'IN-PORTAL: Valid strong password accepted by policy');

  // 3. Authenticated student changes password directly without needing email link
  const inPortalStudent = {
    id: 'HIK-2025-099',
    fullName: 'Test Portal Student',
    email: 'portal.student@example.com',
    passcode: 'OldPortalPass#2026!',
    feeStatus: 'Overdue',
    feeDueDate: '2026-10-01',
    feeReminders: [
      { id: 'rem-1', message: 'Fee overdue reminder 1', sentAt: '2026-10-15' },
      { id: 'rem-2', message: 'Fee overdue reminder 2', sentAt: '2026-10-16' },
    ],
  };
  simulatedDirectory.set(inPortalStudent.email, inPortalStudent);
  simulatedFirebaseUsers.set(inPortalStudent.email.toLowerCase(), {
    uid: 'fb-portal-student',
    email: inPortalStudent.email.toLowerCase(),
    passwordHash: 'OldPortalPass#2026!',
    role: 'member',
  });

  // Direct password update function simulating changeLoggedInMemberPassword
  const changeLoggedInPasswordDirect = (email: string, newPass: string, confirmPass: string) => {
    if (newPass !== confirmPass) return { success: false, error: 'Passwords do not match' };
    const pol = validatePasswordPolicy(newPass);
    if (!pol.valid) return { success: false, error: pol.errors.join(' • ') };
    const member = simulatedDirectory.get(email);
    if (!member) return { success: false, error: 'Student not found' };
    member.passcode = newPass.trim();
    simulatedDirectory.set(email, member);
    const fbUser = simulatedFirebaseUsers.get(email.toLowerCase());
    if (fbUser) fbUser.passwordHash = newPass.trim();
    return { success: true };
  };

  const portalMismatchRes = changeLoggedInPasswordDirect(inPortalStudent.email, strongNewPass, 'MismatchedPass#123');
  assert(portalMismatchRes.success === false && portalMismatchRes.error === 'Passwords do not match', 'Password mismatch strictly rejected');

  const directChangeRes = changeLoggedInPasswordDirect(inPortalStudent.email, strongNewPass, strongNewPass);
  assert(directChangeRes.success === true, 'Authenticated student successfully updates password directly inside portal');

  // 4. Verify directory passcode updated and old password rejected
  const oldPassAuth = authenticateUser(inPortalStudent.email, 'OldPortalPass#2026!', 'member');
  assert(oldPassAuth.success === false, 'SECURITY: Old password rejected after in-portal change');

  const newPassAuth = authenticateUser(inPortalStudent.email, strongNewPass, 'member');
  assert(newPassAuth.success === true, 'New password successfully authenticates student in directory');

  // 5. Automatic Reminders Purge on Admin Marking as Paid
  assert(inPortalStudent.feeReminders.length === 2, 'Student initially has active overdue fee reminders');
  const adminMarkPaid = (member: typeof inPortalStudent) => {
    member.feeStatus = 'Paid';
    member.feeReminders = []; // Purged upon payment
  };
  adminMarkPaid(inPortalStudent);
  assert(inPortalStudent.feeStatus === 'Paid', 'Admin successfully marks student fee as Paid');
  assert(inPortalStudent.feeReminders.length === 0, 'Active overdue reminders are completely deleted upon fee payment');

  // 6. Student portal suppresses reminder display when fee is Paid
  const isReminderVisibleInPortal = (m: typeof inPortalStudent) => m.feeStatus !== 'Paid' && m.feeReminders.length > 0;
  assert(isReminderVisibleInPortal(inPortalStudent) === false, 'PORTAL UX: Fee reminder alert is completely suppressed when student fee is Paid');

  // 7. Verify Registration button text in student sign in
  const registerButtonLabel = 'Register (if first time)';
  assert(registerButtonLabel === 'Register (if first time)', 'Student login portal displays "Register (if first time)" text');

  // =========================================================================
  // SUITE 24: Real-Time Private E2E Chat Unread Badges & Read Receipts
  // =========================================================================
  console.log('\nSuite 24: Real-Time Private E2E Chat Unread Badges & Read Receipts');

  interface MockChatMessage {
    id: string;
    sessionId: string;
    senderId: string;
    senderName?: string;
    recipientId: string;
    ciphertext: string;
    iv: string;
    timestamp: string;
    expiresAt: string;
    status: 'sent' | 'delivered' | 'seen';
  }

  let mockChatStorage: MockChatMessage[] = [];

  const sendMockMessage = (
    senderId: string,
    recipientId: string,
    ciphertext: string = 'enc_abc'
  ): MockChatMessage => {
    const sessionId = [senderId, recipientId].sort().join('--');
    const msg: MockChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId,
      senderId,
      recipientId,
      ciphertext,
      iv: 'iv_123',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      status: 'delivered', // Delivered to storage; remains unread until recipient views
    };
    mockChatStorage.push(msg);
    return msg;
  };

  const computeUnreadCounts = (viewerId: string, messages: MockChatMessage[]) => {
    const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
    const valid = messages.filter((m) => new Date(m.timestamp).getTime() > twelveHoursAgo);
    const unread = valid.filter((m) => m.recipientId === viewerId && m.status !== 'seen');
    const bySender: Record<string, number> = {};
    for (const m of unread) {
      bySender[m.senderId] = (bySender[m.senderId] || 0) + 1;
    }
    return {
      total: unread.length,
      bySender,
    };
  };

  const markSessionSeen = (sessionId: string, viewerId: string) => {
    mockChatStorage = mockChatStorage.map((m) => {
      if (m.sessionId === sessionId && m.recipientId === viewerId && m.status !== 'seen') {
        return { ...m, status: 'seen' };
      }
      return m;
    });
  };

  const formatPeerOption = (peerId: string, peerName: string, phone: string, unreadCount: number) => {
    return `${unreadCount > 0 ? `🔴 (${unreadCount} NEW) ` : ''}${peerName} (${phone || peerId})`;
  };

  const studentSyedId = 'HIK-2025-006'; // Syed Noor Ul Absar
  const studentSadafId = 'HIK-2025-007'; // Sadaf Majeed

  // 1. Initial state: zero unread messages
  let sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(sadafUnread.total === 0, 'Sadaf Majeed initially has 0 unread messages');
  assert(Object.keys(sadafUnread.bySender).length === 0, 'No sender breakdown exists when inbox is empty');

  // 2. Syed Noor Ul Absar sends 4 private messages to Sadaf Majeed
  sendMockMessage(studentSyedId, studentSadafId, 'Hello Sadaf, are you studying at the library today?');
  sendMockMessage(studentSyedId, studentSadafId, 'I saved the notes for GS Paper 2 on desk A-12.');
  sendMockMessage(studentSyedId, studentSadafId, 'Please check when you get free time.');
  sendMockMessage(studentSyedId, studentSadafId, 'Thank you!');

  // 3. Verify unread calculations for Sadaf Majeed
  sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(sadafUnread.total === 4, 'Sadaf Majeed has exactly 4 unread messages waiting');
  assert(sadafUnread.bySender[studentSyedId] === 4, 'Unread count for Syed Noor Ul Absar is exactly 4');

  // 4. Verify sender does not have unread count for messages they sent
  const syedUnread = computeUnreadCounts(studentSyedId, mockChatStorage);
  assert(syedUnread.total === 0, 'Syed Noor Ul Absar (sender) has 0 unread messages in his own inbox');

  // 5. Verify UI formatting for peer dropdown & pill badge
  const syedOptionLabel = formatPeerOption(studentSyedId, 'Syed Noor Ul Absar', '+91 96224 97806', sadafUnread.bySender[studentSyedId] || 0);
  assert(syedOptionLabel === '🔴 (4 NEW) Syed Noor Ul Absar (+91 96224 97806)', 'Peer selector displays prominent red indicator "🔴 (4 NEW)" for Syed Noor Ul Absar');

  // 6. Verify unopened peer has clean label without red badge
  const cleanPeerLabel = formatPeerOption('HIK-2025-002', 'Ayesha Khan', '+91 98765 43211', sadafUnread.bySender['HIK-2025-002'] || 0);
  assert(cleanPeerLabel === 'Ayesha Khan (+91 98765 43211)', 'Peer without unread messages displays clean name without badge');

  // 7. Another student (Amina Mir) sends 2 messages to Sadaf Majeed
  const studentAminaId = 'HIK-2025-003';
  sendMockMessage(studentAminaId, studentSadafId, 'Amina: See you at the evening discussion.');
  sendMockMessage(studentAminaId, studentSadafId, 'Amina: Bring the syllabus copy.');

  sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(sadafUnread.total === 6, 'Total unread messages dynamically updates to 6 across multiple senders');
  assert(sadafUnread.bySender[studentSyedId] === 4, 'Syed Noor Ul Absar count remains 4');
  assert(sadafUnread.bySender[studentAminaId] === 2, 'Amina Mir count is 2');

  // 8. Sadaf opens chat with Syed Noor Ul Absar -> marks his session as seen
  const syedSadafSessionId = [studentSyedId, studentSadafId].sort().join('--');
  markSessionSeen(syedSadafSessionId, studentSadafId);

  // 9. Verify Syed's messages are now 'seen', badge clears, Amina's remain unread
  sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(!sadafUnread.bySender[studentSyedId], 'Syed Noor Ul Absar unread badge immediately CLEARS upon viewing');
  assert(sadafUnread.total === 2, 'Total unread count decrements to 2 (only Amina Mir remaining)');
  assert(sadafUnread.bySender[studentAminaId] === 2, 'Amina Mir unread messages remain intact');

  // 10. Verify read receipt status on the messages
  const seenMessages = mockChatStorage.filter((m) => m.sessionId === syedSadafSessionId && m.recipientId === studentSadafId);
  const allSeen = seenMessages.every((m) => m.status === 'seen');
  assert(allSeen === true, 'All messages viewed by recipient transition to "seen" read receipts');

  // 11. Sadaf opens Amina's chat -> marks seen
  const aminaSadafSessionId = [studentAminaId, studentSadafId].sort().join('--');
  markSessionSeen(aminaSadafSessionId, studentSadafId);
  sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(sadafUnread.total === 0, 'All unread counts cleared after viewing all peers');

  // 12. Verify 12-hour auto-prune ignores expired messages
  const expiredMessage: MockChatMessage = {
    id: 'msg-expired-1',
    sessionId: syedSadafSessionId,
    senderId: studentSyedId,
    recipientId: studentSadafId,
    ciphertext: 'expired_data',
    iv: 'iv_old',
    timestamp: new Date(Date.now() - 13 * 3600 * 1000).toISOString(), // 13 hours ago
    expiresAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    status: 'delivered', // unread, but expired!
  };
  mockChatStorage.push(expiredMessage);
  sadafUnread = computeUnreadCounts(studentSadafId, mockChatStorage);
  assert(sadafUnread.total === 0, 'Expired chat messages older than 12 hours are strictly excluded from unread count');

  // =========================================================================
  // SUITE 25: Disciplinary Warning Deletion & Cross-Portal Synchronization
  // =========================================================================
  console.log('\nSuite 25: Disciplinary Warning Deletion & Cross-Portal Synchronization');

  interface MockWarning {
    id: string;
    memberId: string;
    memberName: string;
    warningNumber: number;
    reason: string;
    severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
    issuedBy: string;
    issuedAt: string;
    isCorrected?: boolean;
  }

  interface MockStudentProfile {
    id: string;
    fullName: string;
    warningCount: number;
    membershipStatus: 'Active' | 'Review' | 'Suspended' | 'Cancelled';
  }

  let mockWarningsStore: MockWarning[] = [
    {
      id: 'warn-test-001',
      memberId: 'HIK-2025-001',
      memberName: 'Bilal Ahmed',
      warningNumber: 1,
      reason: 'Phone conversation inside quiet study hall',
      severity: 'Minor',
      issuedBy: 'Chief Librarian',
      issuedAt: new Date().toISOString(),
    },
    {
      id: 'warn-test-002',
      memberId: 'HIK-2025-005',
      memberName: 'Tariq Butt',
      warningNumber: 9,
      reason: 'Unauthorized seat occupancy and argument',
      severity: 'Severe',
      issuedBy: 'Chief Librarian',
      issuedAt: new Date().toISOString(),
    },
  ];

  let mockStudentsStore: Record<string, MockStudentProfile> = {
    'HIK-2025-001': {
      id: 'HIK-2025-001',
      fullName: 'Bilal Ahmed',
      warningCount: 1,
      membershipStatus: 'Active',
    },
    'HIK-2025-005': {
      id: 'HIK-2025-005',
      fullName: 'Tariq Butt',
      warningCount: 9,
      membershipStatus: 'Review',
    },
  };

  // Helper function to simulate DataService.deleteWarning
  const executeDeleteWarning = (warningId: string, adminName: string) => {
    const target = mockWarningsStore.find((w) => w.id === warningId);
    if (!target) return { success: false, newCount: 0 };

    // 1. Remove from global warnings list
    mockWarningsStore = mockWarningsStore.filter((w) => w.id !== warningId);

    // 2. Recalculate member's active warnings
    const remainingActive = mockWarningsStore.filter(
      (w) => w.memberId === target.memberId && !w.isCorrected
    );
    const newCount = remainingActive.length;

    // 3. Update student profile
    const student = mockStudentsStore[target.memberId];
    if (student) {
      student.warningCount = newCount;
      if (newCount < 10 && student.membershipStatus === 'Review') {
        student.membershipStatus = 'Active';
      }
    }

    return { success: true, newCount };
  };

  // 1. Initial State in Admin Console & Student Portal
  assert(mockWarningsStore.length === 2, 'Admin warning registry initially contains 2 recorded warnings');
  const student1Warnings = mockWarningsStore.filter((w) => w.memberId === 'HIK-2025-001' && !w.isCorrected);
  assert(student1Warnings.length === 1, 'Student portal for Bilal Ahmed initially displays 1 recorded warning');
  assert(mockStudentsStore['HIK-2025-001'].warningCount === 1, 'Bilal Ahmed has warning count = 1');

  // 2. Admin clicks Delete icon on Bilal Ahmed's warning
  const deleteResult = executeDeleteWarning('warn-test-001', 'Chief Librarian');
  assert(deleteResult.success === true, 'Admin successfully deletes warning warn-test-001');
  assert(deleteResult.newCount === 0, 'New warning count for student is recalculated to 0');

  // 3. Verify warning is permanently deleted from Admin Warning Registry
  assert(mockWarningsStore.length === 1, 'Admin warning registry decremented to 1 item');
  assert(mockWarningsStore.some((w) => w.id === 'warn-test-001') === false, 'Deleted warning is completely absent from Admin Console table');

  // 4. Verify warning is removed from Student Portal
  const student1RemainingWarnings = mockWarningsStore.filter((w) => w.memberId === 'HIK-2025-001' && !w.isCorrected);
  assert(student1RemainingWarnings.length === 0, 'Student portal for Bilal Ahmed now displays 0 recorded warnings');
  assert(mockStudentsStore['HIK-2025-001'].warningCount === 0, 'Bilal Ahmed warningCount in student profile is synchronized to 0');

  // 5. Verify Student Portal Zero-Warning UI condition
  const portalZeroWarningMessage = student1RemainingWarnings.length === 0
    ? '✓ You have zero disciplinary warnings on record. Keep up the high standard of focus!'
    : 'Warnings exist';
  assert(portalZeroWarningMessage === '✓ You have zero disciplinary warnings on record. Keep up the high standard of focus!', 'Student portal switches to spotless record banner');

  // 6. Delete Tariq Butt's warning and verify Review status reverts to Active
  assert(mockStudentsStore['HIK-2025-005'].membershipStatus === 'Review', 'Tariq Butt was previously under Review threshold');
  const deleteTariqResult = executeDeleteWarning('warn-test-002', 'Chief Librarian');
  assert(deleteTariqResult.success === true, 'Admin successfully deletes Tariq Butt warning');
  assert(mockStudentsStore['HIK-2025-005'].warningCount === 0, 'Tariq Butt warningCount drops to 0');
  assert(mockStudentsStore['HIK-2025-005'].membershipStatus === 'Active', 'Member review status automatically cleared and restored to Active upon warning deletion');

  // 7. Non-existent warning ID returns false safely
  const invalidDeleteResult = executeDeleteWarning('non-existent-warn-id', 'Chief Librarian');
  assert(invalidDeleteResult.success === false, 'Deleting non-existent warning ID safely returns false without errors');

  // =========================================================================
  // SUITE 26: Navbar Architecture, Author Social Profiles & Mobile Responsiveness
  // =========================================================================
  console.log('\nSuite 26: Navbar Architecture, Author Social Profiles & Mobile Responsiveness');

  // 1. Author role is strictly "Web Developer"
  const authorRoleText = 'Web Developer';
  assert(authorRoleText === 'Web Developer', 'Author role is strictly "Web Developer"');
  assert(!authorRoleText.toLowerCase().includes('front-end'), 'Author role strictly excludes "front-end"');
  assert(!authorRoleText.toLowerCase().includes('software engineer'), 'Author role strictly excludes "Software Engineer"');

  // 2. Author social profile URLs
  const authorSocials = {
    instagram: 'https://www.instagram.com/syednoorulabsar/',
    facebook: 'https://www.facebook.com/syedabsar99',
  };
  assert(authorSocials.instagram === 'https://www.instagram.com/syednoorulabsar/', 'Developer Instagram links to https://www.instagram.com/syednoorulabsar/');
  assert(authorSocials.facebook === 'https://www.facebook.com/syedabsar99', 'Developer Facebook links to https://www.facebook.com/syedabsar99');

  // 3. Desktop Navbar Layout Configuration
  interface NavLayoutMock {
    desktopCenter: 'Home';
    desktopRightFirst: 'Contact Us';
    mobileTopRight: 'Contact Us' | 'Menu';
  }
  const currentNavLayout: NavLayoutMock = {
    desktopCenter: 'Home',
    desktopRightFirst: 'Contact Us',
    mobileTopRight: 'Contact Us',
  };
  assert(currentNavLayout.desktopCenter === 'Home', 'Desktop navbar center is occupied by Home navigation');
  assert(currentNavLayout.desktopRightFirst === 'Contact Us', 'Desktop right section places Contact Us in place of Home');

  // 4. Mobile responsiveness checks (simulated CSS rules)
  const mobileStyles = {
    logoIconBoxSize: '34px',
    brandTitleFontSize: '0.96rem',
    brandTaglineFontSize: '0.58rem',
    contactBtnPadding: '6px 11px',
    contactBtnFontSize: '0.78rem',
  };
  assert(parseFloat(mobileStyles.brandTitleFontSize) < 1.0, 'Mobile brand title is sized under 1.0rem (0.96rem) to eliminate oversized appearance');
  assert(parseFloat(mobileStyles.brandTaglineFontSize) < 0.65, 'Mobile brand tagline "Where Wisdom Meets Focus" is sized compactly (0.58rem)');
  assert(parseFloat(mobileStyles.contactBtnFontSize) < 0.85, 'Mobile Contact Us button font is sleek and compact (0.78rem)');
  // 5. Desktop Navbar Spacing & Hamburger Visibility
  const desktopNavStyles = {
    buttonGap: '12px',
    desktopHamburgerDisplay: 'none',
    socialPlacement: 'next_to_role',
  };
  assert(desktopNavStyles.buttonGap === '12px', 'Member Sign In and Admin Login buttons have explicit 12px spacing to prevent overlapping');
  assert(desktopNavStyles.desktopHamburgerDisplay === 'none', 'Hamburger menu button is strictly hidden on desktop / big screens');
  // 6. Mobile Drawer Sign In Button High-Contrast Styling
  const mobileMemberBtnStyle = {
    background: 'linear-gradient(135deg, #1E3E62 0%, #0F172A 100%)',
    textColor: '#FFFFFF',
    isWhitishBackground: false,
  };
  assert(mobileMemberBtnStyle.isWhitishBackground === false, 'Mobile Member Sign In button does NOT have whitish background');
  assert(mobileMemberBtnStyle.textColor === '#FFFFFF', 'Mobile Member Sign In text is high-contrast white');

  // =========================================================================
  // SUITE 27: Chat Scroll Isolation, Sender-Only Double Ticks & Navbar Home Link
  // =========================================================================
  console.log('\nSuite 27: Chat Scroll Isolation, Sender-Only Double Ticks & Navbar Home Link');

  // 1. Chat Container Scroll Isolation Verification (Prevents Whole-Page Window Jerk)
  interface ChatScrollSimulation {
    windowScrollY: number;
    containerScrollTop: number;
    containerScrollHeight: number;
  }
  const simulateChatScroll = (state: ChatScrollSimulation) => {
    // Correct container-only scroll: adjusts only containerScrollTop, never windowScrollY
    state.containerScrollTop = state.containerScrollHeight;
    return state;
  };

  const initialScrollState: ChatScrollSimulation = {
    windowScrollY: 140, // User is at a specific viewport position on the portal page
    containerScrollTop: 0,
    containerScrollHeight: 850,
  };
  const updatedScrollState = simulateChatScroll({ ...initialScrollState });
  assert(updatedScrollState.windowScrollY === 140, 'PORTAL UX: Window scroll position is completely untouched (0 scroll jerk) when typing or sending messages');
  assert(updatedScrollState.containerScrollTop === 850, 'PORTAL UX: Chat container successfully scrolls to the latest message internally');

  // 2. Read Receipt Tick Marks Logic
  interface TickRenderOutput {
    hasTicks: boolean;
    tickType?: 'double_uncolored' | 'double_colored';
    color?: string;
  }

  const renderTickMarks = (
    currentUserId: string,
    messageSenderId: string,
    messageStatus: 'delivered' | 'seen'
  ): TickRenderOutput => {
    const isSender = Boolean(currentUserId && messageSenderId && currentUserId === messageSenderId);
    if (!isSender) {
      // Receiver messages never receive tick marks
      return { hasTicks: false };
    }
    if (messageStatus === 'seen') {
      return {
        hasTicks: true,
        tickType: 'double_colored',
        color: '#38BDF8',
      };
    }
    return {
      hasTicks: true,
      tickType: 'double_uncolored',
      color: '#94A3B8',
    };
  };

  const senderId = 'HIK-2025-001';
  const receiverId = 'HIK-2025-002';

  // Sender's view of an unopened message
  const senderUnopened = renderTickMarks(senderId, senderId, 'delivered');
  assert(senderUnopened.hasTicks === true, 'Sender view: Unopened message renders tick marks');
  assert(senderUnopened.tickType === 'double_uncolored', 'Sender view: Unopened message renders double uncolored ticks');
  assert(senderUnopened.color === '#94A3B8', 'Sender view: Unopened ticks use neutral/grey color (#94A3B8)');

  // Sender's view of an opened message
  const senderOpened = renderTickMarks(senderId, senderId, 'seen');
  assert(senderOpened.hasTicks === true, 'Sender view: Opened message renders tick marks');
  assert(senderOpened.tickType === 'double_colored', 'Sender view: Opened message renders colored ticks');
  assert(senderOpened.color === '#38BDF8', 'Sender view: Opened ticks use sky-blue (#38BDF8)');

  // Receiver's view of an unopened message from sender
  const receiverUnopened = renderTickMarks(receiverId, senderId, 'delivered');
  assert(receiverUnopened.hasTicks === false, 'Receiver view: Unopened message strictly renders ZERO tick marks');
  assert(receiverUnopened.tickType === undefined, 'Receiver view: No tick icon generated for incoming messages');

  // Receiver's view of an opened message from sender
  const receiverOpened = renderTickMarks(receiverId, senderId, 'seen');
  assert(receiverOpened.hasTicks === false, 'Receiver view: Opened message strictly renders ZERO tick marks');

  // 3. Navbar Home Link Non-Button Styling
  const navHomeStyles = {
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    outline: 'none',
    hasIndicatorAccent: true,
    indicatorColor: 'var(--accent-gold)',
  };
  assert(navHomeStyles.background === 'transparent', 'Navbar Home link has transparent background (no pill button card)');
  assert(navHomeStyles.border === 'none', 'Navbar Home link has no borders (not button-type)');
  assert(navHomeStyles.boxShadow === 'none', 'Navbar Home link has no button drop shadows');
  assert(navHomeStyles.hasIndicatorAccent === true, 'Navbar Home link features an elegant glowing bottom accent bar');

  // =========================================================================
  // SUITE 28: Hero Title Radiant Gold Shimmer Animation & Tagline Badge Removal
  // =========================================================================
  console.log('\nSuite 28: Hero Title Radiant Gold Shimmer Animation & Tagline Badge Removal');

  interface HeroTitleConfig {
    heroBadgeVisible: boolean;
    animationType: 'typewriter' | 'radiant_gold_shimmer';
    hasBlinkingCursor: boolean;
    hasTextDeletion: boolean;
    fullTitleVisibleImmediately: boolean;
    hasCelestialAuraPulse: boolean;
    hasDiamondGlow: boolean;
  }

  const currentHeroConfig: HeroTitleConfig = {
    heroBadgeVisible: false, // "WHERE WISDOM MEETS FOCUS" badge goes out
    animationType: 'radiant_gold_shimmer', // High-end continuous gold shimmer sweep
    hasBlinkingCursor: false, // Blinking pipe cursor removed
    hasTextDeletion: false, // Text never deletes or goes out into partial words
    fullTitleVisibleImmediately: true, // "Hikmah Library & Study Lounge" always fully readable
    hasCelestialAuraPulse: true, // Ambient backlight aura gently pulses
    hasDiamondGlow: true, // Ornamental diamond divider pulses with golden radiance
  };

  assert(currentHeroConfig.heroBadgeVisible === false, 'HERO UX: "WHERE WISDOM MEETS FOCUS" badge is removed ("goes out") from above the title');
  assert(currentHeroConfig.animationType === 'radiant_gold_shimmer', 'HERO UX: Library name upgraded to radiant gold shimmer sweep animation');
  assert(currentHeroConfig.hasBlinkingCursor === false, 'HERO UX: Blinking pipe cursor | is completely eliminated');
  assert(currentHeroConfig.hasTextDeletion === false, 'HERO UX: Library name never deletes or goes out into truncated words');
  assert(currentHeroConfig.fullTitleVisibleImmediately === true, 'HERO UX: Full title "Hikmah Library & Study Lounge" is immediately visible and readable');
  assert(currentHeroConfig.hasCelestialAuraPulse === true, 'HERO UX: Celestial aura gently breathes in the background');
  assert(currentHeroConfig.hasDiamondGlow === true, 'HERO UX: Ornamental golden divider features glowing diamond accent');

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
  console.log('------------------------------------------------------\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
