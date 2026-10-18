import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';
import { WarningMeter } from '../components/WarningMeter';
import { deriveSessionKey, encryptMessage, decryptMessage } from '../utils/crypto';
import type {
  WarningRecord,
  ChatMessage,
  MemberProfile,
} from '../types';
import {
  AlertTriangle,
  ShieldCheck,
  LogOut,
  Send,
  Lock,
  CreditCard,
  CheckCircle2,
  Clock,
  RefreshCw,
  Camera,
  Trash2,
  Target,
  Sparkles,
  Check,
  CheckCheck,
  MessageSquare,
  ArrowLeft,
  X,
} from 'lucide-react';

interface MemberPortalProps {
  onNavigate?: (view: string) => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({ onNavigate: _onNavigate }) => {
  const { currentUser, currentMemberProfile: authMemberProfile, logout, refreshProfile, adminPhone, adminEmail } = useAuth();
  const displayPhone = adminPhone.startsWith('+') ? adminPhone : `+91 ${adminPhone}`;

  // Member live profile state (synced with DataService)
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(authMemberProfile);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member Datasets
  const [myWarnings, setMyWarnings] = useState<WarningRecord[]>([]);
  const [availablePeers, setAvailablePeers] = useState<MemberProfile[]>(() =>
    DataService.getLocalMembersSync().filter((m) => m.id !== currentUser?.memberId && m.membershipStatus === 'Active')
  );

  // E2E Encrypted Chat State (Dedicated direct encrypted channel with Administration)
  const adminPeer: MemberProfile = {
    id: 'admin-chief-001',
    uid: 'admin-chief-001',
    fullName: 'Chief Librarian & Administration',
    email: adminEmail || 'admin@hikmahlibrary.com',
    phoneNumber: displayPhone,
    registrationDate: '2025-01-01',
    joiningDate: '2025-01-01',
    membershipStatus: 'Active',
    batch: '24/7 Administration',
    studyTarget: 'Library Administration & Operations',
    warningCount: 0,
    feeDueDate: '2099-12-31',
    feeStatus: 'Paid',
    monthlyFee: 0,
  };

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatPeer, setActiveChatPeer] = useState<MemberProfile>(adminPeer);
  const [chatMessages, setChatMessages] = useState<Array<ChatMessage & { decryptedText?: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const loadMemberData = async () => {
    if (!currentUser?.memberId) return;
    setIsRefreshing(true);
    try {
      const fresh = await DataService.getMemberById(currentUser.memberId);
      if (!fresh) {
        alert('Your library membership account has been permanently terminated by administration.');
        logout();
        _onNavigate?.('home');
        return;
      }
      setMemberProfile(fresh);
      const warns = await DataService.getWarnings(currentUser.memberId);
      setMyWarnings(warns);

      const allMembers = await DataService.getMembers();
      setAvailablePeers(
        allMembers.filter((m) => m.id !== currentUser.memberId && m.membershipStatus === 'Active')
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMemberData();

    const handleMemberDeleted = (e: any) => {
      const deletedId = e.detail?.memberId;
      if (deletedId === currentUser?.memberId) {
        alert('Your library membership account has been permanently terminated by administration.');
        logout();
        _onNavigate?.('home');
      } else {
        loadMemberData();
      }
    };

    window.addEventListener('hikmah_member_deleted', handleMemberDeleted);
    window.addEventListener('storage', loadMemberData);
    const interval = setInterval(loadMemberData, 3000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hikmah_member_deleted', handleMemberDeleted);
      window.removeEventListener('storage', loadMemberData);
    };
  }, [currentUser]);

  // Keep local member profile updated when auth profile updates
  useEffect(() => {
    if (authMemberProfile) {
      setMemberProfile(authMemberProfile);
    }
  }, [authMemberProfile]);

  // Initialize E2E Chat Session with Administration
  const initChatSession = async (peer: MemberProfile) => {
    if (!currentUser?.memberId) return;
    setActiveChatPeer(peer);

    try {
      // 1. Derive mutual client-side AES-GCM 256-bit key
      const key = await deriveSessionKey(currentUser.memberId, peer.id);
      setSessionKey(key);

      // 2. Fetch session messages (auto-purging messages older than 12 hours)
      const sessionId = [currentUser.memberId, peer.id].sort().join('--');
      await DataService.markMessagesSeen(sessionId, currentUser.memberId);
      const messages = await DataService.getChatMessages(sessionId);

      // 3. Decrypt messages client-side
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          const text = await decryptMessage(msg.ciphertext, msg.iv, key);
          return { ...msg, decryptedText: text };
        })
      );

      setChatMessages(decrypted);
    } catch (err) {
      console.error('Failed to establish E2E encrypted session', err);
    }
  };

  useEffect(() => {
    if (currentUser?.memberId) {
      initChatSession(adminPeer);
    }
  }, [currentUser?.memberId]);

  // Scroll to bottom when new messages arrive or chat opens
  useEffect(() => {
    if (isChatOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isChatOpen, chatMessages.length]);

  // Send E2E Encrypted Message with WhatsApp status progression (sent -> delivered -> seen)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChatPeer || !sessionKey || !currentUser?.memberId) return;

    setIsEncrypting(true);
    try {
      const plaintext = chatInput.trim();
      const sessionId = [currentUser.memberId, activeChatPeer.id].sort().join('--');

      // Client-side AES-GCM encryption
      const { ciphertext, iv } = await encryptMessage(plaintext, sessionKey);

      // Transport ciphertext to storage with status 'sent' and 12-hour expiration
      const sentMsg = await DataService.sendChatMessage({
        sessionId,
        senderId: currentUser.memberId,
        senderName: currentUser.name,
        recipientId: activeChatPeer.id,
        ciphertext,
        iv,
        status: 'sent',
      });

      setChatMessages((prev) => [...prev, { ...sentMsg, decryptedText: plaintext, status: 'sent' }]);
      setChatInput('');

      // WhatsApp status progression simulation: 'sent' -> 'delivered' after 700ms -> 'seen' after 2000ms
      setTimeout(async () => {
        await DataService.updateMessageStatus(sentMsg.id, 'delivered');
        setChatMessages((prev) =>
          prev.map((m) => (m.id === sentMsg.id ? { ...m, status: 'delivered' } : m))
        );
      }, 700);

      setTimeout(async () => {
        await DataService.updateMessageStatus(sentMsg.id, 'seen');
        setChatMessages((prev) =>
          prev.map((m) => (m.id === sentMsg.id ? { ...m, status: 'seen' } : m))
        );
      }, 2000);
    } catch (err) {
      console.error('Failed to encrypt and send message', err);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Student Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.memberId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo size exceeds 2 MB. Please select a smaller photo.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        await DataService.updateMemberAvatar(currentUser.memberId!, base64Data);
        await refreshProfile();
        await loadMemberData();
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading student photo:', err);
      setIsUploadingPhoto(false);
    }
  };

  // Student Photo Removal Handler (revert to initials)
  const handleRemovePhoto = async () => {
    if (!currentUser?.memberId) return;
    if (window.confirm('Remove profile photo and display your name initials instead?')) {
      setIsUploadingPhoto(true);
      try {
        await DataService.updateMemberAvatar(currentUser.memberId, '');
        await refreshProfile();
        await loadMemberData();
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  // Helper for dynamic initials from student's name
  const getInitials = (name?: string): string => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const profile = memberProfile || authMemberProfile;


  // Fee calculation
  const isFeeOverdue = profile?.feeStatus === 'Overdue';
  const isFeeDueSoon = profile?.feeStatus === 'Due';
  const isFeePaid = profile?.feeStatus === 'Paid';

  const todayStr = new Date().toISOString().split('T')[0];
  const dueDateStr = profile?.feeDueDate || todayStr;
  const daysRemaining = Math.round((new Date(dueDateStr).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24));

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', padding: '40px 0 80px 0' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        
        {/* =========================================================================
            HEADER & STUDENT IDENTITY BAR (NAME, PHOTO/INITIALS, ALLOTTED DESK, GOAL)
            ========================================================================= */}
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            borderRadius: 'var(--radius-xl)',
            marginBottom: '28px',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 12, 20, 0.98) 100%)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* Left: Avatar with Update Photo + Name & Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
              
              {/* Photo or Initials Avatar */}
              <div style={{ position: 'relative' }}>
                {profile?.avatarUrl ? (
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '3px solid var(--accent-gold)',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                      background: '#0B0F19',
                    }}
                  >
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div
                    id="student-initials-avatar"
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-gold) 0%, #D97706 100%)',
                      color: '#080C14',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '2rem',
                      letterSpacing: '0.04em',
                      border: '3px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)',
                    }}
                  >
                    {getInitials(profile?.fullName)}
                  </div>
                )}

                {/* Quick Camera Icon Button on Avatar */}
                <button
                  id="student-avatar-camera-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload / Change Student Photo"
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--accent-gold)',
                    color: '#080C14',
                    border: '2px solid #0B0F19',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  <Camera size={14} />
                </button>
              </div>

              {/* Student Name & Controls */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <h1 style={{ color: '#FFFFFF', fontSize: '1.9rem', margin: 0, fontWeight: '800' }}>
                    {profile?.fullName}
                  </h1>
                  <span className="badge badge-present" style={{ fontSize: '0.8rem' }}>
                    {profile?.membershipStatus} Member
                  </span>

                  {/* Fee status indicator badge */}
                  {isFeeOverdue && (
                    <span className="badge badge-absent" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <AlertTriangle size={12} /> Fee Overdue
                    </span>
                  )}
                  {isFeeDueSoon && (
                    <span className="badge badge-late" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={12} /> Fee Due in {daysRemaining}d
                    </span>
                  )}
                  {isFeePaid && (
                    <span className="badge badge-present" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <CheckCircle2 size={12} /> Fee Cleared
                    </span>
                  )}
                </div>

                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
                  Email: <strong style={{ color: 'var(--accent-gold)' }}>{profile?.email}</strong> • Phone: <strong style={{ color: '#F1F5F9' }}>{profile?.phoneNumber}</strong>
                </div>

                {/* Photo Upload / Remove Buttons next to name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                  <input
                    ref={fileInputRef}
                    id="student-photo-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    id="member-upload-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    style={{
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      color: 'var(--accent-gold)',
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={13} /> {profile?.avatarUrl ? 'Change Photo' : 'Upload Student Photo'}
                  </button>

                  {profile?.avatarUrl && (
                    <button
                      id="member-remove-photo-btn"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#F87171',
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                      title="Remove photo and use name initials"
                    >
                      <Trash2 size={12} /> Reset to Initials
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions (Refresh & Logout) */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={async () => {
                  await refreshProfile();
                  await loadMemberData();
                }}
                className="glass-panel"
                style={{
                  padding: '9px 16px',
                  fontSize: '0.88rem',
                  color: 'var(--accent-gold)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: 'var(--radius-md)',
                }}
                title="Refresh records from database"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button
                id="member-logout-btn"
                className="btn-danger"
                onClick={logout}
                style={{ padding: '9px 18px', fontSize: '0.88rem' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          {/* Dedicated Sub-bar: Admin-Allotted Desk & Librarian-Set Study Goal (Zero Shifts) */}
          <div
            style={{
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Allotted Desk / Cabin (Admin Controlled Only) */}
            <div
              id="student-allotted-desk-box"
              style={{
                background: 'rgba(245, 158, 11, 0.07)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                  flexShrink: 0,
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-gold)', fontWeight: '700' }}>
                  Allotted Desk / Cabin (Admin Only)
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>
                  {profile?.seatNumber || 'Standard Focus Bay #01'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                  🔒 Dedicated seat assigned strictly by library administration.
                </div>
              </div>
            </div>

            {/* Study Goal / Target Exam (Librarian Controlled Only) */}
            <div
              id="student-study-goal-box"
              style={{
                background: 'rgba(56, 189, 248, 0.07)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38BDF8',
                  flexShrink: 0,
                }}
              >
                <Target size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38BDF8', fontWeight: '700' }}>
                  Study Goal / Exam Target (Librarian Updated)
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#FFFFFF', marginTop: '2px' }}>
                  {profile?.studyTarget || 'Competitive Examination Target'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                  🎯 Recorded in official student registry by librarian.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PROMINENT OVERDUE / DUE FEE REMINDER ALERT
            ========================================================================= */}
        {isFeeOverdue && (
          <div
            id="member-fee-overdue-alert"
            style={{
              marginBottom: '28px',
              padding: '24px 28px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.6)',
              boxShadow: '0 12px 30px rgba(239, 68, 68, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.3)',
                    color: '#F87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#FCA5A5', margin: 0, fontWeight: '800' }}>
                    ACTION REQUIRED: MONTHLY MEMBERSHIP FEE IS OVERDUE
                  </h3>
                  <div style={{ fontSize: '0.92rem', color: '#FEE2E2', marginTop: '4px' }}>
                    Your library renewal fee of <strong style={{ color: 'var(--accent-gold)' }}>₹{profile?.monthlyFee || 1200}</strong> was due on <strong style={{ color: '#FFFFFF' }}>{profile?.feeDueDate}</strong> ({Math.abs(daysRemaining)} days overdue).
                  </div>
                </div>
              </div>

              <button
                className="btn-gold"
                onClick={() => scrollToSection('section-fees')}
                style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              >
                <CreditCard size={16} /> View Payment Instructions
              </button>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '12px 18px', borderRadius: 'var(--radius-md)', fontSize: '0.86rem', color: '#CBD5E1' }}>
              🔔 <strong>Daily Reminder System:</strong> Daily reminders are sent to your account until your monthly renewal is marked as paid by the owner. Please visit the reception or pay via UPI to clear dues.
            </div>
          </div>
        )}

        {isFeeDueSoon && (
          <div
            style={{
              marginBottom: '28px',
              padding: '18px 24px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.18) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={24} color="var(--accent-gold)" />
              <div>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '1rem' }}>Upcoming Membership Fee Due:</strong>
                <span style={{ color: '#E2E8F0', fontSize: '0.9rem', marginLeft: '6px' }}>
                  Your cycle fee of ₹{profile?.monthlyFee || 1200} is due on <strong>{profile?.feeDueDate}</strong> (in {daysRemaining} days).
                </span>
              </div>
            </div>
            <button
              className="btn-outline-gold"
              onClick={() => scrollToSection('section-fees')}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              Fee Info
            </button>
          </div>
        )}

        {isFeePaid && (
          <div
            style={{
              marginBottom: '28px',
              padding: '16px 22px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={20} color="#34D399" />
              <div style={{ fontSize: '0.9rem', color: '#D1FAE5' }}>
                <strong>Membership Active &amp; Up to Date:</strong> Last fee cleared on <strong style={{ color: '#FFFFFF' }}>{profile?.lastPaidDate || 'Recent'}</strong>. Next renewal due: <strong style={{ color: 'var(--accent-gold)' }}>{profile?.feeDueDate}</strong>.
              </div>
            </div>
            <span className="badge badge-present" style={{ fontSize: '0.75rem' }}>
              ✓ Dues Cleared
            </span>
          </div>
        )}

        {/* Quick-Jump Anchors Bar (Effortless smooth scroll without hectic tab toggling) */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '32px',
            padding: '10px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
            <Sparkles size={14} color="var(--accent-gold)" /> Quick Jump:
          </span>
          <button
            onClick={() => scrollToSection('section-fees')}
            className="btn-outline"
            style={{ padding: '6px 14px', fontSize: '0.82rem', borderColor: isFeeOverdue ? 'rgba(239,68,68,0.5)' : undefined }}
          >
            💳 Fees &amp; Renewals {isFeeOverdue && '⚠️'}
          </button>

          <button
            onClick={() => scrollToSection('section-warnings')}
            className="btn-outline"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            ⚠️ Warnings ({profile?.warningCount || 0}/10)
          </button>
          <button
            onClick={() => scrollToSection('section-chat')}
            className="btn-outline"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
          >
            🔒 E2EE Admin Chat
          </button>
        </div>

        {/* =========================================================================
            SECTION 1: FEES & RENEWALS MODULE
            ========================================================================= */}
        <div id="section-fees" style={{ marginBottom: '45px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <CreditCard size={22} color="var(--accent-gold)" />
            <h2 style={{ fontSize: '1.45rem', margin: 0, color: '#FFFFFF', fontWeight: '800' }}>
              Membership Fees &amp; Renewal Status
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '20px',
            }}
          >
            {/* Fee Status Card */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CURRENT STATUS
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: isFeeOverdue ? '#EF4444' : isFeeDueSoon ? '#F59E0B' : '#10B981',
                  marginTop: '6px',
                }}
              >
                {profile?.feeStatus}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '6px' }}>
                Renewal Amount: <strong style={{ color: 'var(--accent-gold)' }}>₹{profile?.monthlyFee || 1200} / month</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Joining Date: {profile?.joiningDate || '2025-01-15'}
              </div>
            </div>

            {/* Due Date & Advance Schedule */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                CYCLE DUE DATE
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#FFFFFF', marginTop: '6px' }}>
                {profile?.feeDueDate}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '6px' }}>
                {isFeeOverdue ? (
                  <span style={{ color: '#F87171' }}>⚠️ Expired {Math.abs(daysRemaining)} days ago</span>
                ) : isFeeDueSoon ? (
                  <span style={{ color: '#FBBF24' }}>Due in {daysRemaining} days</span>
                ) : (
                  <span style={{ color: '#34D399' }}>Next renewal in {daysRemaining} days</span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Last Paid: {profile?.lastPaidDate || 'On file'}
              </div>
            </div>

            {/* Payment Modes */}
            <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                PAYMENT METHODS
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#F8FAFC', marginTop: '8px' }}>
                Front Reception / UPI Transfer
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '6px', lineHeight: '1.5' }}>
                UPI ID: <strong style={{ color: 'var(--accent-gold)' }}>hikmah.study@upi</strong>
                <br />
                Helpline: <strong>{displayPhone}</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '8px' }}>
                Once paid, administrator marks account cleared in real time.
              </div>
            </div>
          </div>

          {/* Overdue Reminder Messages Dispatch Log */}
          {profile?.feeReminders && profile.feeReminders.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} color="#F59E0B" /> Official Fee Reminder Messages Dispatched to Your Account:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {profile.feeReminders.map((rem) => (
                  <div
                    key={rem.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ color: '#FCA5A5', fontSize: '0.88rem', fontWeight: '600' }}>
                        {rem.message}
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.76rem', marginTop: '3px' }}>
                        Sent by: {rem.sentBy || 'Administration'} • Due date threshold: {profile.feeDueDate}
                      </div>
                    </div>
                    <span className="badge badge-absent" style={{ fontSize: '0.74rem' }}>
                      {rem.daysOverdue ? `${rem.daysOverdue}d Overdue` : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* =========================================================================
            SECTION 3: DISCIPLINARY CODE & 10-WARNING METER
            ========================================================================= */}
        <div id="section-warnings" style={{ marginBottom: '45px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <AlertTriangle size={22} color={profile?.warningCount ? '#EF4444' : '#10B981'} />
            <h2 style={{ fontSize: '1.45rem', margin: 0, color: '#FFFFFF', fontWeight: '800' }}>
              Disciplinary Record ({profile?.warningCount || 0} / 10 Warnings)
            </h2>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: 'var(--radius-lg)', marginBottom: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <WarningMeter count={profile?.warningCount || 0} size="lg" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '0.85rem', color: '#CBD5E1', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
              <div>
                Threshold: <strong>10 Warnings</strong> triggers automatic Registration Review &amp; Seat Revocation.
              </div>
              <div style={{ color: profile?.warningCount ? '#F87171' : '#34D399', fontWeight: '700' }}>
                {profile?.warningCount ? `⚠️ ${10 - profile.warningCount} strikes remaining` : '✓ Spotless Discipline Record'}
              </div>
            </div>
          </div>

          {/* Active Warnings Log */}
          {myWarnings.length > 0 ? (
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#FFFFFF', marginBottom: '14px' }}>
                Recorded Disciplinary Notices
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myWarnings.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ color: '#FCA5A5', fontWeight: '700', fontSize: '0.9rem' }}>
                        Warning #{w.warningNumber}: {w.reason}
                      </div>
                      <div style={{ color: '#94A3B8', fontSize: '0.78rem', marginTop: '4px' }}>
                        Issued on: {new Date(w.issuedAt).toLocaleDateString()} • Authorized by: {w.issuedBy}
                      </div>
                    </div>
                    <span className="badge badge-absent" style={{ fontSize: '0.75rem' }}>
                      {w.severity} Severity
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: '#10B981', fontSize: '0.9rem' }}>
              ✓ You have zero disciplinary warnings on record. Keep up the high standard of focus!
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: PRIVATE E2E ENCRYPTED CHAT CHANNEL (WITH SEPARATE PAGE/VIEW)
            ========================================================================= */}
        <div id="section-chat" style={{ marginBottom: '40px' }}>
          {!isChatOpen ? (
            /* Closed State: Trigger Button Card */
            <div
              className="glass-panel"
              style={{
                padding: '32px',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ maxWidth: '640px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(217, 119, 6, 0.15)',
                      border: '1px solid rgba(217, 119, 6, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MessageSquare size={22} color="var(--accent-gold)" />
                  </div>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#FFFFFF', fontWeight: '800' }}>
                    Private Encrypted Student Chat
                  </h2>
                </div>
                <p style={{ margin: '0 0 14px 0', color: '#94A3B8', fontSize: '0.92rem', lineHeight: '1.6' }}>
                  Confidential, end-to-end encrypted direct channel with the Chief Librarian, Administration, or fellow enrolled batch members.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                    <ShieldCheck size={14} /> 256-Bit SubtleCrypto AES-GCM
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 10px', borderRadius: '12px' }}>
                    <Clock size={14} /> Auto-cleans after 12 Hours
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-start-private-chat"
                onClick={() => {
                  setIsChatOpen(true);
                  initChatSession(activeChatPeer || adminPeer);
                }}
                className="btn-gold"
                style={{
                  padding: '14px 30px',
                  fontSize: '1rem',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 8px 25px rgba(217, 119, 6, 0.4)',
                  cursor: 'pointer',
                  borderRadius: '12px',
                }}
              >
                <MessageSquare size={20} /> Start Private Chat
              </button>
            </div>
          ) : (
            /* Open State: Dedicated Separate Chat View */
            <div id="dedicated-chat-page" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
              {/* Back / Navigation Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <button
                  type="button"
                  id="btn-close-private-chat"
                  onClick={() => setIsChatOpen(false)}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeft size={16} /> Return to Portal Dashboard
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#F59E0B',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '4px 12px',
                      borderRadius: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                    }}
                  >
                    <Clock size={13} /> Messages automatically delete after 12 hours to avoid database &amp; device overloading
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: '#10B981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '14px',
                    }}
                  >
                    <ShieldCheck size={13} /> 256-Bit E2E Encrypted
                  </span>
                </div>
              </div>

              {/* Main Chat Box Container */}
              <div
                className="glass-panel"
                style={{
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
                  background: '#0B111E',
                }}
              >
                {/* Chat Top Header */}
                <div
                  style={{
                    padding: '16px 22px',
                    background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'var(--gold-gradient)',
                        color: '#080C14',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        fontSize: '1rem',
                        boxShadow: '0 0 14px rgba(217, 119, 6, 0.4)',
                      }}
                    >
                      {activeChatPeer.id === adminPeer.id ? 'CL' : activeChatPeer.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeChatPeer.fullName}
                        {activeChatPeer.id === adminPeer.id && (
                          <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.25)', color: 'var(--accent-gold)', fontWeight: '700' }}>
                            ADMINISTRATION
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                        Encrypted Direct Line • Active
                      </div>
                    </div>
                  </div>

                  {/* Peer Switcher & Close button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Select Peer:</span>
                    <select
                      value={activeChatPeer.id}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (selectedId === adminPeer.id) {
                          initChatSession(adminPeer);
                        } else {
                          const peer = availablePeers.find((p) => p.id === selectedId);
                          if (peer) initChatSession(peer);
                        }
                      }}
                      className="form-select"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        width: '240px',
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderColor: 'rgba(217, 119, 6, 0.3)',
                      }}
                    >
                      <option value={adminPeer.id}>Chief Librarian &amp; Administration</option>
                      {availablePeers.map((peer) => (
                        <option key={peer.id} value={peer.id}>
                          {peer.fullName} ({peer.phoneNumber || peer.id})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsChatOpen(false)}
                      title="Close chat window"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94A3B8',
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div
                  style={{
                    height: '380px',
                    overflowY: 'auto',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    background: 'radial-gradient(ellipse at top, rgba(15, 23, 42, 0.85), #060911 80%)',
                  }}
                >
                  <div style={{ textAlign: 'center', margin: '0 auto 10px auto' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 16px',
                        borderRadius: '20px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        fontSize: '0.74rem',
                        color: '#FBBF24',
                      }}
                    >
                      <Clock size={13} color="#F59E0B" /> All messages in this channel are securely purged after 12 hours.
                    </span>
                  </div>

                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => {
                      const isMine = msg.senderId === currentUser?.memberId;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isMine ? 'flex-end' : 'flex-start',
                            maxWidth: '78%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMine ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <div
                            style={{
                              padding: '11px 16px',
                              borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isMine
                                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                : 'rgba(30, 41, 59, 0.88)',
                              color: isMine ? '#080C14' : '#F8FAFC',
                              fontWeight: isMine ? '600' : '400',
                              fontSize: '0.92rem',
                              wordBreak: 'break-word',
                              boxShadow: isMine ? '0 4px 16px rgba(217, 119, 6, 0.3)' : '0 4px 14px rgba(0, 0, 0, 0.3)',
                              border: isMine ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            {msg.decryptedText || '🔒 [Encrypted Message]'}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem',
                              color: '#94A3B8',
                              marginTop: '4px',
                              padding: '0 4px',
                            }}
                          >
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '2px' }}>
                                {msg.status === 'seen' ? (
                                  <span title="Seen"><CheckCheck size={14} style={{ color: '#38BDF8' }} /></span>
                                ) : msg.status === 'delivered' ? (
                                  <span title="Delivered"><CheckCheck size={14} style={{ color: '#94A3B8' }} /></span>
                                ) : (
                                  <span title="Sent"><Check size={13} style={{ color: '#94A3B8' }} /></span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', margin: 'auto', color: '#64748B', fontSize: '0.88rem' }}>
                      🔒 No messages yet. Send a private note to {activeChatPeer.fullName}.
                    </div>
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                {/* Chat Send Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '14px 22px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Type an encrypted message to ${activeChatPeer.fullName}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ flex: 1, padding: '11px 16px', background: 'rgba(0, 0, 0, 0.4)' }}
                  />
                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={isEncrypting || !chatInput.trim()}
                    style={{ padding: '11px 24px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <Send size={16} /> Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
