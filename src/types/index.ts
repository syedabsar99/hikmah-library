export type UserRole = 'admin' | 'member';

export type MembershipStatus = 'Active' | 'Suspended' | 'Cancelled' | 'Review';

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export type FeeStatus = 'Paid' | 'Due' | 'Overdue';

export interface FeeReminder {
  id: string;
  date: string;
  sentAt?: string;
  message: string;
  daysOverdue?: number;
  sentBy?: string;
}

export interface LibraryFacility {
  id: string;
  name: string;
  description: string;
  iconName: string; // e.g. 'AirConditioner', 'Zap', 'Wifi', 'Clock', 'Coffee', 'ShieldCheck'
  isActive: boolean;
  order: number;
}

export interface LibraryRule {
  id: string;
  ruleNumber: number;
  title: string;
  description: string;
  category: 'Silence' | 'Cleanliness' | 'Dining' | 'Attendance' | 'Fees' | 'General';
  severity: 'Info' | 'Strict' | 'Critical';
  consequence?: string;
  isActive: boolean;
}

export interface MemberProfile {
  id: string; // E.g. "HIK-2025-001"
  uid: string; // Auth UID
  fullName: string;
  email: string;
  phoneNumber: string;
  registrationDate: string; // YYYY-MM-DD
  joiningDate: string; // YYYY-MM-DD
  membershipStatus: MembershipStatus;
  batch: string; // e.g. "24/7 Full Access (No Shifts)"
  studyTarget: string; // e.g. "UPSC Civil Services", "CA/CS", "NEET"
  seatNumber?: string;
  warningCount: number; // 0 to 10
  
  // Membership Fee & Renewal Tracking (Admin Controlled)
  feeDueDate: string; // YYYY-MM-DD (next payment / expiry date)
  feeStatus: FeeStatus; // 'Paid' | 'Due' | 'Overdue'
  monthlyFee: number; // e.g. 1200
  lastPaidDate?: string; // YYYY-MM-DD
  feeReminders?: FeeReminder[];

  notes?: string;
  avatarUrl?: string;
  passcode?: string; // Member password / passcode
  hasRegistered?: boolean; // True once student completes first-time portal registration
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  lastLoginAt?: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  markedBy: string; // Admin Name / ID
  modifiedBy?: string;
  modifiedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarningRecord {
  id: string;
  memberId: string;
  memberName: string;
  warningNumber: number; // 1 to 10
  reason: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  issuedBy: string; // Admin identifier
  issuedAt: string; // ISO string
  isCorrected?: boolean;
  correctionReason?: string;
  correctedBy?: string;
  correctedAt?: string;
}

export type AnnouncementCategory = 
  | 'General News'
  | 'Seat Vacancy'
  | 'Fee Notice'
  | 'Misconduct Notice'
  | 'Library Rules';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string;
  publishedBy: string;
  // Specific for Fee Notices
  dueDate?: string;
  amount?: number;
  paymentInstructions?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'AUTH' | 'MEMBER' | 'ATTENDANCE' | 'WARNING' | 'ANNOUNCEMENT' | 'SYSTEM';
  performedBy: string;
  details: string;
  timestamp: string;
  targetId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  ciphertext: string; // AES-GCM encrypted payload base64
  iv: string; // AES-GCM IV base64
  timestamp: string;
  expiresAt: string;
  status?: 'sent' | 'delivered' | 'seen';
}

export interface ChatSession {
  id: string;
  participantIds: [string, string];
  participantNames: Record<string, string>;
  createdAt: string;
  lastActivity: string;
  isTemporaryActive: boolean;
}

export interface CurrentUser {
  uid: string;
  role: UserRole;
  memberId?: string; // If member
  name: string;
  email: string;
  phoneNumber?: string;
  isSuspended?: boolean;
  isCancelled?: boolean;
}

export interface CarouselPhoto {
  id: string;
  src: string; // File path, base64 Data URL, or web link
  caption: string;
  title: string;
  order: number;
  uploadedAt?: string;
  isCustom?: boolean;
}

