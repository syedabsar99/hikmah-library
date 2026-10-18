import type {
  MemberProfile,
  AttendanceRecord,
  WarningRecord,
  Announcement,
  AuditLog,
  ChatMessage,
  FeeStatus,
  LibraryFacility,
  LibraryRule,
  CarouselPhoto,
} from '../types';
import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';

// Storage keys for persistent offline / local-first operation
const KEYS = {
  MEMBERS: 'hikmah_members_v3',
  ATTENDANCE: 'hikmah_attendance_v2',
  WARNINGS: 'hikmah_warnings_v2',
  ANNOUNCEMENTS: 'hikmah_announcements_v3',
  AUDIT_LOGS: 'hikmah_audit_logs_v2',
  CHAT_MESSAGES: 'hikmah_chat_messages_v2',
  CHAT_SESSIONS: 'hikmah_chat_sessions_v2',
  ADMIN_SETTINGS: 'hikmah_admin_settings_v2',
  FACILITIES: 'hikmah_facilities_v2',
  RULES: 'hikmah_rules_v2',
  CAROUSEL_PHOTOS: 'hikmah_carousel_photos_v2',
};

// Seed Data
const INITIAL_MEMBERS: MemberProfile[] = [
  {
    id: 'HIK-2025-001',
    uid: 'mem-uid-001',
    fullName: 'Bilal Ahmed',
    email: 'bilal.ahmed@example.com',
    phoneNumber: '+91 98765 43210',
    registrationDate: '2026-09-14',
    joiningDate: '2026-09-14',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'UPSC Civil Services Examination',
    seatNumber: 'Desk A-12',
    warningCount: 1,
    feeDueDate: '2026-10-14', // Expired / Overdue
    feeStatus: 'Overdue',
    monthlyFee: 1200,
    feeReminders: [
      {
        id: 'rem-1',
        date: '2026-10-15',
        message: 'Friendly reminder: Your monthly membership fee of ₹1,200 was due on 2026-10-14. Please pay at the reception counter or via UPI.',
        daysOverdue: 2,
        sentBy: 'Chief Librarian',
      },
    ],
    notes: 'Dedicated aspirant, regular morning student.',
  },
  {
    id: 'HIK-2025-002',
    uid: 'mem-uid-002',
    fullName: 'Ayesha Khan',
    email: 'ayesha.khan@example.com',
    phoneNumber: '+91 98765 43211',
    registrationDate: '2026-10-01',
    joiningDate: '2026-10-01',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'Chartered Accountancy (CA Final)',
    seatNumber: 'Desk B-04',
    warningCount: 0,
    feeDueDate: '2026-11-01', // Active / Paid
    feeStatus: 'Paid',
    monthlyFee: 1200,
    lastPaidDate: '2026-10-01',
    feeReminders: [],
    notes: 'Requires quiet zone for tax audit prep.',
  },
  {
    id: 'HIK-2025-003',
    uid: 'mem-uid-003',
    fullName: 'Zaid Siddiqui',
    email: 'zaid.siddiqui@example.com',
    phoneNumber: '+91 98765 43212',
    registrationDate: '2026-09-18',
    joiningDate: '2026-09-18',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'NEET-PG Medical Entrance',
    seatNumber: 'Desk C-09',
    warningCount: 4,
    feeDueDate: '2026-10-18', // Due in 2 days
    feeStatus: 'Due',
    monthlyFee: 1500,
    feeReminders: [],
    notes: 'Previous warning on loud phone call in cabin.',
  },
  {
    id: 'HIK-2025-004',
    uid: 'mem-uid-004',
    fullName: 'Fatima Zahra',
    email: 'fatima.zahra@example.com',
    phoneNumber: '+91 98765 43213',
    registrationDate: '2026-09-28',
    joiningDate: '2026-09-28',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'GATE Engineering Exam',
    seatNumber: 'Desk A-07',
    warningCount: 0,
    feeDueDate: '2026-10-28', // Active / Paid
    feeStatus: 'Paid',
    monthlyFee: 1200,
    lastPaidDate: '2026-09-28',
    feeReminders: [],
    notes: 'Exemplary attendance record.',
  },
  {
    id: 'HIK-2025-005',
    uid: 'mem-uid-005',
    fullName: 'Omar Farooq',
    email: 'omar.farooq@example.com',
    phoneNumber: '+91 98765 43214',
    registrationDate: '2026-09-10',
    joiningDate: '2026-09-10',
    membershipStatus: 'Review',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'State Judicial Services',
    seatNumber: 'Desk N-02',
    warningCount: 9,
    feeDueDate: '2026-10-10', // 6 days overdue
    feeStatus: 'Overdue',
    monthlyFee: 1200,
    feeReminders: [
      {
        id: 'rem-2',
        date: '2026-10-12',
        message: 'Notice: Monthly membership fee of ₹1,200 is overdue by 6 days. Please clear dues.',
        daysOverdue: 6,
        sentBy: 'Chief Librarian',
      },
    ],
    notes: 'Account on review threshold (9 warnings).',
  },
  {
    id: 'HIK-2025-006',
    uid: 'mem-uid-006',
    fullName: 'Syed Noor Ul Absar',
    email: 'syednoorulabsar@gmail.com',
    phoneNumber: '+91 96224 97806',
    registrationDate: '2026-10-17',
    joiningDate: '2026-10-17',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'UPSC Civil Services / Higher Studies',
    seatNumber: 'Personal Cabin #01',
    warningCount: 0,
    feeDueDate: '2026-11-17',
    feeStatus: 'Paid',
    monthlyFee: 1200,
    lastPaidDate: '2026-10-17',
    feeReminders: [],
    notes: 'Registered premium student member with dedicated cabin access.',
  },
];

