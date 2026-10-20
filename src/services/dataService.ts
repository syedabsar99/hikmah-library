import type {
  MemberProfile,
  MemberDirectoryItem,
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
import { db, isFirebaseConfigured } from './firebase.ts';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

// Storage keys for persistent offline / local-first operation
const KEYS = {
  MEMBERS: 'hikmah_members_v3',
  DELETED_MEMBERS: 'hikmah_deleted_members_v2',
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
  MEMBER_AVATARS: 'hikmah_member_avatars_v1',
  MEMBER_DIRECTORY: 'hikmah_member_directory_v1',
};

// Seed Data
const INITIAL_MEMBERS: MemberProfile[] = [
  {
    id: 'HIK-2026-001',
    uid: '4BOkJxfKzYfGiOhpgeAmVbQQDZN2',
    fullName: 'Syed Absar',
    email: 'syedabsemia@gmail.com',
    phoneNumber: '+919622497807',
    registrationDate: '2026-10-18',
    joiningDate: '2026-10-18',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'Competitive Exams/Higher Studies',
    seatNumber: 'Desk B-12',
    warningCount: 0,
    feeDueDate: '2026-11-18',
    feeStatus: 'Paid',
    monthlyFee: 1200,
    feeReminders: [],
    passcode: 'Absar@12345',
    notes: 'Registered member',
  },
  {
    id: 'HIK-2026-002',
    uid: 'mem-real-002',
    fullName: 'Sadaf Majeed',
    email: 'sadafmajeed555@gmail.com',
    phoneNumber: '7006628964',
    registrationDate: '2026-09-19',
    joiningDate: '2026-09-19',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'NEET',
    seatNumber: 'D-70',
    warningCount: 0,
    feeDueDate: '2026-11-19',
    feeStatus: 'Paid',
    monthlyFee: 1000,
    feeReminders: [],
    notes: 'Registered member',
  },
  {
    id: 'HIK-2026-004',
    uid: 'mem-real-004',
    fullName: 'Muneer Maqbool',
    email: 'muneercusrinagar@gmail.com',
    phoneNumber: '7006467029',
    registrationDate: '2026-10-19',
    joiningDate: '2026-10-19',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'B.ED',
    seatNumber: 'D-14',
    warningCount: 0,
    feeDueDate: '2026-11-19',
    feeStatus: 'Paid',
    monthlyFee: 1000,
    feeReminders: [],
    passcode: 'Muneer@12345',
    hasRegistered: true,
    notes: 'Registered member',
  },
  {
    id: 'HIK-2026-030',
    uid: 'WhEZQ3a30BdWo1PJSnn8XYgwTbs2',
    fullName: 'Amaan Zulfazal',
    email: 'myeyesonly904@gmail.com',
    phoneNumber: '9103108889',
    registrationDate: '2026-10-20',
    joiningDate: '2026-09-09',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: '11-TH',
    seatNumber: 'D-000',
    warningCount: 0,
    feeDueDate: '2026-10-09',
    feeStatus: 'Overdue',
    monthlyFee: 1000,
    feeReminders: [
      {
        id: 'rem-1792513945549-gql9',
        daysOverdue: 11,
        date: '2026-10-20',
        message: 'Important Reminder: Your monthly study lounge membership fee of ₹1000 was due on 2026-10-09 (expired by 11 day(s)). Please clear your dues at the library desk to retain your assigned seat.',
        sentBy: 'Chief Librarian',
      },
    ],
    passcode: 'Aman@123',
    hasRegistered: true,
    notes: 'Registered member',
  },
  {
    id: 'HIK-2026-031',
    uid: 'JVoQb6txHyX8Tg0ZgAVKujykqfl2',
    fullName: 'syed noor ul absar',
    email: 'absarsyed804@gmail.com',
    phoneNumber: '9622497805',
    registrationDate: '2026-10-20',
    joiningDate: '2026-10-01',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'KAS',
    seatNumber: 'D-333',
    warningCount: 0,
    feeDueDate: '2026-11-01',
    feeStatus: 'Paid',
    monthlyFee: 1000,
    feeReminders: [],
    passcode: 'Absar@123',
    hasRegistered: true,
    notes: 'Registered member',
  },
  {
    id: 'HIK-2026-032',
    uid: 'uid-1792516775439-rw32q',
    fullName: 'syed insha bukhari',
    email: 'practicejs277@gmail.com',
    phoneNumber: '9622497805',
    registrationDate: '2026-10-20',
    joiningDate: '2026-10-20',
    membershipStatus: 'Active',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: 'UPSC Civil Services Examination',
    seatNumber: 'D-99',
    warningCount: 0,
    feeDueDate: '2026-11-20',
    feeStatus: 'Paid',
    monthlyFee: 1000,
    feeReminders: [],
    passcode: 'Insha@123',
    hasRegistered: true,
    notes: 'Registered member',
  },
];

const INITIAL_WARNINGS: WarningRecord[] = [];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

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
    details: 'Registered member Syed Absar (ID: HIK-2026-001) for Dedicated 24/7 Access.',
    timestamp: '2026-10-18T09:00:00.000Z',
    targetId: 'HIK-2026-001',
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

// Mutex to serialize concurrent member registrations and prevent double-clicks
let addMemberMutex: Promise<any> = Promise.resolve();

export const DataService = {
  // Database Mode Information
  // Google Cloud Firestore Live Backend (Real-Time Multi-Device Sync)
  isLiveFirebase(): boolean {
    return Boolean(
      isFirebaseConfigured() &&
      db
    );
  },

  getLocalAvatar(memberId: string): string {
    if (typeof localStorage === 'undefined' || !memberId) return '';
    try {
      const direct = localStorage.getItem(`hikmah_avatar_${memberId}`);
      if (direct) return direct;
      const map = loadLocal<Record<string, string>>(KEYS.MEMBER_AVATARS, {});
      return map[memberId] || '';
    } catch {
      return '';
    }
  },

  setLocalAvatar(memberId: string, avatarUrl: string): void {
    if (typeof localStorage === 'undefined' || !memberId) return;
    try {
      if (avatarUrl) {
        localStorage.setItem(`hikmah_avatar_${memberId}`, avatarUrl);
        const map = loadLocal<Record<string, string>>(KEYS.MEMBER_AVATARS, {});
        map[memberId] = avatarUrl;
        saveLocal(KEYS.MEMBER_AVATARS, map);
      } else {
        localStorage.removeItem(`hikmah_avatar_${memberId}`);
        const map = loadLocal<Record<string, string>>(KEYS.MEMBER_AVATARS, {});
        delete map[memberId];
        saveLocal(KEYS.MEMBER_AVATARS, map);
      }
    } catch (e) {
      console.warn('Error saving local avatar:', e);
    }
  },

  // Synchronous Local Storage Getters for Instant Zero-Flicker Initial Renders
  getLocalMembersSync(): MemberProfile[] {
    const deletedList = loadLocal<string[]>(KEYS.DELETED_MEMBERS, []);
    // Prune any email addresses from deleted list so student emails are NEVER permanently tombstoned
    const validDeletedIds = deletedList.filter((s) => {
      const clean = (s || '').toLowerCase().trim();
      return clean && !clean.includes('@');
    });
    if (validDeletedIds.length !== deletedList.length) {
      saveLocal(KEYS.DELETED_MEMBERS, validDeletedIds);
    }
    const deletedSet = new Set(validDeletedIds.map((s) => s.toLowerCase().trim()));

    let list = loadLocal<MemberProfile[]>(KEYS.MEMBERS, INITIAL_MEMBERS);

    // Clean out dummy @example.com test accounts permanently
    const nonDummyList = list.filter((m) => m.email && !m.email.toLowerCase().endsWith('@example.com'));
    if (nonDummyList.length !== list.length) {
      list = nonDummyList.length > 0 ? nonDummyList : [...INITIAL_MEMBERS];
      saveLocal(KEYS.MEMBERS, list);
    }

    // Active members in local storage must NEVER be deleted by stale tombstones
    const existingEmails = new Set(list.map((m) => (m.email || '').toLowerCase().trim()));
    const existingIds = new Set(list.map((m) => (m.id || '').toLowerCase().trim()));

    // Clean deletedSet to unblock any actively registered member
    let cleanedDeleted = false;
    validDeletedIds.forEach((item) => {
      const clean = (item || '').toLowerCase().trim();
      if (existingEmails.has(clean) || existingIds.has(clean)) {
        deletedSet.delete(clean);
        cleanedDeleted = true;
      }
    });
    if (cleanedDeleted) {
      saveLocal(KEYS.DELETED_MEMBERS, Array.from(deletedSet));
    }

    // Automatically merge any newly added seed members UNLESS their ID was deleted by the admin!
    let hasNewSeed = false;
    for (const seed of INITIAL_MEMBERS) {
      const seedId = (seed.id || '').toLowerCase().trim();
      if (deletedSet.has(seedId)) {
        continue;
      }
      if (!existingIds.has(seedId)) {
        list.push(seed);
        hasNewSeed = true;
      }
    }
    if (hasNewSeed) {
      saveLocal(KEYS.MEMBERS, list);
    }

    return list.map((m) => {
      const joiningDate = m.joiningDate || m.registrationDate || '2026-10-18';
      const feeDueDate = m.feeDueDate || '2026-11-18';
      const monthlyFee = m.monthlyFee || 1000;
      const feeReminders = m.feeReminders || [];
      const currentFeeStatus: FeeStatus = m.feeStatus || 'Paid';
      const { status } = calculateFeeStatus(feeDueDate);
      let calculatedStatus: FeeStatus = currentFeeStatus;
      if (status === 'Overdue' && currentFeeStatus !== 'Overdue') {
        calculatedStatus = 'Overdue';
      } else if (status === 'Due' && currentFeeStatus === 'Paid') {
        calculatedStatus = 'Due';
      }

      const avatarUrl = m.avatarUrl || this.getLocalAvatar(m.id) || '';

      return {
        ...m,
        avatarUrl,
        joiningDate,
        feeDueDate,
        monthlyFee,
        feeReminders,
        feeStatus: calculatedStatus,
        registrationDate: m.registrationDate || joiningDate,
        studyTarget: m.studyTarget || 'Self Study',
        seatNumber: m.seatNumber || 'Unassigned',
      };
    });
  },

  getLocalWarningsSync(): WarningRecord[] {
    return loadLocal<WarningRecord[]>(KEYS.WARNINGS, INITIAL_WARNINGS);
  },

  getLocalAnnouncementsSync(): Announcement[] {
    return loadLocal<Announcement[]>(KEYS.ANNOUNCEMENTS, INITIAL_ANNOUNCEMENTS);
  },

  getLocalFacilitiesSync(): LibraryFacility[] {
    return loadLocal<LibraryFacility[]>(KEYS.FACILITIES, INITIAL_FACILITIES);
  },

  getLocalRulesSync(): LibraryRule[] {
    return loadLocal<LibraryRule[]>(KEYS.RULES, INITIAL_RULES);
  },

  getLocalCarouselPhotosSync(): CarouselPhoto[] {
    return loadLocal<CarouselPhoto[]>(KEYS.CAROUSEL_PHOTOS, INITIAL_CAROUSEL_PHOTOS);
  },

  // Cloud Synchronization for Multi-Device Student & Member Directory Consistency
  async syncCloudMembers(): Promise<MemberProfile[]> {
    if (typeof window === 'undefined' || !window.location) {
      return this.getLocalMembersSync();
    }
    try {
      let cloudList: MemberProfile[] | null = null;

      // 0. Primary Cloud Source: Google Cloud Firestore (Immediate live sync)
      if (this.isLiveFirebase() && db) {
        try {
          const snap = await getDocs(collection(db, 'member_profiles'));
          if (snap && !snap.empty) {
            cloudList = snap.docs.map((d) => d.data() as MemberProfile);
          }
        } catch (fbErr) {
          console.warn('Firestore cloud fetch note:', fbErr);
        }
      }

      if (cloudList && cloudList.length > 0) {
        // Exclude dummy test accounts ending with @example.com
        cloudList = cloudList.filter((m) => m.email && !m.email.toLowerCase().endsWith('@example.com'));

        const mergedMap = new Map<string, MemberProfile>();

        // 1. Authoritative Cloud members from Firestore
        cloudList.forEach((m) => {
          const id = (m.id || '').toLowerCase().trim();
          if (id) {
            const persistedAvatar = this.getLocalAvatar(m.id);
            const avatarUrl = m.avatarUrl || persistedAvatar || '';
            mergedMap.set(id, { ...m, avatarUrl });
          }
        });

        // Authoritative cloud members from Firestore
        const mergedArray = Array.from(mergedMap.values());
        saveLocal(KEYS.MEMBERS, mergedArray);
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          try {
            window.dispatchEvent(new CustomEvent('hikmah_members_synced', { detail: mergedArray }));
          } catch {}
        }
        return mergedArray;
      }
    } catch (e) {
      console.warn('Cloud members sync notice (using local storage):', e);
    }
    return this.getLocalMembersSync();
  },

  async pushMembersToCloud(members: MemberProfile[]): Promise<void> {
    // Primary Cloud Target: Google Cloud Firestore (Immediate, 100% Free, 50,000 writes/day)
    if (this.isLiveFirebase() && db) {
      try {
        const cleanMembers = members.filter((m) => m.email && !m.email.toLowerCase().endsWith('@example.com'));
        for (const m of cleanMembers) {
          if (m.id) {
            await setDoc(doc(db, 'member_profiles', m.id), m, { merge: true });
            const dirDoc: MemberDirectoryItem = {
              id: m.id,
              uid: m.uid || '',
              fullName: m.fullName,
              seatNumber: m.seatNumber || 'Unassigned',
              batch: m.batch || '24/7 Dedicated Access',
              studyTarget: m.studyTarget || 'General',
              membershipStatus: m.membershipStatus || 'Active',
              avatarUrl: m.avatarUrl || '',
            };
            await setDoc(doc(db, 'member_directory', m.id), dirDoc, { merge: true });
          }
        }
      } catch (fbErr) {
        console.warn('Firestore push notice:', fbErr);
      }
    }
  },

  // ---------------- MEMBERSHIP OPERATIONS ----------------
  async getMembers(): Promise<MemberProfile[]> {
    let list: MemberProfile[] = [];
    if (this.isLiveFirebase() && db) {
      try {
        const q = query(collection(db, 'member_profiles'), orderBy('id', 'asc'));
        const fetchPromise = getDocs(q);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
        const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
        if (snapshot && !snapshot.empty) {
          list = snapshot.docs.map((doc) => doc.data() as MemberProfile);
        }
      } catch (err) {
        console.warn('Firebase getMembers query error, falling back to local store:', err);
      }
    }

    const deletedList = loadLocal<string[]>(KEYS.DELETED_MEMBERS, []);
    const deletedSet = new Set(deletedList.map((s) => s.toLowerCase().trim()));

    // Exclude dummy test accounts ending with @example.com AND any tombstoned IDs
    list = list.filter((m) => {
      const id = (m.id || '').toLowerCase().trim();
      return m.email && !m.email.toLowerCase().endsWith('@example.com') && !deletedSet.has(id);
    });

    const localMembers = this.getLocalMembersSync().filter((m) => {
      const id = (m.id || '').toLowerCase().trim();
      return id && !deletedSet.has(id);
    });

    if (list.length > 0) {
      const memberMap = new Map<string, MemberProfile>();
      list.forEach((m) => {
        const key = (m.id || m.email || '').toLowerCase().trim();
        const id = (m.id || '').toLowerCase().trim();
        if (key && !deletedSet.has(id)) {
          const persistedAvatar = this.getLocalAvatar(m.id);
          const avatarUrl = m.avatarUrl || persistedAvatar || '';
          memberMap.set(key, { ...m, avatarUrl });
        }
      });

      list = Array.from(memberMap.values());
      saveLocal(KEYS.MEMBERS, list);
    } else {
      list = localMembers;
    }

    // Refresh dynamic fee status based on current date and backfill missing schema fields
    const updated: MemberProfile[] = list.map((m) => {
      const joiningDate = m.joiningDate || m.registrationDate || '2026-10-18';
      const feeDueDate = m.feeDueDate || '2026-11-18';
      const monthlyFee = m.monthlyFee || 1000;
      const feeReminders = m.feeReminders || [];
      const currentFeeStatus: FeeStatus = m.feeStatus || 'Paid';

      const { status } = calculateFeeStatus(feeDueDate);
      let calculatedStatus: FeeStatus = currentFeeStatus;
      if (status === 'Overdue' && currentFeeStatus !== 'Overdue') {
        calculatedStatus = 'Overdue';
      } else if (status === 'Due' && currentFeeStatus === 'Paid') {
        calculatedStatus = 'Due';
      }

      const avatarUrl = m.avatarUrl || this.getLocalAvatar(m.id) || '';

      return {
        ...m,
        avatarUrl,
        joiningDate,
        feeDueDate,
        monthlyFee,
        feeReminders,
        feeStatus: calculatedStatus,
      };
    });

    return updated.filter((m) => {
      const id = (m.id || '').toLowerCase().trim();
      return id && !deletedSet.has(id);
    });
  },

  async getMemberById(id: string): Promise<MemberProfile | null> {
    if (!id) return null;
    if (this.isLiveFirebase() && db) {
      try {
        const snap = await getDoc(doc(db, 'member_profiles', id));
        if (snap && snap.exists()) {
          return snap.data() as MemberProfile;
        }
      } catch (err) {
        console.warn('Firebase getMemberById error:', err);
      }
    }
    const members = this.getLocalMembersSync();
    return members.find((m) => m.id === id || m.uid === id) || null;
  },

  async getMemberDirectory(): Promise<MemberDirectoryItem[]> {
    let list: MemberDirectoryItem[] = [];
    if (this.isLiveFirebase() && db) {
      try {
        const snap = await getDocs(collection(db, 'member_directory'));
        if (snap && !snap.empty) {
          list = snap.docs.map((d) => d.data() as MemberDirectoryItem);
        }
      } catch (err) {
        console.warn('Firebase getMemberDirectory note:', err);
      }
    }

    if (list.length > 0) {
      saveLocal(KEYS.MEMBER_DIRECTORY, list);
      return list;
    }

    // Fallback to local cache of directory or derive sanitized directory from local members
    const localDir = loadLocal<MemberDirectoryItem[]>(KEYS.MEMBER_DIRECTORY, []);
    if (localDir.length > 0) {
      return localDir;
    }

    const localMembers = this.getLocalMembersSync();
    return localMembers.map((m) => ({
      id: m.id,
      uid: m.uid || '',
      fullName: m.fullName,
      seatNumber: m.seatNumber || 'Unassigned',
      batch: m.batch || '24/7 Dedicated Access',
      studyTarget: m.studyTarget || 'General',
      membershipStatus: m.membershipStatus || 'Active',
      avatarUrl: m.avatarUrl || '',
    }));
  },

  checkMemberDuplicate(
    email: string,
    phoneNumber: string,
    excludeMemberId?: string
  ): { isDuplicate: boolean; field?: 'email' | 'phone'; member?: MemberProfile; message?: string } {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhoneDigits = (phoneNumber || '').replace(/\D/g, '').slice(-10);

    const members = this.getLocalMembersSync();

    if (cleanEmail) {
      const emailMatch = members.find((m) => {
        if (excludeMemberId && (m.id === excludeMemberId || m.uid === excludeMemberId)) return false;
        return (m.email || '').trim().toLowerCase() === cleanEmail;
      });
      if (emailMatch) {
        return {
          isDuplicate: true,
          field: 'email',
          member: emailMatch,
          message: `A member with email "${cleanEmail}" already exists in the library directory (${emailMatch.fullName}, ID: ${emailMatch.id}). Duplicate email addresses are not permitted.`,
        };
      }
    }

    if (cleanPhoneDigits.length === 10) {
      const phoneMatch = members.find((m) => {
        if (excludeMemberId && (m.id === excludeMemberId || m.uid === excludeMemberId)) return false;
        const p = (m.phoneNumber || '').replace(/\D/g, '').slice(-10);
        return p === cleanPhoneDigits;
      });
      if (phoneMatch) {
        return {
          isDuplicate: true,
          field: 'phone',
          member: phoneMatch,
          message: `A member with mobile number "${phoneNumber}" already exists in the library directory (${phoneMatch.fullName}, ID: ${phoneMatch.id}). Duplicate mobile numbers are not permitted.`,
        };
      }
    }

    return { isDuplicate: false };
  },

  async addMember(member: Omit<MemberProfile, 'id'>, adminName: string): Promise<MemberProfile> {
    // Wrap inside mutex to serialize concurrent clicks and prevent duplicates
    return (addMemberMutex = addMemberMutex.catch(() => {}).then(async () => {
      const members = await this.getMembers();

      const cleanEmail = (member.email || '').toLowerCase().trim();
      const cleanPhoneDigits = (member.phoneNumber || '').replace(/\D/g, '').slice(-10);

      // 1. Strict Duplicate Check: Email
      if (cleanEmail) {
        const emailMatch = members.find((m) => (m.email || '').toLowerCase().trim() === cleanEmail);
        if (emailMatch) {
          throw new Error(
            `A member with email "${cleanEmail}" already exists in the library directory (${emailMatch.fullName}, ID: ${emailMatch.id}). Duplicate emails are strictly prohibited.`
          );
        }
      }

      // 2. Strict Duplicate Check: Phone Number
      if (cleanPhoneDigits.length === 10) {
        const phoneMatch = members.find((m) => {
          const p = (m.phoneNumber || '').replace(/\D/g, '').slice(-10);
          return p === cleanPhoneDigits;
        });
        if (phoneMatch) {
          throw new Error(
            `A member with phone number "${member.phoneNumber}" already exists in the library directory (${phoneMatch.fullName}, ID: ${phoneMatch.id}). Duplicate phone numbers are strictly prohibited.`
          );
        }
      }
      
      // Auto-generate next unique Member ID across ALL active and historical IDs
      const year = new Date().getFullYear();
      const deletedList = loadLocal<string[]>(KEYS.DELETED_MEMBERS, []);
      const allKnownIds = [
        ...members.map((m) => m.id),
        ...deletedList,
        ...INITIAL_MEMBERS.map((m) => m.id),
      ];
      let highestNum = 0;
      for (const rawId of allKnownIds) {
        if (typeof rawId === 'string') {
          const match = rawId.match(/HIK-\d+-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > highestNum) highestNum = num;
          }
        }
      }
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
      // Save locally immediately for 100% zero-lag persistence
      saveLocal(KEYS.MEMBERS, updated);

      // Unblock this new member ID & email from deletedList
      const cleanId = newId.toLowerCase().trim();
      const filteredDeleted = deletedList.filter((s) => {
        const clean = (s || '').toLowerCase().trim();
        return clean !== cleanEmail && clean !== cleanId;
      });
      saveLocal(KEYS.DELETED_MEMBERS, filteredDeleted);

      // Persist to cloud asynchronously in background without blocking UI
      this.pushMembersToCloud(updated).catch((err) => {
        console.warn('Cloud sync background notice:', err);
      });

      if (this.isLiveFirebase() && db) {
        setDoc(doc(db, 'member_profiles', newId), newMember, { merge: true }).catch((err) => {
          console.warn('Firebase addMember sync error:', err);
        });
        const dirItem: MemberDirectoryItem = {
          id: newId,
          uid: newMember.uid,
          fullName: newMember.fullName,
          seatNumber: newMember.seatNumber,
          batch: newMember.batch,
          studyTarget: newMember.studyTarget,
          membershipStatus: newMember.membershipStatus,
          avatarUrl: newMember.avatarUrl || '',
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(db, 'member_directory', newId), dirItem, { merge: true }).catch((err) => {
          console.warn('Firebase addMember directory sync error:', err);
        });
      }

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
          window.dispatchEvent(new CustomEvent('hikmah_member_updated', { detail: newMember }));
          window.dispatchEvent(new CustomEvent('storage'));
        } catch {}
      }

      await this.addAuditLog(
        'MEMBER_REGISTERED',
        'MEMBER',
        `Registered new member ${newMember.fullName} with Member ID ${newId} (${newMember.batch}).`,
        adminName,
        newId
      );

      return newMember;
    }));
  },

  async updateMember(id: string, updates: Partial<MemberProfile>, adminName: string): Promise<MemberProfile | null> {
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const updatedMember = { ...members[index], ...updates };
    members[index] = updatedMember;
    saveLocal(KEYS.MEMBERS, members);
    this.pushMembersToCloud(members);

    if (this.isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'member_profiles', id), updates);
      } catch (err) {
        console.warn('Firebase updateMember sync error:', err);
      }

      // Sync public directory fields to member_directory
      const dirUpdates: Partial<MemberDirectoryItem> = {};
      if (updates.fullName !== undefined) dirUpdates.fullName = updates.fullName;
      if (updates.seatNumber !== undefined) dirUpdates.seatNumber = updates.seatNumber;
      if (updates.batch !== undefined) dirUpdates.batch = updates.batch;
      if (updates.studyTarget !== undefined) dirUpdates.studyTarget = updates.studyTarget;
      if (updates.membershipStatus !== undefined) dirUpdates.membershipStatus = updates.membershipStatus;
      if (updates.avatarUrl !== undefined) dirUpdates.avatarUrl = updates.avatarUrl;
      if (updates.uid !== undefined) dirUpdates.uid = updates.uid;

      if (Object.keys(dirUpdates).length > 0) {
        dirUpdates.updatedAt = new Date().toISOString();
        setDoc(doc(db, 'member_directory', id), dirUpdates, { merge: true }).catch((err) => {
          console.warn('Firebase updateMember directory sync error:', err);
        });
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
    // 1. Store in dedicated local avatar storage for instant offline & reload persistence
    this.setLocalAvatar(memberId, avatarUrl);

    // 2. Update in current local member list
    const members = await this.getMembers();
    const index = members.findIndex((m) => m.id === memberId || m.uid === memberId);
    if (index === -1) return null;

    members[index].avatarUrl = avatarUrl;
    saveLocal(KEYS.MEMBERS, members);

    // 3. Persist to Firestore with setDoc merge so document is created if not yet present
    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(
          doc(db, 'member_profiles', memberId),
          {
            ...members[index],
            avatarUrl,
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'member_directory', memberId),
          {
            avatarUrl,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Firebase updateMemberAvatar sync error:', err);
      }
    }

    // 4. Push updated members array to cloud blob
    await this.pushMembersToCloud(members);

    // 5. Broadcast real-time update event across components & tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hikmah_member_updated', { detail: members[index] }));
      window.dispatchEvent(new CustomEvent('storage'));
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
    const cleanId = (id || '').trim();
    const members = await this.getMembers();
    const target = members.find((m) => m.id === cleanId || (m.uid && m.uid === cleanId));
    if (!target) return false;

    const targetId = (target.id || '').trim();

    // 1. Permanently record member ID in deleted tracking list so this ID is retired
    const deletedList = loadLocal<string[]>(KEYS.DELETED_MEMBERS, []);
    const newDeletedSet = new Set<string>();
    deletedList.forEach((s) => {
      const clean = (s || '').toLowerCase().trim();
      // Keep only Member IDs in deletedList, NEVER email addresses!
      if (clean && !clean.includes('@')) {
        newDeletedSet.add(clean);
      }
    });
    if (targetId) newDeletedSet.add(targetId.toLowerCase());
    const updatedDeletedList = Array.from(newDeletedSet);
    saveLocal(KEYS.DELETED_MEMBERS, updatedDeletedList);

    // 2. Remove ONLY this member by ID from local members list immediately
    const filtered = members.filter((m) => {
      const mId = (m.id || '').toLowerCase().trim();
      const mUid = (m.uid || '').toLowerCase().trim();
      return mId !== targetId.toLowerCase() && (!target.uid || mUid !== target.uid.toLowerCase());
    });
    saveLocal(KEYS.MEMBERS, filtered);

    // 3. Remove from live cloud firestore (both member_profiles and member_directory)
    if (this.isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'member_profiles', targetId));
        await deleteDoc(doc(db, 'member_directory', targetId));
      } catch (err) {
        console.warn('Firebase deleteMember sync error:', err);
      }
    }

    // 4. Immediately purge all chat messages involving this deleted member
    try {
      const allMessages = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
      const remainingMessages = allMessages.filter(
        (m) => m.senderId !== targetId && m.recipientId !== targetId
      );
      saveLocal(KEYS.CHAT_MESSAGES, remainingMessages);
    } catch {
      // Ignore local storage error
    }

    // 6. Log audit event
    await this.addAuditLog(
      'MEMBER_DELETED',
      'MEMBER',
      `Permanently removed member record for ${target.fullName} (${targetId}). All portal access and chat records purged immediately.`,
      adminName,
      targetId
    );

    // 7. Broadcast global event so any active sessions or portals immediately terminate
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('hikmah_member_deleted', {
            detail: { memberId: targetId, email: target.email, fullName: target.fullName },
          })
        );
        window.dispatchEvent(new CustomEvent('storage'));
      } catch {
        // Browser environment check
      }
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
      ? `Important Reminder: Your monthly study lounge membership fee of ₹${member.monthlyFee || 1200} was due on ${member.feeDueDate} (expired by ${daysDiff} day(s)). Please clear your dues at the library desk to retain your assigned seat.`
      : `Upcoming Renewal Notice: Your monthly library membership fee of ₹${member.monthlyFee || 1200} is due on ${member.feeDueDate}.`;

    const reminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      message: customMessage || defaultMsg,
      daysOverdue: status === 'Overdue' ? daysDiff : 0,
      sentBy: adminName,
    };

    const existingReminders = member.feeReminders || [];
    // Deduplicate: filter out identical reminders for the same day and threshold, and cap at 3
    const filtered = existingReminders.filter(
      (r) => r.date !== reminder.date || r.daysOverdue !== reminder.daysOverdue
    );
    member.feeReminders = [reminder, ...filtered].slice(0, 3);
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

    const deletedList = loadLocal<string[]>(KEYS.DELETED_MEMBERS, []);
    const deletedSet = new Set(
      deletedList
        .filter((s) => typeof s === 'string' && !s.includes('@'))
        .map((s) => s.toLowerCase().trim())
    );

    const members = await this.getMembers();
    let found = members.find((m) => {
      const memberEmail = (m.email || '').trim().toLowerCase();
      if (memberEmail === cleanTarget) return true;
      // Also match if user enters syedabsar99, syednoorulabsar, or syedabsemia
      if (
        (cleanTarget === 'syedabsar99@gmail.com' || cleanTarget === 'syednoorulabsar@gmail.com' || cleanTarget === 'syedabsemia@gmail.com') &&
        (m.fullName.toLowerCase().includes('absar') || m.id === 'HIK-2026-001')
      ) {
        return true;
      }
      return false;
    });

    if (found) {
      if (cleanTarget === 'syedabsemia@gmail.com') {
        return { ...found, email: 'syedabsemia@gmail.com', fullName: 'Syed Absemia' };
      }
      return found;
    }

    // If not found in current memory/local storage, attempt cloud sync
    if (typeof fetch !== 'undefined') {
      try {
        const synced = await this.syncCloudMembers();
        found = synced.find((m) => {
          const memberEmail = (m.email || '').trim().toLowerCase();
          return memberEmail === cleanTarget;
        });
        if (found) return found;
      } catch {}
    }

    // Direct fallback to INITIAL_MEMBERS (only if member ID not deleted)
    if (!found) {
      found = INITIAL_MEMBERS.find((m) => {
        const mEmail = (m.email || '').trim().toLowerCase();
        const mId = (m.id || '').trim().toLowerCase();
        return (mEmail === cleanTarget || mId === cleanTarget) && !deletedSet.has(mId);
      });
    }
    return found;
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

  async deleteWarning(
    warningId: string,
    adminName: string
  ): Promise<{ success: boolean; newCount: number }> {
    const warnings = await this.getWarnings();
    const targetWarning = warnings.find((w) => w.id === warningId);
    if (!targetWarning) return { success: false, newCount: 0 };

    // 1. Permanently remove from warnings list in local storage
    const remainingWarnings = warnings.filter((w) => w.id !== warningId);
    saveLocal(KEYS.WARNINGS, remainingWarnings);

    // 2. Remove from Firebase Firestore if configured
    if (this.isLiveFirebase() && db) {
      try {
        await deleteDoc(doc(db, 'warning_records', warningId));
      } catch (err) {
        console.warn('Firebase deleteWarning error:', err);
      }
    }

    // 3. Recalculate member's active warning count based on remaining active warnings
    const member = await this.getMemberById(targetWarning.memberId);
    const remainingActiveForMember = remainingWarnings.filter(
      (w) => w.memberId === targetWarning.memberId && !w.isCorrected
    );
    const newCount = remainingActiveForMember.length;

    await this.updateMember(
      targetWarning.memberId,
      {
        warningCount: newCount,
        ...(newCount < 10 && member?.membershipStatus === 'Review' ? { membershipStatus: 'Active' } : {}),
      },
      adminName
    );

    // 4. Record audit log
    await this.addAuditLog(
      'WARNING_DELETED',
      'WARNING',
      `Permanently deleted Disciplinary Warning #${targetWarning.warningNumber} for ${targetWarning.memberName} (${targetWarning.memberId}). New warning count: ${newCount}/10.`,
      adminName,
      targetWarning.memberId
    );

    // 5. Dispatch real-time events for open student portals and dashboards
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hikmah_warnings_updated', {
          detail: { warningId, memberId: targetWarning.memberId, newCount },
        })
      );
      window.dispatchEvent(
        new CustomEvent('hikmah_member_updated', {
          detail: { memberId: targetWarning.memberId, warningCount: newCount },
        })
      );
    }

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
      setDoc(doc(db, 'audit_logs', newLog.id), newLog).catch((err) => {
        console.warn('Firebase addAuditLog error:', err);
      });
    }
  },

  // ---------------- PRIVATE E2E ENCRYPTED MEMBER CHAT ----------------
  // Messages automatically delete after 12 hours to avoid overloading
  async getChatMessages(sessionId: string, viewerUid?: string): Promise<ChatMessage[]> {
    let cloudMsgs: ChatMessage[] = [];
    if (this.isLiveFirebase() && db && sessionId) {
      try {
        let q;
        if (viewerUid) {
          q = query(
            collection(db, 'chat_messages'),
            where('sessionId', '==', sessionId),
            where('participantUids', 'array-contains', viewerUid)
          );
        } else {
          q = query(collection(db, 'chat_messages'), where('sessionId', '==', sessionId));
        }
        const snap = await getDocs(q);
        if (snap && !snap.empty) {
          cloudMsgs = snap.docs.map((d) => d.data() as ChatMessage);
        }
      } catch (err) {
        console.warn('Firestore getChatMessages note:', err);
      }
    }

    const localMsgs = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const mergedMap = new Map<string, ChatMessage>();
    localMsgs.forEach((m) => mergedMap.set(m.id, m));
    cloudMsgs.forEach((m) => mergedMap.set(m.id, m));

    const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
    const legacyDummyIds = new Set(['hik-2025-001', 'hik-2025-002', 'hik-2025-003', 'hik-2025-004']);
    // Auto-prune messages older than 12 hours and strip legacy dummy member chats
    const valid = Array.from(mergedMap.values()).filter((m) => {
      const isFresh = new Date(m.timestamp).getTime() > twelveHoursAgo;
      const isLegacyDummy = legacyDummyIds.has((m.senderId || '').toLowerCase()) ||
                            legacyDummyIds.has((m.recipientId || '').toLowerCase()) ||
                            (m.sessionId || '').toLowerCase().includes('hik-2025-');
      return isFresh && !isLegacyDummy;
    });
    saveLocal(KEYS.CHAT_MESSAGES, valid);
    const normSessionId = (sessionId || '').toLowerCase();
    const parts = normSessionId.split('--');
    const p1 = parts[0];
    const p2 = parts[1];

    return valid
      .filter((m) => {
        const mSess = (m.sessionId || '').toLowerCase();
        if (mSess === normSessionId) return true;
        if (p1 && p2) {
          const sId = (m.senderId || '').toLowerCase();
          const rId = (m.recipientId || '').toLowerCase();
          if ((sId === p1 && rId === p2) || (sId === p2 && rId === p1)) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  async getUnreadChatCounts(viewerId: string, viewerUid?: string): Promise<{ total: number; bySender: Record<string, number> }> {
    if (!viewerId) return { total: 0, bySender: {} };
    let cloudMsgs: ChatMessage[] = [];
    if (this.isLiveFirebase() && db) {
      try {
        let q;
        if (viewerUid) {
          q = query(
            collection(db, 'chat_messages'),
            where('participantUids', 'array-contains', viewerUid)
          );
        } else {
          q = query(
            collection(db, 'chat_messages'),
            where('recipientId', '==', viewerId)
          );
        }
        const snap = await getDocs(q);
        if (snap && !snap.empty) {
          cloudMsgs = snap.docs.map((d) => d.data() as ChatMessage);
        }
      } catch (err) {
        console.warn('Firestore getUnreadChatCounts note:', err);
      }
    }

    const localMsgs = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const mergedMap = new Map<string, ChatMessage>();
    localMsgs.forEach((m) => mergedMap.set(m.id, m));
    cloudMsgs.forEach((m) => mergedMap.set(m.id, m));

    const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;
    const legacyDummyIds = new Set(['hik-2025-001', 'hik-2025-002', 'hik-2025-003', 'hik-2025-004']);
    const valid = Array.from(mergedMap.values()).filter((m) => {
      const isFresh = new Date(m.timestamp).getTime() > twelveHoursAgo;
      const isLegacyDummy = legacyDummyIds.has((m.senderId || '').toLowerCase()) ||
                            legacyDummyIds.has((m.recipientId || '').toLowerCase()) ||
                            (m.sessionId || '').toLowerCase().includes('hik-2025-');
      return isFresh && !isLegacyDummy;
    });
    saveLocal(KEYS.CHAT_MESSAGES, valid);

    const normViewerId = (viewerId || '').trim().toLowerCase();
    const unread = valid.filter((m) => {
      const sId = (m.senderId || '').trim().toLowerCase();
      const rId = (m.recipientId || '').trim().toLowerCase();

      // SENDER RULE: Sender's own sent messages are NEVER unread for the sender!
      const isSender = sId === normViewerId;
      if (isSender) return false;

      // RECIPIENT RULE: Message is unread only if this viewer is the intended recipient
      const isRecipient = rId === normViewerId || Boolean(viewerUid && m.recipientUid && m.recipientUid === viewerUid && sId !== normViewerId);
      return isRecipient && m.status !== 'seen';
    });
    const bySender: Record<string, number> = {};
    for (const m of unread) {
      bySender[m.senderId] = (bySender[m.senderId] || 0) + 1;
    }
    return {
      total: unread.length,
      bySender,
    };
  },

  async sendChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp' | 'expiresAt' | 'status'> & { status?: 'sent' | 'delivered' | 'seen'; senderUid?: string; recipientUid?: string }): Promise<ChatMessage> {
    let sUid = (message.senderUid || '').trim();
    let rUid = (message.recipientUid || '').trim();

    const sId = (message.senderId || '').trim().toLowerCase();
    const rId = (message.recipientId || '').trim().toLowerCase();

    // If recipientUid is missing or cross-contaminated with senderUid, resolve true recipient UID from directory
    if ((!rUid || (rUid === sUid && sId !== rId)) && rId) {
      const localM = this.getLocalMembersSync().find((m) => (m.id || '').trim().toLowerCase() === rId);
      if (localM?.uid) {
        rUid = localM.uid;
      } else {
        const dir = loadLocal<MemberDirectoryItem[]>(KEYS.MEMBER_DIRECTORY, []);
        const dirM = dir.find((d) => (d.id || '').trim().toLowerCase() === rId);
        if (dirM?.uid) {
          rUid = dirM.uid;
        }
      }
    }

    // If senderUid is missing, resolve true sender UID from directory
    if (!sUid && sId) {
      const localM = this.getLocalMembersSync().find((m) => (m.id || '').trim().toLowerCase() === sId);
      if (localM?.uid) {
        sUid = localM.uid;
      }
    }

    const participantUids = Array.from(new Set([sUid, rUid].filter(Boolean)));

    const newMessage: ChatMessage = {
      ...message,
      senderUid: sUid,
      recipientUid: rUid,
      participantUids,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      // Auto-expires in 12 hours
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      status: 'delivered', // Messages ALWAYS initialize as 'delivered' (grey double ticks)
    };

    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const updated = [...all, newMessage];
    saveLocal(KEYS.CHAT_MESSAGES, updated);

    // Persist to Google Cloud Firestore immediately for multi-device sync
    if (this.isLiveFirebase() && db) {
      try {
        await setDoc(doc(db, 'chat_messages', newMessage.id), newMessage);
      } catch (err: any) {
        console.error('CRITICAL: Firestore sendChatMessage failed:', err);
        throw new Error(`Failed to deliver message to cloud: ${err?.message || 'Permission denied'}`);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hikmah_chat_updated', {
        detail: { sessionId: newMessage.sessionId, senderId: newMessage.senderId, recipientId: newMessage.recipientId, action: 'sent' }
      }));
    }
    return newMessage;
  },

  async markMessagesSeen(sessionId: string, viewerId: string, viewerUid?: string, peerId?: string): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    let changed = false;
    const normSessionId = (sessionId || '').toLowerCase();
    const normViewerId = (viewerId || '').trim().toLowerCase();
    const normPeerId = (peerId || '').trim().toLowerCase();
    const parts = normSessionId.split('--');
    const p1 = parts[0]?.trim()?.toLowerCase();
    const p2 = parts[1]?.trim()?.toLowerCase();

    const updated = all.map((m) => {
      const sId = (m.senderId || '').trim().toLowerCase();
      const rId = (m.recipientId || '').trim().toLowerCase();
      const mSess = (m.sessionId || '').toLowerCase();

      // SENDER RULE: Sender viewing chat MUST NEVER mark their own sent message as seen!
      const isSender = sId === normViewerId;
      if (isSender) {
        return m;
      }

      // RECIPIENT RULE: Only the recipient viewing the message can mark it as seen!
      const isRecipient = rId === normViewerId || Boolean(viewerUid && m.recipientUid && m.recipientUid === viewerUid && sId !== normViewerId);
      const isForThisSession = mSess === normSessionId ||
        (p1 && p2 && ((sId === p1 && rId === p2) || (sId === p2 && rId === p1))) ||
        (normPeerId && sId === normPeerId && isRecipient);

      if (isForThisSession && isRecipient && m.status !== 'seen') {
        changed = true;
        if (this.isLiveFirebase() && db) {
          updateDoc(doc(db, 'chat_messages', m.id), { status: 'seen' }).catch((err) => {
            console.warn('Firestore markMessagesSeen status update error:', err);
          });
        }
        return { ...m, status: 'seen' as const };
      }
      return m;
    });
    if (changed) {
      saveLocal(KEYS.CHAT_MESSAGES, updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hikmah_chat_updated', {
          detail: { sessionId, viewerId, action: 'seen' }
        }));
      }
    }
  },

  async markAllMessagesRead(viewerId: string, viewerUid?: string): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const normViewerId = (viewerId || '').trim().toLowerCase();
    let changed = false;
    const updated = all.map((m) => {
      const sId = (m.senderId || '').trim().toLowerCase();
      if (sId === normViewerId) return m; // SENDER CAN NEVER MARK OWN MESSAGES READ

      const isRecipient = (m.recipientId || '').trim().toLowerCase() === normViewerId || Boolean(viewerUid && m.recipientUid && m.recipientUid === viewerUid && sId !== normViewerId);
      if (isRecipient && m.status !== 'seen') {
        changed = true;
        if (this.isLiveFirebase() && db) {
          updateDoc(doc(db, 'chat_messages', m.id), { status: 'seen' }).catch(() => {});
        }
        return { ...m, status: 'seen' as const };
      }
      return m;
    });
    if (changed) {
      saveLocal(KEYS.CHAT_MESSAGES, updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hikmah_chat_updated', {
          detail: { viewerId, action: 'seen_all' }
        }));
      }
    }
  },

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'seen'): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const updated = all.map((m) => (m.id === messageId ? { ...m, status } : m));
    saveLocal(KEYS.CHAT_MESSAGES, updated);
    if (this.isLiveFirebase() && db) {
      updateDoc(doc(db, 'chat_messages', messageId), { status }).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hikmah_chat_updated', {
        detail: { messageId, status, action: 'status' }
      }));
    }
  },

  async clearChatSession(sessionId: string): Promise<void> {
    const all = loadLocal<ChatMessage[]>(KEYS.CHAT_MESSAGES, []);
    const toDelete = all.filter((m) => m.sessionId === sessionId);
    const remaining = all.filter((m) => m.sessionId !== sessionId);
    saveLocal(KEYS.CHAT_MESSAGES, remaining);

    const activeDb = db;
    if (this.isLiveFirebase() && activeDb) {
      toDelete.forEach((m) => {
        deleteDoc(doc(activeDb, 'chat_messages', m.id)).catch(() => {});
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hikmah_chat_updated', {
        detail: { sessionId, action: 'cleared' }
      }));
    }
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
    let list = loadLocal<LibraryFacility[]>(KEYS.FACILITIES, INITIAL_FACILITIES);
    if (this.isLiveFirebase() && db) {
      try {
        const snap = await getDocs(collection(db, 'facilities'));
        if (snap && !snap.empty) {
          list = snap.docs.map((d) => d.data() as LibraryFacility);
          saveLocal(KEYS.FACILITIES, list);
        }
      } catch (err) {
        console.warn('Firestore getFacilities note:', err);
      }
    }
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
    if (this.isLiveFirebase() && db) {
      setDoc(doc(db, 'facilities', newFacility.id), newFacility).catch(console.warn);
    }
    return newFacility;
  },

  async updateFacility(id: string, updates: Partial<LibraryFacility>, _adminName: string): Promise<LibraryFacility | null> {
    const list = await this.getFacilities();
    const idx = list.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    saveLocal(KEYS.FACILITIES, list);
    if (this.isLiveFirebase() && db) {
      updateDoc(doc(db, 'facilities', id), updates).catch(console.warn);
    }
    return list[idx];
  },

  async deleteFacility(id: string, _adminName: string): Promise<boolean> {
    const list = await this.getFacilities();
    const filtered = list.filter((f) => f.id !== id);
    saveLocal(KEYS.FACILITIES, filtered);
    if (this.isLiveFirebase() && db) {
      deleteDoc(doc(db, 'facilities', id)).catch(console.warn);
    }
    return true;
  },

  // ---------------- DYNAMIC LIBRARY RULES & CODE OF CONDUCT ----------------
  async getRules(): Promise<LibraryRule[]> {
    let list = loadLocal<LibraryRule[]>(KEYS.RULES, INITIAL_RULES);
    if (this.isLiveFirebase() && db) {
      try {
        const snap = await getDocs(collection(db, 'rules'));
        if (snap && !snap.empty) {
          list = snap.docs.map((d) => d.data() as LibraryRule);
          saveLocal(KEYS.RULES, list);
        }
      } catch (err) {
        console.warn('Firestore getRules note:', err);
      }
    }
    return list;
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
    if (this.isLiveFirebase() && db) {
      setDoc(doc(db, 'rules', newRule.id), newRule).catch(console.warn);
    }
    return newRule;
  },

  async updateRule(id: string, updates: Partial<LibraryRule>, _adminName: string): Promise<LibraryRule | null> {
    const list = await this.getRules();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    saveLocal(KEYS.RULES, list);
    if (this.isLiveFirebase() && db) {
      updateDoc(doc(db, 'rules', id), updates).catch(console.warn);
    }
    return list[idx];
  },

  async deleteRule(id: string, _adminName: string): Promise<boolean> {
    const list = await this.getRules();
    const filtered = list.filter((r) => r.id !== id);
    saveLocal(KEYS.RULES, filtered);
    if (this.isLiveFirebase() && db) {
      deleteDoc(doc(db, 'rules', id)).catch(console.warn);
    }
    return true;
  },

  // ---------------- DYNAMIC PHOTO CAROUSEL & CAMPUS GALLERY (MAX 8 PHOTOS) ----------------
  async getCarouselPhotos(): Promise<CarouselPhoto[]> {
    let list = loadLocal<CarouselPhoto[]>(KEYS.CAROUSEL_PHOTOS, INITIAL_CAROUSEL_PHOTOS);
    if (this.isLiveFirebase() && db) {
      try {
        const snap = await getDocs(collection(db, 'carousel_photos'));
        if (snap && !snap.empty) {
          list = snap.docs.map((d) => d.data() as CarouselPhoto);
          saveLocal(KEYS.CAROUSEL_PHOTOS, list);
        }
      } catch (err) {
        console.warn('Firestore getCarouselPhotos note:', err);
      }
    }
    return list;
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
    if (this.isLiveFirebase() && db) {
      setDoc(doc(db, 'carousel_photos', newPhoto.id), newPhoto).catch(console.warn);
    }
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
    if (this.isLiveFirebase() && db) {
      setDoc(doc(db, 'carousel_photos', id), list[idx]).catch(console.warn);
    }
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
    if (this.isLiveFirebase() && db) {
      deleteDoc(doc(db, 'carousel_photos', id)).catch(console.warn);
    }
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
