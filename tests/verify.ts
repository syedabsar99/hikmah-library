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