const INITIAL_WARNINGS: WarningRecord[] = [
  {
    id: 'warn-1',
    memberId: 'HIK-2025-001',
    memberName: 'Bilal Ahmed',
    warningNumber: 1,
    reason: 'Ringtone rang during silent focus hours in Cabin A',
    severity: 'Minor',
    issuedBy: 'Admin (Chief Librarian)',
    issuedAt: '2025-02-14T10:30:00.000Z',
  },
  {
    id: 'warn-2',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    warningNumber: 1,
    reason: 'Taking voice call inside quiet discussion corridor',
    severity: 'Moderate',
    issuedBy: 'Admin (Chief Librarian)',
    issuedAt: '2025-02-18T16:15:00.000Z',
  },
  {
    id: 'warn-3',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    warningNumber: 2,
    reason: 'Leaving personal study books on reserved desk overnight without permission',
    severity: 'Minor',
    issuedBy: 'Admin (Chief Librarian)',
    issuedAt: '2025-02-22T08:00:00.000Z',
  },
  {
    id: 'warn-4',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    warningNumber: 3,
    reason: 'Eating food at study workstation rather than designated cafeteria',
    severity: 'Minor',
    issuedBy: 'Admin (Chief Librarian)',
    issuedAt: '2025-03-01T13:45:00.000Z',
  },
  {
    id: 'warn-5',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    warningNumber: 4,
    reason: 'Unauthorized seat swapping during exam week peak hours',
    severity: 'Moderate',
    issuedBy: 'Admin (Chief Librarian)',
    issuedAt: '2025-03-05T11:20:00.000Z',
  },
];

// Helper to generate dates for current month
const getRecentDateString = (dayOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  return d.toISOString().split('T')[0];
};

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Today's records
  {
    id: 'att-today-1',
    memberId: 'HIK-2025-001',
    memberName: 'Bilal Ahmed',
    date: getRecentDateString(0),
    status: 'Present',
    checkInTime: '06:15 AM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-today-2',
    memberId: 'HIK-2025-002',
    memberName: 'Ayesha Khan',
    date: getRecentDateString(0),
    status: 'Present',
    checkInTime: '02:05 PM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-today-3',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    date: getRecentDateString(0),
    status: 'Late',
    checkInTime: '08:45 AM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-today-4',
    memberId: 'HIK-2025-004',
    memberName: 'Fatima Zahra',
    date: getRecentDateString(0),
    status: 'Present',
    checkInTime: '06:05 AM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // Yesterday's records
  {
    id: 'att-yest-1',
    memberId: 'HIK-2025-001',
    memberName: 'Bilal Ahmed',
    date: getRecentDateString(1),
    status: 'Present',
    checkInTime: '06:10 AM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-yest-2',
    memberId: 'HIK-2025-002',
    memberName: 'Ayesha Khan',
    date: getRecentDateString(1),
    status: 'Excused',
    markedBy: 'Admin (Chief Librarian)',
    modifiedReason: 'Medical appointment',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-yest-3',
    memberId: 'HIK-2025-003',
    memberName: 'Zaid Siddiqui',
    date: getRecentDateString(1),
    status: 'Absent',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'att-yest-4',
    memberId: 'HIK-2025-004',
    memberName: 'Fatima Zahra',
    date: getRecentDateString(1),
    status: 'Present',
    checkInTime: '06:00 AM',
    markedBy: 'Admin (Chief Librarian)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Drinking water is available on both floors.',
    content: 'Drinking water is available on both floors.',
    category: 'General News',
    isPinned: true,
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    publishedBy: 'Admin',
  },
  {
    id: 'ann-2',
    title: 'Library is open 24/7 as usual. Please keep mobile phones on silent mode in study cabins.',
    content: 'Library is open 24/7 as usual. Please keep mobile phones on silent mode in study cabins.',
    category: 'General News',
    isPinned: false,
    publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
    publishedBy: 'Admin',
  },
  {
    id: 'ann-3',
    title: 'Desk 03 and Cabin 31 are currently available for new student admissions.',
    content: 'Desk 03 and Cabin 31 are currently available for new student admissions.',
    category: 'Seat Vacancy',
    isPinned: false,
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(), // 18 hours ago
    publishedBy: 'Admin',
  },
  {
    id: 'ann-4',
    title: 'High-speed fiber Wi-Fi router maintenance completed. Internet is running smoothly.',
    content: 'High-speed fiber Wi-Fi router maintenance completed. Internet is running smoothly.',
    category: 'General News',
    isPinned: false,
    publishedAt: new Date(Date.now() - 3600000 * 28).toISOString(), // 28 hours ago
    publishedBy: 'Admin',
  },
];

const INITIAL_FACILITIES: LibraryFacility[] = [
  {
    id: 'fac-1',
    name: 'Private Silent Cabins & Attached Personal Lockers',
    description: 'Acoustically soundproofed private study cabins with separate secure lockers for every student attached to their cabins, personal reading spotlight, and power outlets.',
    iconName: 'VolumeX',
    isActive: true,
    order: 1,
  },
  {
    id: 'fac-2',
    name: '300 Mbps Dual Fiber Wi-Fi',
    description: 'Two redundant high-speed internet service providers with automatic failover for bufferless online video lectures and research.',
    iconName: 'Wifi',
    isActive: true,
    order: 2,
  },
  {
    id: 'fac-3',
    name: 'Dedicated Power & Individual Task Lights',
    description: 'Personal warm LED reading spotlight and individual dual charging sockets at every single desk.',
    iconName: 'Zap',
    isActive: true,
    order: 3,
  },
  {
    id: 'fac-4',
    name: 'Fully Air Conditioned & Climate Control',
    description: 'High-capacity silent split AC units and winter heating for optimal study climate all year round.',
    iconName: 'Sparkles',
    isActive: true,
    order: 4,
  },
  {
    id: 'fac-5',
    name: '24/7 Access (Zero Shifts)',
    description: 'Round-the-clock library access. Enter and leave whenever you want — no rigid shifts, a desk is assigned to you 24/7.',
    iconName: 'Clock',
    isActive: true,
    order: 5,
  },
  {
    id: 'fac-6',
    name: '100% Inverter & Generator Backup',
    description: 'Automatic seamless power backup ensures zero disruptions or lighting blackouts during peak preparation.',
    iconName: 'ShieldCheck',
    isActive: true,
    order: 6,
  },
  {
    id: 'fac-7',
    name: 'Cafeteria & Filtered RO Water',
    description: 'Continuous cold and warm RO water, electric kettle, and a designated quiet eating zone away from desks.',
    iconName: 'Coffee',
    isActive: true,
    order: 7,
  },
  {
    id: 'fac-8',
    name: '24/7 CCTV Surveillance & Secure Campus',
    description: 'Continuous high-definition security surveillance and reception check-in to safeguard student belongings.',
    iconName: 'Award',
    isActive: true,
    order: 8,
  },
];

const INITIAL_RULES: LibraryRule[] = [
  {
    id: 'rule-1',
    ruleNumber: 1,
    title: 'Strict Silence Protocol',
    description: 'Mobile phones must remain on 100% silent (vibration turned off). Phone calls may only be conducted in the exterior balcony or cafeteria.',
    category: 'Silence',
    severity: 'Strict',
    consequence: 'Warning issued if ringtone sounds in study bay',
    isActive: true,
  },
  {
    id: 'rule-2',
    ruleNumber: 2,
    title: 'Workstation Cleanliness',
    description: 'Do not leave open food containers, bags, or excess books cluttering desks. Desks must be clean upon departure.',
    category: 'Cleanliness',
    severity: 'Info',
    consequence: 'Desk clutter will be cleared by staff',
    isActive: true,
  },
  {
    id: 'rule-3',
    ruleNumber: 3,
    title: 'Designated Dining Zone',
    description: 'Eating snacks or meals is restricted exclusively to the cafeteria pantry. Only spill-proof beverage cups are permitted in cabins.',
    category: 'Dining',
    severity: 'Strict',
    consequence: 'Food in study cabins is strictly prohibited',
    isActive: true,
  },
  {
    id: 'rule-4',
    ruleNumber: 4,
    title: 'Daily Attendance Check-in',
    description: 'Members must mark attendance at the front desk terminal upon entering. Regular attendance ensures retention of your dedicated seat.',
    category: 'Attendance',
    severity: 'Info',
    consequence: 'Seat reassignment review after prolonged unexcused absence',
    isActive: true,
  },
  {
    id: 'rule-5',
    ruleNumber: 5,
    title: 'Punctual Fee Renewal',
    description: 'Membership renewals are due on your designated monthly expiry date. Late renewals may result in workstation reassignment.',
    category: 'Fees',
    severity: 'Critical',
    consequence: 'Daily reminders sent; seat released after grace period',
    isActive: true,
  },
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    action: 'SYSTEM_INITIALIZATION',
    category: 'SYSTEM',
    performedBy: 'System Administrator',
    details: 'Hikmah Library system initialized with role-based isolation and end-to-end encryption protocols.',
    timestamp: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
  {
    id: 'log-2',
    action: 'MEMBER_REGISTERED',
    category: 'MEMBER',
    performedBy: 'Chief Librarian',
    details: 'Registered member Bilal Ahmed (ID: HIK-2025-001) for Morning Shift.',
    timestamp: '2025-01-10T09:00:00.000Z',
    targetId: 'HIK-2025-001',
  },
];

export const INITIAL_CAROUSEL_PHOTOS: CarouselPhoto[] = [
  {
    id: 'photo-1',
    src: '/images/gallery/ac_cabins_hall.jpg',
    caption: 'Dual-season AC & climate control for 24/7 comfort',
    title: 'Climate-Controlled Study Hall',
    order: 1,
  },
  {
    id: 'photo-2',
    src: '/images/gallery/personal_cabin_03.jpg',
    caption: 'Private study cabin with separate locker, reading spotlight & power sockets',
    title: 'Individual Study Cabin #03',
    order: 2,
  },
  {
    id: 'photo-3',
    src: '/images/gallery/study_hall_focus_1.jpg',
    caption: 'Silent study bay with distraction-free high partitions',
    title: 'Silent Study Bay',
    order: 3,
  },
  {
    id: 'photo-4',
    src: '/images/gallery/study_hall_wide.jpg',
    caption: 'Spacious carpeted study lounge for deep focus',
    title: 'Main Study Lounge',
    order: 4,
  },
  {
    id: 'photo-5',
    src: '/images/gallery/study_hall_focus_2.jpg',
    caption: 'Ergonomic high-back chairs built for long study hours',
    title: 'Ergonomic Workstations',
    order: 5,
  },
  {
    id: 'photo-6',
    src: '/images/gallery/study_hall_perspective.jpg',
    caption: 'Disciplined silent corridor with seamless access',
    title: 'Study Hall Corridor',
    order: 6,
  },
  {
    id: 'photo-7',
    src: '/images/gallery/founder_entrance.jpg',
    caption: 'Campus reception at Hib Complex, Opp. Jamia Masjid, Soibugh',
    title: 'Campus Reception',
    order: 7,
  },
  {
    id: 'photo-8',
    src: '/images/gallery/founder_banner.jpg',
    caption: 'Hikmah Library • Where wisdom meets focus',
    title: 'Official Campus Signboard',
    order: 8,
  },
];

// Local Storage Helper
function loadLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

function saveLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}

// Date and Fee Calculation Helpers
export function advanceDueDateByOneMonth(currentDueDate: string): string {
  if (!currentDueDate) {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return now.toISOString().split('T')[0];
  }
  const [yearStr, monthStr, dayStr] = currentDueDate.split('-');
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
}

export function calculateFeeStatus(dueDateStr?: string): { status: 'Paid' | 'Due' | 'Overdue'; daysDiff: number } {
  if (!dueDateStr) {
    return { status: 'Paid', daysDiff: 30 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) {
    return { status: 'Paid', daysDiff: 30 };
  }
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Overdue', daysDiff: Math.abs(diffDays) };
  } else if (diffDays <= 3) {
    return { status: 'Due', daysDiff: diffDays };
  }
  return { status: 'Paid', daysDiff: diffDays };
}

export const DataService = {
  // Database Mode Information
  isLiveFirebase(): boolean {
    return isFirebaseConfigured();
  },

  // ---------------- MEMBERSHIP OPERATIONS ----------------
  async getMembers(): Promise<MemberProfile[]> {
    let list: MemberProfile[] = [];
    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'member_profiles'), orderBy('id', 'asc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          list = snapshot.docs.map((doc) => doc.data() as MemberProfile);
        }
      } catch (err) {
        console.warn('Firebase getMembers query error, falling back to local store:', err);
      }
    }
    if (list.length === 0) {
      list = loadLocal<MemberProfile[]>(KEYS.MEMBERS, INITIAL_MEMBERS);
    }

    // Refresh dynamic fee status based on current date and backfill missing schema fields
    const updated: MemberProfile[] = list.map((m) => {
      const joiningDate = m.joiningDate || m.registrationDate || '2025-01-15';
      const feeDueDate = m.feeDueDate || '2026-11-14';
      const monthlyFee = m.monthlyFee || 1200;
      const feeReminders = m.feeReminders || [];
      const currentFeeStatus: FeeStatus = m.feeStatus || 'Paid';

      const { status } = calculateFeeStatus(feeDueDate);
      let calculatedStatus: FeeStatus = currentFeeStatus;
      if (status === 'Overdue' && currentFeeStatus !== 'Overdue') {
        calculatedStatus = 'Overdue';
      } else if (status === 'Due' && currentFeeStatus === 'Paid') {
        calculatedStatus = 'Due';
      }

      return {
        ...m,
        joiningDate,
        feeDueDate,
        monthlyFee,
        feeReminders,
        feeStatus: calculatedStatus,
      };
    });

    return updated;
  },

  async getMemberById(id: string): Promise<MemberProfile | null> {
    const members = await this.getMembers();
    return members.find((m) => m.id === id || m.uid === id) || null;
  },

  async addMember(member: Omit<MemberProfile, 'id'>, adminName: string): Promise<MemberProfile> {
    const members = await this.getMembers();
    
    // Auto-generate next unique Member ID: e.g. HIK-2025-006
    const year = new Date().getFullYear();
    const highestNum = members.reduce((max, m) => {
      const match = m.id.match(/HIK-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextSeq = String(highestNum + 1).padStart(3, '0');
    const newId = `HIK-${year}-${nextSeq}`;

    const joiningDate = member.joiningDate || new Date().toISOString().split('T')[0];
    const feeDueDate = member.feeDueDate || advanceDueDateByOneMonth(joiningDate);

    const newMember: MemberProfile = {
      ...member,
      id: newId,
      uid: member.uid || `uid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      joiningDate,
      feeDueDate,
      feeStatus: member.feeStatus || 'Paid',
      monthlyFee: member.monthlyFee || 1200,
      feeReminders: [],
      warningCount: 0,
      membershipStatus: member.membershipStatus || 'Active',
      registrationDate: member.registrationDate || new Date().toISOString().split('T')[0],
    };

    const updated = [...members, newMember];
    saveLocal(KEYS.MEMBERS, updated);

    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'member_profiles', newId), newMember);
      } catch (err) {
        console.warn('Firebase addMember sync error:', err);
      }
    }

    await this.addAuditLog(
      'MEMBER_REGISTERED',
      'MEMBER',
      `Registered new member ${newMember.fullName} with Member ID ${newId} (${newMember.batch}).`,
      adminName,
      newId
    );

    return newMember;
  },

  async updateMember(id: string, updates: Partial<MemberProfile>, adminName: string): Promise<MemberProfile | null> {
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const updatedMember = { ...members[index], ...updates };
    members[index] = updatedMember;
    saveLocal(KEYS.MEMBERS, members);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'member_profiles', id), updates);
      } catch (err) {
        console.warn('Firebase updateMember sync error:', err);
      }
    }

    await this.addAuditLog(
      'MEMBER_UPDATED',
      'MEMBER',
      `Updated profile for member ${updatedMember.fullName} (${id}). Fields modified: ${Object.keys(updates).join(', ')}`,
      adminName,
      id
    );

    return updatedMember;
  },

  async updateMemberAvatar(memberId: string, avatarUrl: string): Promise<MemberProfile | null> {
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === memberId);
    if (index === -1) return null;

    members[index].avatarUrl = avatarUrl;
    saveLocal(KEYS.MEMBERS, members);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'member_profiles', memberId), { avatarUrl });
      } catch (err) {
        console.warn('Firebase updateMemberAvatar sync error:', err);
      }
    }
    return members[index];
  },

  async setMemberStatus(
    id: string,
    status: MemberProfile['membershipStatus'],
    adminName: string,
    reason?: string
  ): Promise<boolean> {
    const updates: Partial<MemberProfile> = {
      membershipStatus: status,
      ...(reason ? { notes: reason } : {}),
    };
    if (status === 'Cancelled') {
      updates.cancellationReason = reason || 'Administrative Cancellation';
      updates.cancelledAt = new Date().toISOString();
      updates.cancelledBy = adminName;
    }
    const res = await this.updateMember(id, updates, adminName);
    return res !== null;
  },

  async deleteMember(id: string, adminName: string): Promise<boolean> {
    const members = await this.getMembers();
    const target = members.find((m) => m.id === id);
    if (!target) return false;

    const filtered = members.filter((m) => m.id !== id);
    saveLocal(KEYS.MEMBERS, filtered);

    // 1. Immediately purge all chat messages involving this deleted member
    try {
      const allMessages = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
      const remainingMessages = allMessages.filter(
        (m) => m.senderId !== id && m.recipientId !== id
      );
      saveLocal(KEYS.CHAT_MESSAGES, remainingMessages);
    } catch {
      // Ignore local storage error
    }

    // 2. Remove from live cloud firestore if configured
    if (this.isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'member_profiles', id));
      } catch (err) {
        console.warn('Firebase deleteMember sync error:', err);
      }
    }

    // 3. Log audit event
    await this.addAuditLog(
      'MEMBER_DELETED',
      'MEMBER',
      `Permanently removed member record for ${target.fullName} (${id}). All portal access and chat records purged immediately.`,
      adminName,
      id
    );

    // 4. Broadcast global event so any active sessions or portals immediately terminate
    try {
      window.dispatchEvent(
        new CustomEvent('hikmah_member_deleted', {
          detail: { memberId: id, email: target.email, fullName: target.fullName },
        })
      );
    } catch {
      // Browser environment check
    }

    return true;
  },

  // ---------------- MEMBERSHIP FEE & RENEWAL OPERATIONS ----------------
  async markFeePaid(memberId: string, adminName: string, notes?: string): Promise<MemberProfile | null> {
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === memberId);
    if (index === -1) return null;

    const current = members[index];
    const nextDueDate = advanceDueDateByOneMonth(current.feeDueDate || new Date().toISOString().split('T')[0]);
    const todayStr = new Date().toISOString().split('T')[0];

    const updatedMember: MemberProfile = {
      ...current,
      feeStatus: 'Paid',
      feeDueDate: nextDueDate,
      lastPaidDate: todayStr,
      feeReminders: [], // Clear pending overdue reminders upon payment
      notes: notes ? `${current.notes || ''} [Paid on ${todayStr}: ${notes}]` : current.notes,
    };

    members[index] = updatedMember;
    saveLocal(KEYS.MEMBERS, members);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'member_profiles', memberId), {
          feeStatus: 'Paid',
          feeDueDate: nextDueDate,
          lastPaidDate: todayStr,
          feeReminders: [],
        });
      } catch (err) {
        console.warn('Firebase markFeePaid error:', err);
      }
    }

    await this.addAuditLog(
      'FEE_PAYMENT_RECORDED',
      'MEMBER',
      `Recorded monthly fee payment (₹${current.monthlyFee || 1200}) for ${current.fullName} (${memberId}). Renewal date advanced to ${nextDueDate}.`,
      adminName,
      memberId
    );

    return updatedMember;
  },

  async sendFeeReminder(
    memberId: string,
    customMessage?: string,
    adminName: string = 'Chief Librarian'
  ): Promise<boolean> {
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === memberId);
    if (index === -1) return false;

    const member = members[index];
    const { status, daysDiff } = calculateFeeStatus(member.feeDueDate);

    const defaultMsg = status === 'Overdue'
      ? `Important Reminder: Your monthly study lounge membership fee of ₹${member.monthlyFee || 1200} was due on ${member.feeDueDate} (expired by ${daysDiff} day(s)). Please clear your dues at the reception or via UPI to retain your assigned seat.`
      : `Upcoming Renewal Notice: Your monthly library membership fee of ₹${member.monthlyFee || 1200} is due on ${member.feeDueDate}.`;

    const reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      message: customMessage || defaultMsg,
      daysOverdue: status === 'Overdue' ? daysDiff : 0,
      sentBy: adminName,
    };

    const existingReminders = member.feeReminders || [];
    member.feeReminders = [reminder, ...existingReminders];
    members[index] = member;
    saveLocal(KEYS.MEMBERS, members);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'member_profiles', memberId), {
          feeReminders: member.feeReminders,
        });
      } catch (err) {
        console.warn('Firebase sendFeeReminder error:', err);
      }
    }

    await this.addAuditLog(
      'FEE_REMINDER_SENT',
      'MEMBER',
      `Dispatched fee due notification to ${member.fullName} (${memberId}). Due date: ${member.feeDueDate}.`,
      adminName,
      memberId
    );

    return true;
  },

  async sendDailyRemindersToAllOverdue(adminName: string): Promise<{ count: number }> {
    const members = await this.getMembers();
    let count = 0;
    for (const m of members) {
      const { status } = calculateFeeStatus(m.feeDueDate);
      if (status === 'Overdue' || status === 'Due') {
        await this.sendFeeReminder(m.id, undefined, adminName);
        count++;
      }
    }
    return { count };
  },

  async updateMemberFeeSettings(
    memberId: string,
    feeDueDate: string,
    monthlyFee: number,
    adminName: string,
    joiningDate?: string
  ): Promise<boolean> {
    const { status } = calculateFeeStatus(feeDueDate);
    const updates: Partial<MemberProfile> = { feeDueDate, monthlyFee, feeStatus: status };
    if (joiningDate) {
      updates.joiningDate = joiningDate;
    }
    const res = await this.updateMember(
      memberId,
      updates,
      adminName
    );
    return res !== null;
  },

  async getMemberByPhone(phoneNumber: string): Promise<MemberProfile | undefined> {
    const cleanTarget = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleanTarget) return undefined;
    const members = await this.getMembers();
    return members.find((m) => {
      const cleanM = m.phoneNumber.replace(/[^0-9]/g, '');
      return cleanM === cleanTarget || (cleanTarget.length >= 10 && cleanM.endsWith(cleanTarget.slice(-10)));
    });
  },

  async getMemberByEmail(email: string): Promise<MemberProfile | undefined> {
    const cleanTarget = (email || '').trim().toLowerCase();
    if (!cleanTarget) return undefined;
    const members = await this.getMembers();
    return members.find((m) => {
      const memberEmail = (m.email || '').trim().toLowerCase();
      if (memberEmail === cleanTarget) return true;
      // Also match if user enters syedabsar99 or syednoorulabsar for Syed Noor Ul Absar
      if (
        (cleanTarget === 'syedabsar99@gmail.com' || cleanTarget === 'syednoorulabsar@gmail.com') &&
        (m.fullName.toLowerCase().includes('syed noor ul absar') || m.id === 'HIK-2025-006')
      ) {
        return true;
      }
      return false;
    });
  },

  async updateMemberPasscode(phoneNumber: string, newPasscode: string): Promise<boolean> {
    const member = await this.getMemberByPhone(phoneNumber);
    if (!member) return false;
    const res = await this.updateMember(member.id, { passcode: newPasscode }, 'Student Password Self-Service');
    return res !== null;
  },

  async updateMemberPasswordByEmail(email: string, newPasscode: string): Promise<boolean> {
    const member = await this.getMemberByEmail(email);
    if (!member) return false;
    const res = await this.updateMember(member.id, { passcode: newPasscode }, 'Student Email Password Reset');
    return res !== null;
  },

  // ---------------- ATTENDANCE OPERATIONS ----------------
  async getAttendance(filters?: {
    date?: string;
    memberId?: string;
    month?: string; // YYYY-MM
  }): Promise<AttendanceRecord[]> {
    let records = loadLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);

    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'attendance_records'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          records = snapshot.docs.map((d) => d.data() as AttendanceRecord);
        }
      } catch (err) {
        console.warn('Firebase getAttendance error, using local data:', err);
      }
    }

    if (!filters) return records;

    return records.filter((r) => {
      if (filters.date && r.date !== filters.date) return false;
      if (filters.memberId && r.memberId !== filters.memberId) return false;
      if (filters.month && !r.date.startsWith(filters.month)) return false;
      return true;
    });
  },

  async markAttendance(
    record: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>,
    adminName: string
  ): Promise<{ success: boolean; record?: AttendanceRecord; error?: string }> {
    const records = await this.getAttendance();

    // Prevent duplicate attendance record for same member on same date
    const existing = records.find((r) => r.memberId === record.memberId && r.date === record.date);
    if (existing) {
      return {
        success: false,
        error: `Attendance already recorded for ${record.memberName} on ${record.date} as "${existing.status}". Please use edit function to modify.`,
      };
    }

    const newRecord: AttendanceRecord = {
      ...record,
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      markedBy: adminName,
    };

    const updated = [newRecord, ...records];
    saveLocal(KEYS.ATTENDANCE, updated);

    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'attendance_records', newRecord.id), newRecord);
      } catch (err) {
        console.warn('Firebase markAttendance error:', err);
      }
    }

    await this.addAuditLog(
      'ATTENDANCE_MARKED',
      'ATTENDANCE',
      `Marked attendance for ${newRecord.memberName} (${newRecord.memberId}) on ${newRecord.date} as ${newRecord.status}.`,
      adminName,
      newRecord.memberId
    );

    return { success: true, record: newRecord };
  },

  async updateAttendance(
    id: string,
    newStatus: AttendanceRecord['status'],
    reason: string,
    adminName: string
  ): Promise<boolean> {
    const records = await this.getAttendance();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const oldStatus = records[index].status;
    records[index] = {
      ...records[index],
      status: newStatus,
      modifiedBy: adminName,
      modifiedReason: reason,
      updatedAt: new Date().toISOString(),
    };

    saveLocal(KEYS.ATTENDANCE, records);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'attendance_records', id), {
          status: newStatus,
          modifiedBy: adminName,
          modifiedReason: reason,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Firebase updateAttendance error:', err);
      }
    }

    await this.addAuditLog(
      'ATTENDANCE_CORRECTED',
      'ATTENDANCE',
      `Corrected attendance for ${records[index].memberName} on ${records[index].date} from "${oldStatus}" to "${newStatus}". Reason: ${reason}`,
      adminName,
      records[index].memberId
    );

    return true;
  },

  // ---------------- WARNING SYSTEM OUT OF 10 ----------------
  async getWarnings(memberId?: string): Promise<WarningRecord[]> {
    let warnings = loadLocal<WarningRecord[]>(KEYS.WARNINGS, INITIAL_WARNINGS);

    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'warning_records'), orderBy('issuedAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          warnings = snapshot.docs.map((d) => d.data() as WarningRecord);
        }
      } catch (err) {
        console.warn('Firebase getWarnings error:', err);
      }
    }

    if (memberId) {
      return warnings.filter((w) => w.memberId === memberId);
    }
    return warnings;
  },

  async issueWarning(
    memberId: string,
    reason: string,
    severity: WarningRecord['severity'],
    adminName: string
  ): Promise<{ success: boolean; newCount: number; flaggedForReview: boolean; error?: string }> {
    const member = await this.getMemberById(memberId);
    if (!member) return { success: false, newCount: 0, flaggedForReview: false, error: 'Member not found' };

    const warnings = await this.getWarnings();
    const currentMemberWarnings = warnings.filter((w) => w.memberId === memberId && !w.isCorrected);
    const nextWarningNum = currentMemberWarnings.length + 1;

    if (nextWarningNum > 10) {
      return {
        success: false,
        newCount: member.warningCount,
        flaggedForReview: true,
        error: 'Member has already reached the maximum 10 warnings. Please proceed with registration review/cancellation.',
      };
    }

    const newWarning: WarningRecord = {
      id: `warn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      memberId,
      memberName: member.fullName,
      warningNumber: nextWarningNum,
      reason,
      severity,
      issuedBy: adminName,
      issuedAt: new Date().toISOString(),
    };

    const updatedWarnings = [newWarning, ...warnings];
    saveLocal(KEYS.WARNINGS, updatedWarnings);

    // Update member profile warning count
    const flaggedForReview = nextWarningNum >= 10;
    await this.updateMember(
      memberId,
      {
        warningCount: nextWarningNum,
        ...(flaggedForReview ? { membershipStatus: 'Review' } : {}),
      },
      adminName
    );

    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'warning_records', newWarning.id), newWarning);
      } catch (err) {
        console.warn('Firebase issueWarning error:', err);
      }
    }

    await this.addAuditLog(
      'WARNING_ISSUED',
      'WARNING',
      `Issued Disciplinary Warning #${nextWarningNum}/10 to ${member.fullName} (${memberId}). Reason: "${reason}". Severity: ${severity}.${
        flaggedForReview ? ' [CRITICAL: Member reached 10 warnings - FLAGGED FOR REGISTRATION CANCELLATION REVIEW]' : ''
      }`,
      adminName,
      memberId
    );

    return {
      success: true,
      newCount: nextWarningNum,
      flaggedForReview,
    };
  },

  async correctWarning(
    warningId: string,
    correctionReason: string,
    adminName: string
  ): Promise<{ success: boolean; newCount: number }> {
    const warnings = await this.getWarnings();
    const index = warnings.findIndex((w) => w.id === warningId);
    if (index === -1) return { success: false, newCount: 0 };

    const targetWarning = warnings[index];
    if (targetWarning.isCorrected) return { success: false, newCount: 0 };

    warnings[index] = {
      ...targetWarning,
      isCorrected: true,
      correctionReason,
      correctedBy: adminName,
      correctedAt: new Date().toISOString(),
    };
    saveLocal(KEYS.WARNINGS, warnings);

    // Decrement member's active warning count
    const member = await this.getMemberById(targetWarning.memberId);
    const newCount = Math.max(0, (member?.warningCount || 1) - 1);

    await this.updateMember(
      targetWarning.memberId,
      {
        warningCount: newCount,
        ...(newCount < 10 && member?.membershipStatus === 'Review' ? { membershipStatus: 'Active' } : {}),
      },
      adminName
    );

    await this.addAuditLog(
      'WARNING_CORRECTED',
      'WARNING',
      `Audited Correction: Voided Warning #${targetWarning.warningNumber} for ${targetWarning.memberName} (${targetWarning.memberId}). Justification: ${correctionReason}`,
      adminName,
      targetWarning.memberId
    );

    return { success: true, newCount };
  },

  async confirmCancellationAt10Warnings(
    memberId: string,
    cancellationReason: string,
    adminName: string
  ): Promise<boolean> {
    const member = await this.getMemberById(memberId);
    if (!member) return false;

    await this.updateMember(
      memberId,
      {
        membershipStatus: 'Cancelled',
        cancellationReason: `Cancelled after reaching 10 disciplinary warnings. Review reason: ${cancellationReason}`,
        cancelledAt: new Date().toISOString(),
        cancelledBy: adminName,
      },
      adminName
    );

    await this.addAuditLog(
      'REGISTRATION_CANCELLED',
      'MEMBER',
      `CONFIRMED REGISTRATION CANCELLATION: Member ${member.fullName} (${memberId}) membership revoked due to 10 warnings. All portal access suspended.`,
      adminName,
      memberId
    );

    return true;
  },

  // ---------------- ANNOUNCEMENTS & FEE NOTICES ----------------
  async getAnnouncements(): Promise<Announcement[]> {
    let announcements = loadLocal<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);

    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'announcements'), orderBy('publishedAt', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          announcements = snapshot.docs.map((d) => d.data() as Announcement);
        }
      } catch (err) {
        console.warn('Firebase getAnnouncements error:', err);
      }
    }

    // Auto-delete rule: Official bulletins & notices auto-delete after 3 days (72 hours)
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const validAnnouncements = announcements.filter((item) => {
      const pubTime = new Date(item.publishedAt).getTime();
      return (now - pubTime) <= THREE_DAYS_MS;
    });

    // If any expired notices were removed, persist to local storage
    if (validAnnouncements.length !== announcements.length) {
      saveLocal(KEYS.ANNOUNCEMENTS, validAnnouncements);
    }

    // Sort: pinned items first, then by date descending
    return validAnnouncements.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  },

  async addAnnouncement(
    data: Omit<Announcement, 'id' | 'publishedAt'>,
    adminName: string
  ): Promise<Announcement> {
    const announcements = await this.getAnnouncements();
    const newAnnouncement: Announcement = {
      ...data,
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      publishedAt: new Date().toISOString(),
      publishedBy: adminName,
    };

    const updated = [newAnnouncement, ...announcements];
    saveLocal(KEYS.ANNOUNCEMENTS, updated);

    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'announcements', newAnnouncement.id), newAnnouncement);
      } catch (err) {
        console.warn('Firebase addAnnouncement error:', err);
      }
    }

    await this.addAuditLog(
      'ANNOUNCEMENT_PUBLISHED',
      'ANNOUNCEMENT',
      `Published announcement "${newAnnouncement.title}" [Category: ${newAnnouncement.category}]`,
      adminName,
      newAnnouncement.id
    );

    return newAnnouncement;
  },

  async deleteAnnouncement(id: string, adminName: string): Promise<boolean> {
    const announcements = await this.getAnnouncements();
    const target = announcements.find((a) => a.id === id);
    const updated = announcements.filter((a) => a.id !== id);
    saveLocal(KEYS.ANNOUNCEMENTS, updated);

    if (this.isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
      } catch (err) {
        console.warn('Firebase deleteAnnouncement error:', err);
      }
    }

    if (target) {
      await this.addAuditLog(
        'ANNOUNCEMENT_REMOVED',
        'ANNOUNCEMENT',
        `Removed announcement "${target.title}"`,
        adminName,
        id
      );
    }
    return true;
  },

  // ---------------- AUDIT LOGS ----------------
  async getAuditLogs(): Promise<AuditLog[]> {
    let logs = loadLocal<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);

    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          logs = snapshot.docs.map((d) => d.data() as AuditLog);
        }
      } catch (err) {
        console.warn('Firebase getAuditLogs error:', err);
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  async addAuditLog(
    action: string,
    category: AuditLog['category'],
    details: string,
    performedBy: string,
    targetId?: string
  ): Promise<void> {
    const logs = loadLocal<AuditLog[]>(KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      category,
      details,
      performedBy,
      timestamp: new Date().toISOString(),
      ...(targetId ? { targetId } : {}),
    };

    const updated = [newLog, ...logs];
    saveLocal(KEYS.AUDIT_LOGS, updated);

    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
      } catch (err) {
        console.warn('Firebase addAuditLog error:', err);
      }
    }
  },

  // ---------------- PRIVATE E2E ENCRYPTED MEMBER CHAT ----------------
  // Messages automatically delete after 12 hours to avoid overloading
  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
    // Auto-prune messages older than 12 hours
    const valid = all.filter((m) => new Date(m.timestamp).getTime() > twelveHoursAgo);
    if (valid.length !== all.length) {
      saveLocal(KEYS.CHAT_MESSAGES, valid);
    }
    return valid.filter((m) => m.sessionId === sessionId);
  },

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'expiresAt' | 'status'> & { status?: 'sent' | 'delivered' | 'seen' }): Promise<ChatMessage> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      // Auto-expires in 12 hours
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      status: message.status || 'delivered',
    };

    const updated = [...all, newMessage];
    saveLocal(KEYS.CHAT_MESSAGES, updated);
    return newMessage;
  },

  async markMessagesSeen(sessionId: string, viewerId: string): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    let changed = false;
    const updated = all.map((m) => {
      if (m.sessionId === sessionId && m.recipientId === viewerId && m.status !== 'seen') {
        changed = true;
        return { ...m, status: 'seen' as const };
      }
      return m;
    });
    if (changed) {
      saveLocal(KEYS.CHAT_MESSAGES, updated);
    }
  },

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'seen'): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const updated = all.map((m) => (m.id === messageId ? { ...m, status } : m));
    saveLocal(KEYS.CHAT_MESSAGES, updated);
  },

  async clearChatSession(sessionId: string): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const remaining = all.filter((m) => m.sessionId !== sessionId);
    saveLocal(KEYS.CHAT_MESSAGES, remaining);
  },

  // ---------------- CSV EXPORTS ----------------
  exportMembersCSV(members: MemberProfile[]): string {
    const headers = ['Member ID', 'Full Name', 'Phone', 'Email', 'Batch', 'Study Goal', 'Status', 'Warnings', 'Registration Date'];
    const rows = members.map((m) => [
      `"${m.id}"`,
      `"${m.fullName.replace(/"/g, '""')}"`,
      `"${m.phoneNumber}"`,
      `"${m.email}"`,
      `"${m.batch}"`,
      `"${m.studyTarget || ''}"`,
      `"${m.membershipStatus}"`,
      `"${m.warningCount}/10"`,
      `"${m.registrationDate}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  exportAttendanceCSV(records: AttendanceRecord[]): string {
    const headers = ['Record ID', 'Date', 'Member ID', 'Member Name', 'Status', 'Check-In', 'Marked By', 'Modified Reason'];
    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.memberId}"`,
      `"${r.memberName.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.checkInTime || 'N/A'}"`,
      `"${r.markedBy}"`,
      `"${r.modifiedReason || ''}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },

  // ---------------- DYNAMIC FACILITIES & INFRASTRUCTURE ----------------
  async getFacilities(): Promise<LibraryFacility[]> {
    const list = loadLocal<LibraryFacility[]>(KEYS.FACILITIES, INITIAL_FACILITIES);
    // Ensure cabin facility includes separate lockers for every student
    const cabin = list.find((f) => f.id === 'fac-1' || f.name.toLowerCase().includes('cabin'));
    if (cabin && !cabin.description.toLowerCase().includes('locker')) {
      cabin.name = 'Private Silent Cabins & Attached Personal Lockers';
      cabin.description = 'Acoustically soundproofed private study cabins with separate secure lockers for every student attached to their cabins, personal reading spotlight, and power outlets.';
      saveLocal(KEYS.FACILITIES, list);
    }
    return list;
  },

  async addFacility(facility: Omit<LibraryFacility, 'id'>, _adminName: string): Promise<LibraryFacility> {
    const list = await this.getFacilities();
    const newFacility: LibraryFacility = {
      ...facility,
      id: `fac-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: facility.order || list.length + 1,
    };
    const updated = [...list, newFacility];
    saveLocal(KEYS.FACILITIES, updated);
    return newFacility;
  },

  async updateFacility(id: string, updates: Partial<LibraryFacility>, _adminName: string): Promise<LibraryFacility | null> {
    const list = await this.getFacilities();
    const idx = list.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    saveLocal(KEYS.FACILITIES, list);
    return list[idx];
  },

  async deleteFacility(id: string, _adminName: string): Promise<boolean> {
    const list = await this.getFacilities();
    const filtered = list.filter((f) => f.id !== id);
    saveLocal(KEYS.FACILITIES, filtered);
    return true;
  },

  // ---------------- DYNAMIC LIBRARY RULES & CODE OF CONDUCT ----------------
  async getRules(): Promise<LibraryRule[]> {
    return loadLocal<LibraryRule[]>(KEYS.RULES, INITIAL_RULES);
  },

  async addRule(rule: Omit<LibraryRule, 'id'>, _adminName: string): Promise<LibraryRule> {
    const list = await this.getRules();
    const newRule: LibraryRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ruleNumber: rule.ruleNumber || list.length + 1,
    };
    const updated = [...list, newRule];
    saveLocal(KEYS.RULES, updated);
    return newRule;
  },

  async updateRule(id: string, updates: Partial<LibraryRule>, _adminName: string): Promise<LibraryRule | null> {
    const list = await this.getRules();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    saveLocal(KEYS.RULES, list);
    return list[idx];
  },

  async deleteRule(id: string, _adminName: string): Promise<boolean> {
    const list = await this.getRules();
    const filtered = list.filter((r) => r.id !== id);
    saveLocal(KEYS.RULES, filtered);
    return true;
  },

  // ---------------- DYNAMIC PHOTO CAROUSEL & CAMPUS GALLERY (MAX 8 PHOTOS) ----------------
  async getCarouselPhotos(): Promise<CarouselPhoto[]> {
    return loadLocal<CarouselPhoto[]>(KEYS.CAROUSEL_PHOTOS, INITIAL_CAROUSEL_PHOTOS);
  },

  async addCarouselPhoto(
    photo: Omit<CarouselPhoto, 'id' | 'order'>,
    adminName: string
  ): Promise<{ success: boolean; photo?: CarouselPhoto; error?: string }> {
    const list = await this.getCarouselPhotos();
    if (list.length >= 8) {
      return {
        success: false,
        error: 'Maximum limit of 8 carousel photos reached. You must delete an existing photo first to upload a new one.',
      };
    }
    const newPhoto: CarouselPhoto = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      order: list.length + 1,
      uploadedAt: new Date().toISOString(),
      isCustom: true,
    };
    const updated = [...list, newPhoto];
    saveLocal(KEYS.CAROUSEL_PHOTOS, updated);
    await this.addAuditLog(
      'CAROUSEL_PHOTO_ADDED',
      'SYSTEM',
      `Admin added new carousel photo: "${newPhoto.title}" (Total: ${updated.length}/8).`,
      adminName
    );
    return { success: true, photo: newPhoto };
  },

  async replaceCarouselPhoto(
    id: string,
    updates: Partial<CarouselPhoto>,
    adminName: string
  ): Promise<{ success: boolean; photo?: CarouselPhoto; error?: string }> {
    const list = await this.getCarouselPhotos();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) {
      return { success: false, error: 'Photo not found in carousel.' };
    }
    list[idx] = {
      ...list[idx],
      ...updates,
      uploadedAt: new Date().toISOString(),
      isCustom: true,
    };
    saveLocal(KEYS.CAROUSEL_PHOTOS, list);
    await this.addAuditLog(
      'CAROUSEL_PHOTO_REPLACED',
      'SYSTEM',
      `Admin replaced carousel photo slot #${list[idx].order}: "${list[idx].title}".`,
      adminName
    );
    return { success: true, photo: list[idx] };
  },

  async deleteCarouselPhoto(id: string, adminName: string): Promise<{ success: boolean; error?: string }> {
    const list = await this.getCarouselPhotos();
    const target = list.find((p) => p.id === id);
    if (!target) {
      return { success: false, error: 'Photo not found.' };
    }
    if (list.length <= 1) {
      return { success: false, error: 'The carousel must retain at least 1 photo.' };
    }
    const filtered = list.filter((p) => p.id !== id);
    const reordered = filtered.map((p, idx) => ({ ...p, order: idx + 1 }));
    saveLocal(KEYS.CAROUSEL_PHOTOS, reordered);
    await this.addAuditLog(
      'CAROUSEL_PHOTO_DELETED',
      'SYSTEM',
      `Admin deleted carousel photo: "${target.title}" (Remaining: ${reordered.length}/8).`,
      adminName
    );
    return { success: true };
  },

  async resetToDefaultCarouselPhotos(adminName: string): Promise<CarouselPhoto[]> {
    saveLocal(KEYS.CAROUSEL_PHOTOS, INITIAL_CAROUSEL_PHOTOS);
    await this.addAuditLog(
      'CAROUSEL_PHOTOS_RESET',
      'SYSTEM',
      'Admin restored original 8 campus gallery photos.',
      adminName
    );
    return INITIAL_CAROUSEL_PHOTOS;
  },
};
