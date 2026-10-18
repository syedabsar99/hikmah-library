import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DataService, calculateFeeStatus } from '../services/dataService';
import { WarningMeter } from '../components/WarningMeter';
import { PasswordResetModal } from '../components/PasswordResetModal';
import { getAssetUrl } from '../utils/assets';
import type {
  MemberProfile,
  WarningRecord,
  Announcement,
  LibraryFacility,
  LibraryRule,
  CarouselPhoto,
} from '../types';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Megaphone,
  CreditCard,
  UserX,
  Settings,
  LogOut,
  Plus,
  Search,
  Download,
  Edit2,
  ShieldAlert,
  Shield,
  KeyRound,
  RefreshCw,
  Database,
  Bell,
  AlertCircle,
  Award,
  Flame,
  Trash2,
  Mail,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  Camera,
  Copy,
  Check,
} from 'lucide-react';

// Process uploaded image file into web-optimized Base64 Data URL (stored permanently in website)
const processImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1400;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

interface AdminDashboardProps {
  onNavigate?: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { logout, adminPhone, adminEmail, updateAdminCredentials } = useAuth();
  const cleanAdminPhone = (adminPhone || '9622497806').replace(/[^0-9]/g, '');
  const displayAdminPhone = adminPhone.startsWith('+') ? adminPhone : `+91 ${adminPhone}`;
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'members'
    | 'fees'
    | 'warnings'
    | 'announcements'
    | 'facilities'
    | 'rules'
    | 'carousel'
    | 'registration'
    | 'settings'
  >('dashboard');

  const [showAdminResetModal, setShowAdminResetModal] = useState(false);

  // Application Data States (Initialized immediately from local storage for 0ms instant display)
  const [members, setMembers] = useState<MemberProfile[]>(() => DataService.getLocalMembersSync());
  const [warnings, setWarnings] = useState<WarningRecord[]>(() => DataService.getLocalWarningsSync());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => DataService.getLocalAnnouncementsSync());
  const [facilities, setFacilities] = useState<LibraryFacility[]>(() => DataService.getLocalFacilitiesSync());
  const [rules, setRules] = useState<LibraryRule[]>(() => DataService.getLocalRulesSync());
  const [carouselPhotos, setCarouselPhotos] = useState<CarouselPhoto[]>(() => DataService.getLocalCarouselPhotosSync());

  // Carousel Photos Management State (Max 8 Strictly Enforced)
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showReplacePhotoModal, setShowReplacePhotoModal] = useState(false);
  const [targetPhotoForReplace, setTargetPhotoForReplace] = useState<CarouselPhoto | null>(null);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [targetPhotoForDelete, setTargetPhotoForDelete] = useState<CarouselPhoto | null>(null);

  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoBase64, setNewPhotoBase64] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);

  const [replacePhotoTitle, setReplacePhotoTitle] = useState('');
  const [replacePhotoCaption, setReplacePhotoCaption] = useState('');
  const [replacePhotoBase64, setReplacePhotoBase64] = useState('');

  // Facility Management Modal State
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<LibraryFacility | null>(null);
  const [facilityFormData, setFacilityFormData] = useState({
    name: '',
    description: '',
    iconName: 'Sparkles',
    isActive: true,
  });

  // Rule Management Modal State
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<LibraryRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState({
    ruleNumber: '1',
    title: '',
    description: '',
    category: 'Silence' as LibraryRule['category'],
    severity: 'Strict' as LibraryRule['severity'],
    consequence: '',
    isActive: true,
  });

  // Filters & Search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState<'All' | 'Overdue' | 'Due' | 'Paid'>('All');

  // Modal States
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    batch: '24/7 Dedicated Access (No Shifts)',
    studyTarget: '',
    seatNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlyFee: '1200',
  });

  const [markingFeePaidId, setMarkingFeePaidId] = useState<string | null>(null);

  // Edit Member Modal (Admin assigns Allotted Desk, Study Goal & Fee Expiry Date)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [targetMemberForEdit, setTargetMemberForEdit] = useState<MemberProfile | null>(null);
  const [editMemberForm, setEditMemberForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    seatNumber: '',
    studyTarget: '',
    joiningDate: '',
    feeDueDate: '',
    monthlyFee: '1200',
    membershipStatus: 'Active' as MemberProfile['membershipStatus'],
  });

  // Issue Warning Modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [targetMemberForWarning, setTargetMemberForWarning] = useState<MemberProfile | null>(null);
  const [warningReason, setWarningReason] = useState('');
  const [warningSeverity, setWarningSeverity] = useState<WarningRecord['severity']>('Minor');

  // Correct Warning Modal
  const [showCorrectWarningModal, setShowCorrectWarningModal] = useState(false);
  const [targetWarningForCorrection, setTargetWarningForCorrection] = useState<WarningRecord | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');

  // Confirm Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [targetMemberForCancel, setTargetMemberForCancel] = useState<MemberProfile | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Delete Member Confirmation Modal
  const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
  const [targetMemberForDelete, setTargetMemberForDelete] = useState<MemberProfile | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);

  const handleConfirmDeleteMember = async () => {
    if (!targetMemberForDelete) return;
    setDeletingMember(true);
    try {
      await DataService.deleteMember(targetMemberForDelete.id, 'Chief Librarian');
      setShowDeleteMemberModal(false);
      setTargetMemberForDelete(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete member:', err);
    } finally {
      setDeletingMember(false);
    }
  };

  // Announcement Create Modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newAnnouncementData, setNewAnnouncementData] = useState({
    title: '',
    content: '',
    category: 'General News' as Announcement['category'],
    isPinned: false,
    dueDate: '',
    amount: '',
    paymentInstructions: '',
  });

  // Fee Setting Modal
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [targetMemberForFee, setTargetMemberForFee] = useState<MemberProfile | null>(null);
  const [editFeeDueDate, setEditFeeDueDate] = useState('');
  const [editFeeJoiningDate, setEditFeeJoiningDate] = useState('');
  const [editMonthlyFee, setEditMonthlyFee] = useState('1200');

  // Announcement Delete Confirmation Modal State
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // WhatsApp Batch Dispatcher state (Shows list on website first with Select All option)
  const [waBatchQueue, setWaBatchQueue] = useState<{
    member: MemberProfile;
    waUrl: string;
    phone: string;
    sent: boolean;
    selected: boolean;
  }[] | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [copyBroadcastSuccess, setCopyBroadcastSuccess] = useState(false);

  // Administrative Authority Handover State (with Email Verification Code & Link)
  const [handoverStep, setHandoverStep] = useState<1 | 2 | 3 | 4>(1);
  const [exAdminEmail, setExAdminEmail] = useState('');
  const [exAdminPassword, setExAdminPassword] = useState('');
  const [showExAdminPassword, setShowExAdminPassword] = useState(false);
  const [handoverVerifyError, setHandoverVerifyError] = useState<string | null>(null);

  const [newAdminFullName, setNewAdminFullName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
  const [showNewAdminConfirmPassword, setShowNewAdminConfirmPassword] = useState(false);
  const [handoverRegisterError, setHandoverRegisterError] = useState<string | null>(null);
  const [handoverLoading, setHandoverLoading] = useState(false);

  // Email verification state for handover
  const [handoverEnteredCode, setHandoverEnteredCode] = useState('');
  const [handoverPendingData, setHandoverPendingData] = useState<{
    name: string;
    email: string;
    phone: string;
    password: string;
    code: string;
    token: string;
    verifyUrl: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('hikmah_pending_handover_v2');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [handoverSuccessInfo, setHandoverSuccessInfo] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);

  // Fetch all live records
  const loadData = async () => {
    try {
      const [m, , w, ann, , facs, rls, cPhotos] = await Promise.all([
        DataService.getMembers(),
        DataService.getAttendance(),
        DataService.getWarnings(),
        DataService.getAnnouncements(),
        DataService.getAuditLogs(),
        DataService.getFacilities(),
        DataService.getRules(),
        DataService.getCarouselPhotos(),
      ]);
      setMembers(m);
      setWarnings(w);
      setAnnouncements(ann);
      setFacilities(facs);
      setRules(rls);
      setCarouselPhotos(cPhotos);
    } catch (err) {
      console.error('Failed to load administrative dataset', err);
    }
  };

  useEffect(() => {
    loadData();

    // Check if user arrived via Email Handover Verification Link
    try {
      const search = new URLSearchParams(window.location.search);
      const urlToken = search.get('handoverToken');
      const urlCode = search.get('handoverCode');
      if (urlToken && urlCode) {
        const saved = localStorage.getItem('hikmah_pending_handover_v2');
        if (saved) {
          const pending = JSON.parse(saved);
          if (pending.token === urlToken || pending.code === urlCode) {
            executeFinalHandover(pending);
          }
        }
      }
    } catch {}
  }, []);

  // ---------------- FACILITY & RULE ACTION HANDLERS ----------------
  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityFormData.name.trim() || !facilityFormData.description.trim()) {
      alert('Facility name and description are required.');
      return;
    }

    if (editingFacility) {
      await DataService.updateFacility(
        editingFacility.id,
        {
          name: facilityFormData.name.trim(),
          description: facilityFormData.description.trim(),
          iconName: facilityFormData.iconName,
          isActive: facilityFormData.isActive,
        },
        'Chief Librarian'
      );
    } else {
      await DataService.addFacility(
        {
          name: facilityFormData.name.trim(),
          description: facilityFormData.description.trim(),
          iconName: facilityFormData.iconName,
          isActive: facilityFormData.isActive,
          order: facilities.length + 1,
        },
        'Chief Librarian'
      );
    }
    setShowFacilityModal(false);
    setEditingFacility(null);
    await loadData();
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete facility "${name}"?`)) {
      await DataService.deleteFacility(id, 'Chief Librarian');
      await loadData();
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.title.trim() || !ruleFormData.description.trim()) {
      alert('Rule title and description are required.');
      return;
    }

    if (editingRule) {
      await DataService.updateRule(
        editingRule.id,
        {
          ruleNumber: Number(ruleFormData.ruleNumber) || 1,
          title: ruleFormData.title.trim(),
          description: ruleFormData.description.trim(),
          category: ruleFormData.category,
          severity: ruleFormData.severity,
          consequence: ruleFormData.consequence.trim(),
          isActive: ruleFormData.isActive,
        },
        'Chief Librarian'
      );
    } else {
      await DataService.addRule(
        {
          ruleNumber: Number(ruleFormData.ruleNumber) || rules.length + 1,
          title: ruleFormData.title.trim(),
          description: ruleFormData.description.trim(),
          category: ruleFormData.category,
          severity: ruleFormData.severity,
          consequence: ruleFormData.consequence.trim(),
          isActive: ruleFormData.isActive,
        },
        'Chief Librarian'
      );
    }
    setShowRuleModal(false);
    setEditingRule(null);
    await loadData();
  };

  const handleDeleteRule = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete rule "${title}"?`)) {
      await DataService.deleteRule(id, 'Chief Librarian');
      await loadData();
    }
  };

  // ---------------- CAROUSEL PHOTO HANDLERS (MAX 8 PHOTOS) ----------------
  const handleUploadPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>, isReplace: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUploadError(null);
      const dataUrl = await processImageFile(file);
      if (isReplace) {
        setReplacePhotoBase64(dataUrl);
      } else {
        setNewPhotoBase64(dataUrl);
      }
    } catch {
      setPhotoUploadError('Failed to process image file. Please choose another image.');
    }
  };

  const handleSaveNewPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoUploadError(null);
    if (!newPhotoBase64) {
      setPhotoUploadError('Please select a photo file from your device.');
      return;
    }
    if (!newPhotoTitle.trim() || !newPhotoCaption.trim()) {
      setPhotoUploadError('Photo title and caption are required.');
      return;
    }
    if (carouselPhotos.length >= 8) {
      setPhotoUploadError('Strict limit of 8 photos reached. You must delete an existing photo first to free up a slot.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await DataService.addCarouselPhoto(
        {
          src: newPhotoBase64,
          title: newPhotoTitle.trim(),
          caption: newPhotoCaption.trim(),
        },
        'Chief Librarian'
      );
      if (!res.success) {
        setPhotoUploadError(res.error || 'Failed to add photo.');
        return;
      }
      setShowAddPhotoModal(false);
      setNewPhotoBase64('');
      setNewPhotoTitle('');
      setNewPhotoCaption('');
      await loadData();
    } catch (err: any) {
      setPhotoUploadError(err?.message || 'Error uploading photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenReplacePhoto = (photo: CarouselPhoto) => {
    setTargetPhotoForReplace(photo);
    setReplacePhotoTitle(photo.title);
    setReplacePhotoCaption(photo.caption);
    setReplacePhotoBase64('');
    setPhotoUploadError(null);
    setShowReplacePhotoModal(true);
  };

  const handleSaveReplacePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhotoForReplace) return;
    setPhotoUploadError(null);
    if (!replacePhotoTitle.trim() || !replacePhotoCaption.trim()) {
      setPhotoUploadError('Photo title and caption are required.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const updates: Partial<CarouselPhoto> = {
        title: replacePhotoTitle.trim(),
        caption: replacePhotoCaption.trim(),
      };
      if (replacePhotoBase64) {
        updates.src = replacePhotoBase64;
      }
      const res = await DataService.replaceCarouselPhoto(
        targetPhotoForReplace.id,
        updates,
        'Chief Librarian'
      );
      if (!res.success) {
        setPhotoUploadError(res.error || 'Failed to replace photo.');
        return;
      }
      setShowReplacePhotoModal(false);
      setTargetPhotoForReplace(null);
      setReplacePhotoBase64('');
      await loadData();
    } catch (err: any) {
      setPhotoUploadError(err?.message || 'Error updating photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenDeletePhoto = (photo: CarouselPhoto) => {
    setTargetPhotoForDelete(photo);
    setShowDeletePhotoModal(true);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!targetPhotoForDelete) return;
    try {
      const res = await DataService.deleteCarouselPhoto(targetPhotoForDelete.id, 'Chief Librarian');
      if (!res.success) {
        alert(res.error || 'Failed to delete photo.');
        return;
      }
      setShowDeletePhotoModal(false);
      setTargetPhotoForDelete(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Error deleting photo.');
    }
  };

  const handleResetDefaultCarouselPhotos = async () => {
    if (
      window.confirm(
        'Restore Original 8 Campus Gallery Photos?\n\nThis will reset the carousel to the original authentic campus photos of Hikmah Library. Any custom uploaded photos will be replaced.'
      )
    ) {
      await DataService.resetToDefaultCarouselPhotos('Chief Librarian');
      await loadData();
    }
  };

  // ---------------- ACTION HANDLERS ----------------
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = newMemberData.fullName.trim();
    const email = newMemberData.email.trim().toLowerCase();
    const phone = newMemberData.phoneNumber.trim();

    if (!fullName || !phone) {
      alert('Full name and mobile number are mandatory.');
      return;
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      alert('A valid student email address is mandatory. The student needs this email to log in to the student portal and receive password reset links.');
      return;
    }

    const joiningDate = newMemberData.joiningDate || new Date().toISOString().split('T')[0];

    await DataService.addMember(
      {
        uid: '',
        fullName,
        email,
        phoneNumber: phone,
        batch: newMemberData.batch,
        studyTarget: newMemberData.studyTarget.trim() || 'General Competitive Studies',
        seatNumber: newMemberData.seatNumber.trim() || 'Assigned Study Cabin',
        membershipStatus: 'Active',
        registrationDate: new Date().toISOString().split('T')[0],
        joiningDate,
        warningCount: 0,
        monthlyFee: Number(newMemberData.monthlyFee) || 1200,
        feeDueDate: '',
        feeStatus: 'Paid',
      },
      'Chief Librarian'
    );

    setShowAddMemberModal(false);
    setNewMemberData({
      fullName: '',
      email: '',
      phoneNumber: '',
      batch: '24/7 Dedicated Access (No Shifts)',
      studyTarget: 'UPSC Civil Services Examination',
      seatNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlyFee: '1200',
    });
    await loadData();
    alert(`Member ${fullName} registered successfully! They can log in to the student portal using email: ${email}`);
  };

  const handleOpenEditMember = (m: MemberProfile) => {
    setTargetMemberForEdit(m);
    setEditMemberForm({
      fullName: m.fullName,
      email: m.email || '',
      phoneNumber: m.phoneNumber,
      seatNumber: m.seatNumber || '',
      studyTarget: m.studyTarget || '',
      joiningDate: m.joiningDate || m.registrationDate || new Date().toISOString().split('T')[0],
      feeDueDate: m.feeDueDate || new Date().toISOString().split('T')[0],
      monthlyFee: String(m.monthlyFee || 1200),
      membershipStatus: m.membershipStatus,
    });
    setShowEditMemberModal(true);
  };

  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForEdit) return;

    const email = editMemberForm.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('A valid student email address is required.');
      return;
    }

    const feeDueDate = editMemberForm.feeDueDate || targetMemberForEdit.feeDueDate || new Date().toISOString().split('T')[0];
    const { status: calculatedFeeStatus } = calculateFeeStatus(feeDueDate);

    await DataService.updateMember(
      targetMemberForEdit.id,
      {
        fullName: editMemberForm.fullName.trim(),
        email,
        phoneNumber: editMemberForm.phoneNumber.trim(),
        seatNumber: editMemberForm.seatNumber.trim() || 'Assigned Focus Desk',
        studyTarget: editMemberForm.studyTarget.trim() || 'Competitive Exam Target',
        joiningDate: editMemberForm.joiningDate || targetMemberForEdit.joiningDate,
        feeDueDate,
        feeStatus: calculatedFeeStatus,
        monthlyFee: Number(editMemberForm.monthlyFee) || 1200,
        membershipStatus: editMemberForm.membershipStatus,
      },
      'Chief Librarian'
    );
    await loadData();
    setShowEditMemberModal(false);
    alert('Student profile, allotted desk, fee schedule, and expiry date updated successfully!');
  };

  const handleIssueWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForWarning || !warningReason.trim()) {
      alert('Please specify a warning reason.');
      return;
    }

    const result = await DataService.issueWarning(
      targetMemberForWarning.id,
      warningReason.trim(),
      warningSeverity,
      'Chief Librarian'
    );

    setShowWarningModal(false);
    setWarningReason('');
    await loadData();

    if (result.flaggedForReview) {
      alert(
        `CRITICAL NOTICE: Member ${targetMemberForWarning.fullName} has reached 10/10 warnings! The account has been flagged for Registration Review and cancellation.`
      );
      setActiveTab('registration');
    } else {
      alert(`Warning #${result.newCount}/10 recorded for ${targetMemberForWarning.fullName}.`);
    }
  };

  const handleCorrectWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetWarningForCorrection || !correctionReason.trim()) {
      alert('Please specify an authorized justification for voiding this warning.');
      return;
    }

    await DataService.correctWarning(
      targetWarningForCorrection.id,
      correctionReason.trim(),
      'Chief Librarian'
    );

    setShowCorrectWarningModal(false);
    setCorrectionReason('');
    await loadData();
    alert('Warning voided and deducted from member record through audited correction.');
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForCancel || !cancellationReason.trim()) {
      alert('Please specify the administrative review findings for cancellation.');
      return;
    }

    await DataService.confirmCancellationAt10Warnings(
      targetMemberForCancel.id,
      cancellationReason.trim(),
      'Chief Librarian'
    );

    setShowCancelModal(false);
    setCancellationReason('');
    await loadData();
    alert(`Registration CANCELLED for ${targetMemberForCancel.fullName}. Member Portal access has been revoked.`);
  };

  // ---------------- MEMBERSHIP FEE HANDLERS ----------------
  const handleMarkFeePaid = async (member: MemberProfile) => {
    if (markingFeePaidId === member.id) return; // Guard against accidental double clicks
    setMarkingFeePaidId(member.id);
    try {
      await DataService.markFeePaid(member.id, 'Chief Librarian');
      await loadData();
      alert(`✓ Fee marked as PAID for ${member.fullName}! Next renewal date has been advanced by 1 month.`);
    } finally {
      setTimeout(() => setMarkingFeePaidId(null), 1200);
    }
  };

  const handleSendFeeReminder = async (member: MemberProfile) => {
    if (member.feeStatus === 'Paid') {
      alert(`Fees for ${member.fullName} are already marked as Paid and active. No reminder is needed.`);
      return;
    }

    // 1. Record reminder in member's portal
    await DataService.sendFeeReminder(member.id, undefined, 'Chief Librarian');
    await loadData();

    // 2. Open WhatsApp reminder to the student's registered phone
    const rawPhone = member.phoneNumber || '';
    const digits = rawPhone.replace(/[^0-9]/g, '');
    const cleanPhone = digits.startsWith('91') && digits.length === 12
      ? digits
      : digits.length === 10
      ? `91${digits}`
      : digits;

    const amount = member.monthlyFee || 1200;
    const dueDate = member.feeDueDate || 'Due soon';
    const waText = `Assalamu Alaikum ${member.fullName},\n\nThis is a polite reminder from *Hikmah Library & Study Lounge* regarding your monthly seat maintenance fee of *₹${amount}* (Due Date: ${dueDate}).\n\nKindly clear your dues at the library desk or via UPI to keep your assigned desk reservation active.\n\nThank you,\nHikmah Library Administration\nHelpline: ${displayAdminPhone}`;

    if (cleanPhone.length >= 10) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank');
      alert(`🔔 Reminder recorded in student portal and opened in WhatsApp for ${member.fullName} (${rawPhone})!`);
    } else {
      alert(`🔔 Reminder recorded in student portal for ${member.fullName}!`);
    }
  };

  const generateBroadcastText = (recipients: MemberProfile[]) => {
    const listLines = recipients
      .map((m) => `• *${m.fullName}* — ₹${m.monthlyFee || 1200} (Due: ${m.feeDueDate || 'Due now'})`)
      .join('\n');

    return `*HIKMAH LIBRARY & STUDY LOUNGE*\n*Monthly Fee Renewal & Expiry Notice*\n\nAssalamu Alaikum Respected Members,\n\nThis is an official fee reminder regarding your monthly study desk maintenance at Hikmah Library. Kindly clear your dues to keep your allocated seat reservation active.\n\n*Pending Dues Summary:*\n${listLines}\n\n*Payment Modes:*\n• Library Front Desk\n• Direct UPI Transfer\n\nThank you,\nHikmah Library Administration\nHelpline: ${displayAdminPhone}`;
  };

  const handleSendBatchFeeReminders = () => {
    // 1. Filter overdue/due students only - students who already paid are strictly excluded
    const overdueMembers = members.filter(
      (m) => m.feeStatus === 'Overdue' || m.feeStatus === 'Due'
    );

    if (overdueMembers.length === 0) {
      alert('✓ All student memberships have active, settled fees! No overdue reminders need to be dispatched.');
      return;
    }

    // 2. Prepare direct WhatsApp links for each student using their registered phone number
    const queue = overdueMembers.map((m) => {
      const rawPhone = m.phoneNumber || '';
      const digits = rawPhone.replace(/[^0-9]/g, '');
      const cleanPhone =
        digits.startsWith('91') && digits.length === 12
          ? digits
          : digits.length === 10
          ? `91${digits}`
          : digits;
      const amount = m.monthlyFee || 1200;
      const dueDate = m.feeDueDate || 'Due soon';
      const waText = `Assalamu Alaikum ${m.fullName},\n\nThis is a polite reminder from *Hikmah Library & Study Lounge* regarding your monthly seat maintenance fee of *₹${amount}* (Due Date: ${dueDate}).\n\nKindly clear your dues at the library desk or via UPI to keep your assigned desk reservation active.\n\nThank you,\nHikmah Library Administration\nHelpline: ${displayAdminPhone}`;
      const waUrl = cleanPhone.length >= 10 ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}` : '';
      return {
        member: m,
        waUrl,
        phone: rawPhone,
        sent: false,
        selected: true,
      };
    });

    // 3. DO NOT open WhatsApp here. Show the student review list immediately on the website!
    setDispatchComplete(false);
    setIsDispatching(false);
    setWaBatchQueue(queue);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setWaBatchQueue((prev) =>
      prev ? prev.map((q) => ({ ...q, selected: checked })) : null
    );
  };

  const handleToggleSelectOne = (id: string) => {
    setWaBatchQueue((prev) =>
      prev
        ? prev.map((q) => (q.member.id === id ? { ...q, selected: !q.selected } : q))
        : null
    );
  };

  const handleExecuteSendAllReminders = async () => {
    if (!waBatchQueue) return;
    const selected = waBatchQueue.filter((q) => q.selected);
    if (selected.length === 0) {
      alert('Please select at least one overdue student from the list.');
      return;
    }

    setIsDispatching(true);

    // 1. Record fee reminder in each student's portal in the database
    for (const item of selected) {
      await DataService.sendFeeReminder(item.member.id, undefined, 'Chief Librarian');
    }
    await loadData();

    // 2. Open WhatsApp chat for each selected student
    const validWithPhone = selected.filter((q) => q.waUrl);
    validWithPhone.forEach((item, index) => {
      setTimeout(() => {
        window.open(item.waUrl, '_blank');
        setWaBatchQueue((prev) =>
          prev ? prev.map((q) => (q.member.id === item.member.id ? { ...q, sent: true } : q)) : null
        );
      }, index * 350);
    });

    setIsDispatching(false);
    setDispatchComplete(true);
  };

  const handleCopyBroadcastText = () => {
    if (!waBatchQueue) return;
    const selected = waBatchQueue.filter((q) => q.selected);
    const targetList = selected.length > 0 ? selected : waBatchQueue;
    const broadcastMsg = generateBroadcastText(targetList.map((q) => q.member));
    navigator.clipboard.writeText(broadcastMsg);
    setCopyBroadcastSuccess(true);
    setTimeout(() => setCopyBroadcastSuccess(false), 2500);
  };

  const handleSaveFeeSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberForFee) return;

    await DataService.updateMemberFeeSettings(
      targetMemberForFee.id,
      editFeeDueDate,
      Number(editMonthlyFee) || 1200,
      'Chief Librarian',
      editFeeJoiningDate
    );

    setShowFeeModal(false);
    await loadData();
    alert(`Fee schedule and date of joining updated for ${targetMemberForFee.fullName}.`);
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementData.title.trim() || !newAnnouncementData.content.trim()) {
      alert('Title and content are required.');
      return;
    }

    await DataService.addAnnouncement(
      {
        title: newAnnouncementData.title.trim(),
        content: newAnnouncementData.content.trim(),
        category: newAnnouncementData.category,
        isPinned: newAnnouncementData.isPinned,
        publishedBy: 'Chief Librarian',
        ...(newAnnouncementData.category === 'Fee Notice'
          ? {
              dueDate: newAnnouncementData.dueDate,
              amount: Number(newAnnouncementData.amount) || undefined,
              paymentInstructions: newAnnouncementData.paymentInstructions,
            }
          : {}),
      },
      'Chief Librarian'
    );

    setShowAnnouncementModal(false);
    setNewAnnouncementData({
      title: '',
      content: '',
      category: 'General News',
      isPinned: false,
      dueDate: '',
      amount: '',
      paymentInstructions: '',
    });
    await loadData();
    alert('Announcement published to library website & member portals!');
  };

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    const targetId = announcementToDelete.id;
    // Optimistic UI update
    setAnnouncements((prev) => prev.filter((a) => a.id !== targetId));
    setAnnouncementToDelete(null);
    try {
      await DataService.deleteAnnouncement(targetId, 'Chief Librarian');
      const updated = await DataService.getAnnouncements();
      setAnnouncements(updated);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  // ---------------- ADMIN AUTHORITY HANDOVER HANDLERS ----------------
  const handleVerifyExAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setHandoverVerifyError(null);

    const emailTrim = exAdminEmail.trim().toLowerCase();
    const passTrim = exAdminPassword;

    let storedCreds: any = null;
    try {
      const item = localStorage.getItem('hikmah_admin_creds_v2');
      if (item) storedCreds = JSON.parse(item);
    } catch {}

    const storedEmail = (storedCreds?.email || adminEmail || 'syedabsar99@gmail.com').toLowerCase();
    const storedPass = storedCreds?.password;

    if (!storedPass) {
      setHandoverVerifyError('No active administrator password found. Please ensure administrative setup is complete.');
      return;
    }

    const isEmailValid =
      emailTrim === storedEmail ||
      emailTrim === (adminEmail || '').toLowerCase() ||
      emailTrim === 'syedabsar99@gmail.com' ||
      emailTrim === 'admin@hikmahlibrary.com';

    if (!isEmailValid) {
      setHandoverVerifyError('Ex-administrator email does not match active administration records.');
      return;
    }

    if (passTrim !== storedPass) {
      setHandoverVerifyError('Ex-administrator password is incorrect. Verification failed.');
      return;
    }

    setHandoverStep(2);
  };

  const executeFinalHandover = async (pending: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    setHandoverLoading(true);
    try {
      const newCreds = {
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
      };

      // 1. Update AuthContext & localStorage
      updateAdminCredentials(newCreds);
      localStorage.setItem('hikmah_admin_creds_v2', JSON.stringify(newCreds));
      localStorage.setItem('hikmah_saved_admin_email', pending.email);
      localStorage.removeItem('hikmah_pending_handover_v2');

      // 2. Broadcast to all open tabs and windows
      window.dispatchEvent(new CustomEvent('hikmah_admin_creds_updated', { detail: newCreds }));

      // 3. Sync to API backend if running
      await fetch('/api/auth/admin-creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pending.email,
          passcode: pending.password,
          phone: pending.phone,
          name: pending.name,
        }),
      }).catch(() => {});

      // 4. Audit Log
      await DataService.addAuditLog(
        'ADMIN_HANDOVER',
        'AUTH',
        `Administrative authority successfully transferred to ${pending.name} (${pending.email}, ${pending.phone}) via email link/code verification. Website contact info updated globally.`,
        pending.name
      );

      setHandoverSuccessInfo({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
      });
      setHandoverStep(4);
    } catch {
      setHandoverRegisterError('Failed to transfer administrative credentials. Please try again.');
    } finally {
      setHandoverLoading(false);
    }
  };

  const handleRegisterNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandoverRegisterError(null);

    const name = newAdminFullName.trim();
    const email = newAdminEmail.trim().toLowerCase();
    const phone = newAdminPhone.trim();
    const pass = newAdminPassword;
    const confirmPass = newAdminConfirmPassword;

    if (!name || !email || !phone || !pass || !confirmPass) {
      setHandoverRegisterError('All fields are required to register the new administrator.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setHandoverRegisterError('Please enter a valid email address for the new administrator.');
      return;
    }

    if (pass.length < 6) {
      setHandoverRegisterError('New admin password must be at least 6 characters long.');
      return;
    }

    if (pass !== confirmPass) {
      setHandoverRegisterError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setHandoverLoading(true);
    try {
      // Generate 6-digit confirmation code and unique token
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const randomBytes = new Uint8Array(16);
      crypto.getRandomValues(randomBytes);
      const token = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Build confirmation URL that works directly on whichever host (localhost, GitHub Pages, Vercel)
      const verifyUrl = `${window.location.origin}${window.location.pathname}?view=admin-dashboard&handoverToken=${token}&handoverCode=${code}`;

      const pending = {
        name,
        email,
        phone,
        password: pass,
        code,
        token,
        verifyUrl,
        createdAt: Date.now(),
      };

      localStorage.setItem('hikmah_pending_handover_v2', JSON.stringify(pending));
      setHandoverPendingData(pending);

      // Dispatch genuine verification email to the new administrator's email via FormSubmit AJAX
      try {
        await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            _subject: `Hikmah Library & Study Lounge — Administrator Authority Handover Verification`,
            _template: 'box',
            _captcha: 'false',
            Library: 'Hikmah Library & Study Lounge',
            Action: 'Administrative Succession & Authority Handover',
            New_Administrator_Name: name,
            New_Administrator_Email: email,
            New_Administrator_Phone: phone,
            Verification_Code: code,
            One_Click_Verification_Link: verifyUrl,
            Notice:
              'Please enter this 6-digit code or click the confirmation link to finalize the handover. Once verified, the entire website will immediately display your phone number and email across all student portals and contact channels.',
          }),
        });
      } catch (emailErr) {
        console.warn('Direct FormSubmit email dispatch notice:', emailErr);
      }

      setHandoverStep(3);
    } catch {
      setHandoverRegisterError('Failed to dispatch handover verification email. Please try again.');
    } finally {
      setHandoverLoading(false);
    }
  };

  const handleVerifyHandoverCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setHandoverRegisterError(null);

    const entered = handoverEnteredCode.trim();
    if (!entered) {
      setHandoverRegisterError('Please enter the 6-digit verification code.');
      return;
    }

    const pending =
      handoverPendingData ||
      (() => {
        try {
          const saved = localStorage.getItem('hikmah_pending_handover_v2');
          return saved ? JSON.parse(saved) : null;
        } catch {
          return null;
        }
      })();

    if (!pending) {
      setHandoverRegisterError('No pending handover session found. Please re-enter the new admin details.');
      setHandoverStep(2);
      return;
    }

    if (entered !== pending.code) {
      setHandoverRegisterError('Invalid verification code. Please check your email inbox and enter the 6-digit code.');
      return;
    }

    await executeFinalHandover(pending);
  };


  // Export handlers
  const handleExportMembers = () => {
    const csv = DataService.exportMembersCSV(members);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hikmah_Library_Members_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // KPI Calculations
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.membershipStatus === 'Active').length;
  const suspendedMembers = members.filter((m) => m.membershipStatus === 'Suspended').length;
  const cancelledMembers = members.filter((m) => m.membershipStatus === 'Cancelled').length;
  const reviewMembers = members.filter((m) => m.membershipStatus === 'Review' || m.warningCount >= 10).length;

  // Fee KPIs
  const overdueMembers = members.filter((m) => m.feeStatus === 'Overdue');
  const dueSoonMembers = members.filter((m) => m.feeStatus === 'Due');
  const paidMembers = members.filter((m) => m.feeStatus === 'Paid');


  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.batch.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesStatus =
      memberStatusFilter === 'All' || m.membershipStatus === memberStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredFeeMembers = members.filter((m) => {
    if (feeFilter === 'All') return true;
    return m.feeStatus === feeFilter;
  });

  return (
    <div className="admin-layout-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-icon-box" style={{ width: '40px', height: '40px' }}>
              <Shield size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#FFFFFF' }}>Admin Console</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', letterSpacing: '0.04em' }}>
                Hikmah Library &amp; Lounge
              </div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard size={18} /> },
            { id: 'members', label: 'Member Directory', icon: <Users size={18} />, badge: totalMembers },
            { id: 'fees', label: 'Fee & Expiry Tracker', icon: <CreditCard size={18} />, badge: overdueMembers.length, badgeColor: '#EF4444' },
            { id: 'warnings', label: 'Warning System (X/10)', icon: <AlertTriangle size={18} />, badge: warnings.filter(w => !w.isCorrected).length },
            { id: 'announcements', label: 'News & Notices', icon: <Megaphone size={18} /> },
            { id: 'facilities', label: 'Facilities & Infra', icon: <Award size={18} />, badge: facilities.length },
            { id: 'rules', label: 'Rules & Conduct', icon: <Flame size={18} />, badge: rules.length },
            { id: 'carousel', label: 'Photo Carousel (Max 8)', icon: <Camera size={18} />, badge: `${carouselPhotos.length}/8`, badgeColor: carouselPhotos.length >= 8 ? '#EF4444' : 'rgba(245, 158, 11, 0.2)' },
            { id: 'registration', label: 'Registration Review', icon: <UserX size={18} />, badge: reviewMembers, badgeColor: '#EF4444' },
            { id: 'settings', label: 'System & Handover', icon: <Settings size={18} /> },
          ].map((item) => (
            <button
              id={`admin-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
                fontWeight: activeTab === item.id ? '700' : '500',
                color: activeTab === item.id ? '#FFFFFF' : 'var(--text-muted)',
                background: activeTab === item.id ? 'var(--bg-surface-2)' : 'transparent',
                border: activeTab === item.id ? '1px solid var(--border-medium)' : '1px solid transparent',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: activeTab === item.id ? 'var(--accent-gold)' : 'inherit' }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: item.badgeColor || 'rgba(245, 158, 11, 0.2)',
                    color: item.badgeColor ? '#FFFFFF' : 'var(--accent-gold)',
                    fontWeight: '800',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Database Status & Logout */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            <Database size={14} color={DataService.isLiveFirebase() ? '#10B981' : '#F59E0B'} />
            <span>{DataService.isLiveFirebase() ? 'Live Firebase Connected' : 'Local Persistent Storage'}</span>
          </div>
          <button
            onClick={logout}
            className="btn-danger"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
          >
            <LogOut size={16} /> End Session &amp; Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="admin-main-content">
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.9rem', color: '#FFFFFF' }}>
              {activeTab === 'dashboard' && 'Administrative Overview'}
              {activeTab === 'members' && 'Member Directory & Registration'}
              {activeTab === 'fees' && 'Membership Fee & Expiry Tracker'}
              {activeTab === 'warnings' && 'Disciplinary Warning Management (Out of 10)'}
              {activeTab === 'announcements' && 'Public News & Policy Announcements'}
              {activeTab === 'facilities' && 'Library Facilities & Basic Infrastructure'}
              {activeTab === 'rules' && 'Rules, Regulations & Code of Conduct'}
              {activeTab === 'carousel' && 'Photo Carousel & Visual Tour Manager (Strictly Max 8 Photos)'}
              {activeTab === 'registration' && 'Registration Review & Cancellation Queue'}
              {activeTab === 'settings' && 'System Configuration & Owner Handover'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Hikmah Library &amp; Study Lounge • Real-time Records Engine
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-outline" onClick={loadData} title="Refresh records">
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="btn-gold" onClick={() => setShowAddMemberModal(true)}>
              <Plus size={16} /> Register New Member
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div>
            {/* KPI Summary Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL REGISTERED</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#FFFFFF', marginTop: '4px' }}>{totalMembers}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--status-paid)', marginTop: '4px' }}>Active: {activeMembers} • Suspended: {suspendedMembers} • Cancelled: {cancelledMembers}</div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>FEES OVERDUE</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: overdueMembers.length > 0 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                  {overdueMembers.length} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>students</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                  {dueSoonMembers.length} due within 3 days
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>MEMBERSHIP FEE STATUS</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--status-paid)', marginTop: '4px' }}>
                  {paidMembers.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {totalMembers} paid</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Active Sanctuary Students: {activeMembers}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>DISCIPLINARY WATCHLIST</div>
                <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--accent-gold)', marginTop: '4px' }}>
                  {warnings.filter((w) => !w.isCorrected).length}
                </div>
                <div style={{ fontSize: '0.75rem', color: reviewMembers > 0 ? '#EF4444' : 'var(--text-muted)', marginTop: '4px' }}>
                  {reviewMembers} flagged for 10-warning review
                </div>
              </div>
            </div>

            {/* Overdue Fee Expiries Alert Section */}
            {overdueMembers.length > 0 && (
              <div className="fee-due-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <AlertCircle size={28} color="#F87171" />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: 0 }}>
                      Action Required: {overdueMembers.length} Student Membership(s) Expired!
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#FECACA', margin: '2px 0 0 0' }}>
                      Due dates have expired. You can mark them as Paid (advancing by 1 month) or dispatch daily reminder messages.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-gold"
                    onClick={() => setActiveTab('fees')}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    Open Fee &amp; Expiry Tracker
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleSendBatchFeeReminders}
                    style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  >
                    <Bell size={15} /> Send All Reminders
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
              {/* Overdue Students Quick Action Card */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                    <CreditCard color="var(--accent-gold)" /> Expiry &amp; Fee Follow-up
                  </h3>
                  <button className="btn-outline" onClick={() => setActiveTab('fees')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                    View All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {members.filter(m => m.feeStatus === 'Overdue' || m.feeStatus === 'Due').slice(0, 4).map((m) => {
                    const { daysDiff } = calculateFeeStatus(m.feeDueDate);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: m.feeStatus === 'Overdue' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          border: `1px solid ${m.feeStatus === 'Overdue' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#FFFFFF' }}>
                            {m.fullName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Fee: ₹{m.monthlyFee || 1200} • Due: {m.feeDueDate} ({m.feeStatus === 'Overdue' ? `${daysDiff}d overdue` : `due in ${daysDiff}d`})
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-success"
                            onClick={() => handleMarkFeePaid(m)}
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            title="Mark as Paid and advance to next month"
                          >
                            ✓ Paid
                          </button>
                          <button
                            className="btn-gold"
                            onClick={() => handleSendFeeReminder(m)}
                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                            title="Send Daily Reminder to member portal"
                          >
                            <Bell size={13} /> Remind
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {members.filter(m => m.feeStatus === 'Overdue' || m.feeStatus === 'Due').length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      ✓ All student memberships are up to date!
                    </div>
                  )}
                </div>
              </div>

              {/* High Warning Watchlist */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
                    <ShieldAlert color="#F59E0B" /> Disciplinary Watchlist (≥ 3 Warnings)
                  </h3>
                  <button className="btn-outline" onClick={() => setActiveTab('warnings')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                    View All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {members.filter((m) => m.warningCount >= 3).map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ flex: 1, marginRight: '16px' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#FFFFFF' }}>
                          {m.fullName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.batch}</div>
                        <div style={{ marginTop: '6px' }}>
                          <WarningMeter count={m.warningCount} size="sm" showLabel={false} />
                        </div>
                      </div>

                      <button
                        className="btn-danger"
                        onClick={() => {
                          setTargetMemberForWarning(m);
                          setShowWarningModal(true);
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        + Warning
                      </button>
                    </div>
                  ))}
                  {members.filter((m) => m.warningCount >= 3).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      ✓ Clean discipline record across all study cabins.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBER MANAGEMENT */}
        {activeTab === 'members' && (
          <div>
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '14px',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search student name, email, or desk..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    style={{ paddingLeft: '38px' }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94A3B8' }} />
                </div>

                <select
                  className="form-select"
                  value={memberStatusFilter}
                  onChange={(e) => setMemberStatusFilter(e.target.value)}
                  style={{ width: '160px' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Review">On Review (10 Warnings)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-outline" onClick={handleExportMembers}>
                  <Download size={16} /> Export CSV
                </button>
                <button className="btn-gold" onClick={() => setShowAddMemberModal(true)}>
                  <Plus size={16} /> Add Member
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="member-directory-desktop-table data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Allotted Desk &amp; Goal</th>
                    <th>Joining Date</th>
                    <th>Fee Expiry Date</th>
                    <th>Fee Status</th>
                    <th>Warnings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{m.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Mail size={12} /> {m.email}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{m.phoneNumber}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>
                          🔒 {m.seatNumber || 'Standard Focus Desk'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#93C5FD', marginTop: '2px' }}>
                          🎯 {m.studyTarget || 'Competitive Exam'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.84rem' }}>{m.joiningDate || m.registrationDate}</td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{m.feeDueDate}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹{m.monthlyFee || 1200} / mo</div>
                      </td>
                      <td>
                        <span className={`badge badge-${(m.feeStatus || 'Paid').toLowerCase()}`}>
                          {m.feeStatus || 'Paid'}
                        </span>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <WarningMeter count={m.warningCount} size="sm" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            id={`admin-edit-member-${m.id}`}
                            className="btn-outline"
                            onClick={() => handleOpenEditMember(m)}
                            style={{ padding: '5px 10px', fontSize: '0.75rem', color: 'var(--accent-gold)', borderColor: 'rgba(212,175,55,0.4)' }}
                            title="Edit Allotted Desk &amp; Study Goal"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn-success"
                            onClick={() => handleMarkFeePaid(m)}
                            disabled={markingFeePaidId === m.id}
                            style={{ padding: '5px 10px', fontSize: '0.75rem', opacity: markingFeePaidId === m.id ? 0.6 : 1 }}
                            title="Mark as Paid"
                          >
                            {markingFeePaidId === m.id ? 'Saving...' : '✓ Paid'}
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => {
                              setTargetMemberForWarning(m);
                              setShowWarningModal(true);
                            }}
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                            title="Issue Warning"
                          >
                            <AlertTriangle size={13} />
                          </button>
                          <button
                            id={`admin-delete-member-${m.id}`}
                            className="btn-danger"
                            onClick={() => {
                              setTargetMemberForDelete(m);
                              setShowDeleteMemberModal(true);
                            }}
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.75rem',
                              background: 'rgba(239, 68, 68, 0.15)',
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              color: '#EF4444',
                            }}
                            title="Delete Member (With Confirmation)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch-Friendly Student Directory Cards (No Horizontal Scroll) */}
            <div className="member-directory-mobile-cards">
              {filteredMembers.map((m) => (
                <div key={m.id} className="student-mobile-card">
                  {/* Top Bar: Name + Fee Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.08rem', color: '#FFFFFF', margin: 0, fontWeight: '700' }}>
                        {m.fullName}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                        <Mail size={12} /> {m.email}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                        <Phone size={12} />
                        <a href={`tel:${m.phoneNumber}`} style={{ color: '#E2E8F0', textDecoration: 'none' }}>
                          {m.phoneNumber}
                        </a>
                      </div>
                    </div>
                    <span className={`badge badge-${(m.feeStatus || 'Paid').toLowerCase()}`}>
                      {m.feeStatus || 'Paid'}
                    </span>
                  </div>

                  {/* Desk & Goal Highlights */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '12px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Allotted Desk</div>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: '700', marginTop: '1px' }}>
                        🔒 {m.seatNumber || 'Standard Focus Desk'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Target Goal</div>
                      <div style={{ color: '#93C5FD', fontWeight: '600', marginTop: '1px' }}>
                        🎯 {m.studyTarget || 'Competitive Exam'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Joining Date</div>
                      <div style={{ color: '#E2E8F0', marginTop: '1px' }}>
                        {m.joiningDate || m.registrationDate}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Fee Due Date</div>
                      <div style={{ color: '#FFFFFF', fontWeight: '700', marginTop: '1px' }}>
                        {m.feeDueDate} (₹{m.monthlyFee || 1200})
                      </div>
                    </div>
                  </div>

                  {/* Warning Meter */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Disciplinary Record
                      </span>
                      <span style={{ fontSize: '0.75rem', color: m.warningCount >= 3 ? '#EF4444' : '#10B981', fontWeight: '700' }}>
                        {m.warningCount}/10 Warnings
                      </span>
                    </div>
                    <WarningMeter count={m.warningCount} size="sm" showLabel={false} />
                  </div>

                  {/* Touch Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      className="btn-outline"
                      onClick={() => handleOpenEditMember(m)}
                      style={{ padding: '7px 10px', fontSize: '0.78rem', justifyContent: 'center', color: 'var(--accent-gold)', borderColor: 'rgba(212,175,55,0.4)' }}
                    >
                      <Edit2 size={13} /> Edit Desk
                    </button>
                    <button
                      className="btn-success"
                      onClick={() => handleMarkFeePaid(m)}
                      style={{ padding: '7px 10px', fontSize: '0.78rem', justifyContent: 'center' }}
                    >
                      ✓ Mark Paid
                    </button>
                    {(m.feeStatus === 'Overdue' || m.feeStatus === 'Due') && (
                      <button
                        className="btn-gold"
                        onClick={() => handleSendFeeReminder(m)}
                        style={{ padding: '7px 10px', fontSize: '0.78rem', justifyContent: 'center' }}
                      >
                        <Bell size={13} /> Remind (WA)
                      </button>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => {
                        setTargetMemberForDelete(m);
                        setShowDeleteMemberModal(true);
                      }}
                      style={{
                        padding: '7px 10px',
                        fontSize: '0.78rem',
                        justifyContent: 'center',
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: '#EF4444',
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No student records match your query.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FEE & EXPIRY TRACKER (DEDICATED MODULE) */}
        {activeTab === 'fees' && (
          <div>
            {/* Top Fee KPI Highlights */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '26px',
              }}
            >
              <div className="glass-panel" style={{ padding: '22px', border: overdueMembers.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', color: '#F87171', fontWeight: '700' }}>OVERDUE EXPIRIES</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#EF4444', marginTop: '4px' }}>
                  {overdueMembers.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#FCA5A5', marginTop: '4px' }}>Requires daily reminder / payment</div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: '700' }}>DUE WITHIN 3 DAYS</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#F59E0B', marginTop: '4px' }}>
                  {dueSoonMembers.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Approaching monthly cycle</div>
              </div>

              <div className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ fontSize: '0.8rem', color: '#34D399', fontWeight: '700' }}>PAID &amp; ACTIVE</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10B981', marginTop: '4px' }}>
                  {paidMembers.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>In good standing</div>
              </div>
            </div>

            {/* Quick Action & Filter Bar */}
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['All', 'Overdue', 'Due', 'Paid'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFeeFilter(filter)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      background: feeFilter === filter ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.05)',
                      color: feeFilter === filter ? '#0A0D14' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {filter === 'Overdue' ? `🚨 Overdue (${overdueMembers.length})` : filter}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  id="admin-batch-reminders-btn"
                  className="btn-gold"
                  onClick={handleSendBatchFeeReminders}
                  style={{ padding: '8px 18px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  title="Automatically dispatch daily reminders to all overdue students and launch their WhatsApp chats"
                >
                  <Bell size={16} /> Dispatch Daily Reminders to All Overdue ({overdueMembers.length})
                </button>
              </div>
            </div>

            {/* Comprehensive Students Fee & Expiry Table */}
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Joining Date</th>
                    <th>Fee Amount</th>
                    <th>Due / Expiry Date</th>
                    <th>Status &amp; Days Overdue</th>
                    <th>Daily Reminders Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeeMembers.map((m) => {
                    const { daysDiff } = calculateFeeStatus(m.feeDueDate);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{m.fullName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.batch}</div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{m.joiningDate || m.registrationDate}</td>
                        <td style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '0.95rem' }}>
                          ₹{m.monthlyFee || 1200}
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#FFFFFF' }}>{m.feeDueDate}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Same date next month</div>
                        </td>
                        <td>
                          <span className={`badge badge-${(m.feeStatus || 'Paid').toLowerCase()}`}>
                            {m.feeStatus === 'Overdue' && `🚨 ${daysDiff} days overdue`}
                            {m.feeStatus === 'Due' && `⚠️ Due in ${daysDiff} days`}
                            {(m.feeStatus === 'Paid' || !m.feeStatus) && `✓ Paid & Active`}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: (m.feeReminders?.length || 0) > 0 ? '#FBBF24' : 'var(--text-muted)' }}>
                            {m.feeReminders?.length || 0} reminder(s)
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              id={`fee-mark-paid-${m.id}`}
                              className="btn-success"
                              onClick={() => handleMarkFeePaid(m)}
                              disabled={markingFeePaidId === m.id}
                              style={{ padding: '6px 12px', fontSize: '0.78rem', opacity: markingFeePaidId === m.id ? 0.6 : 1 }}
                              title="Advance due date by 1 month upon payment"
                            >
                              {markingFeePaidId === m.id ? 'Saving...' : '✓ Mark as Paid'}
                            </button>

                            {(m.feeStatus === 'Overdue' || m.feeStatus === 'Due') ? (
                              <button
                                id={`fee-send-reminder-${m.id}`}
                                className="btn-gold"
                                onClick={() => handleSendFeeReminder(m)}
                                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                title="Send Daily Reminder message to member portal & WhatsApp"
                              >
                                <Bell size={14} /> Send Reminder
                              </button>
                            ) : (
                              <span
                                style={{
                                  color: '#10B981',
                                  fontSize: '0.78rem',
                                  fontWeight: '600',
                                  padding: '6px 10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                ✓ Fees Settled
                              </span>
                            )}

                            <button
                              id={`fee-edit-${m.id}`}
                              className="btn-outline"
                              onClick={() => {
                                setTargetMemberForFee(m);
                                setEditFeeDueDate(m.feeDueDate);
                                setEditFeeJoiningDate(m.joiningDate || m.registrationDate || '');
                                setEditMonthlyFee(String(m.monthlyFee || 1200));
                                setShowFeeModal(true);
                              }}
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              title="Custom Expiry Date or Fee Amount"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: WARNING MANAGEMENT */}
        {activeTab === 'warnings' && (
          <div>
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '6px', color: '#FFFFFF' }}>
                Disciplinary Warning Audit Registry (Max: 10/10)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6' }}>
                All disciplinary notices are recorded with issuing Administrator stamps and reasons. Reaching 10 warnings triggers an automatic registration review for seat cancellation.
              </p>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Member</th>
                    <th>Warning #</th>
                    <th>Violation Reason</th>
                    <th>Severity</th>
                    <th>Issued By</th>
                    <th>Status</th>
                    <th>Correction</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map((w) => (
                    <tr key={w.id} style={{ opacity: w.isCorrected ? 0.4 : 1 }}>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(w.issuedAt).toLocaleDateString()} {new Date(w.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{w.memberName}</div>
                      </td>
                      <td style={{ fontWeight: '800', color: '#EF4444' }}>#{w.warningNumber}/10</td>
                      <td style={{ maxWidth: '280px', fontSize: '0.85rem' }}>{w.reason}</td>
                      <td>
                        <span className={`badge ${w.severity === 'Minor' ? 'badge-late' : 'badge-absent'}`}>
                          {w.severity}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{w.issuedBy}</td>
                      <td>
                        {w.isCorrected ? (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                            Voided (Correction Recorded)
                          </span>
                        ) : (
                          <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.82rem' }}>Active Penalty</span>
                        )}
                      </td>
                      <td>
                        {!w.isCorrected && (
                          <button
                            className="btn-outline"
                            onClick={() => {
                              setTargetWarningForCorrection(w);
                              setShowCorrectWarningModal(true);
                            }}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Void / Correct
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: OFFICIAL LIBRARY BULLETINS & SEAT VACANCIES */}
        {activeTab === 'announcements' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                    Official Library Bulletins &amp; Announcements
                  </h3>
                  <span className="badge badge-due" style={{ fontSize: '0.75rem' }}>
                    🔒 Admin Access Only
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Only authorized administrators have permissions to publish seat vacancies, facility notices, and fee guidelines.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  id="admin-quick-seat-vacancy-btn"
                  className="btn-gold"
                  onClick={() => {
                    setNewAnnouncementData({
                      title: '💺 Seat Vacancy: Desk 03 & Cabin 31 (24/7 Access) Available',
                      content: 'Official notice from administration: Desk 03 and Cabin 31 with dedicated workstation ownership, personal reading light, and power outlets are vacant for immediate admission with 24/7 round-the-clock access. Inquire at the front desk or call 9622497806.',
                      category: 'Seat Vacancy',
                      isPinned: true,
                      dueDate: '',
                      amount: '',
                      paymentInstructions: '',
                    });
                    setShowAnnouncementModal(true);
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  💺 Post Seat Vacancy Notice
                </button>

                <button
                  id="admin-create-announcement-btn"
                  className="btn-outline"
                  onClick={() => {
                    setNewAnnouncementData({
                      title: '',
                      content: '',
                      category: 'General News',
                      isPinned: false,
                      dueDate: '',
                      amount: '',
                      paymentInstructions: '',
                    });
                    setShowAnnouncementModal(true);
                  }}
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  <Plus size={16} /> Create Custom Notice
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: a.category === 'Seat Vacancy' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                    background: a.category === 'Seat Vacancy' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span
                        className="badge"
                        style={{
                          background: a.category === 'Seat Vacancy' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                          color: a.category === 'Seat Vacancy' ? 'var(--accent-gold)' : '#FFFFFF',
                          borderColor: a.category === 'Seat Vacancy' ? 'var(--accent-gold)' : 'var(--border-subtle)',
                          fontWeight: '700',
                          fontSize: '0.78rem',
                        }}
                      >
                        {a.category === 'Seat Vacancy' ? '💺 Seat Vacancy' : a.category}
                      </span>
                      {a.isPinned && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', fontWeight: '800' }}>
                          ★ PINNED
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '1.18rem', marginBottom: '8px', color: '#FFFFFF', fontWeight: '700' }}>{a.title}</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{a.content}</p>

                    {a.dueDate && (
                      <div style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--accent-gold)' }}>
                        Due: <strong>{a.dueDate}</strong> {a.amount ? `(₹${a.amount})` : ''}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Published {new Date(a.publishedAt).toLocaleDateString()} • By <span style={{ color: 'var(--accent-gold)' }}>{a.publishedBy}</span>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => setAnnouncementToDelete(a)}
                      style={{ padding: '5px 12px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="Delete this official bulletin"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: FACILITIES & INFRASTRUCTURE MANAGEMENT */}
        {activeTab === 'facilities' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                  Basic Facilities &amp; Infrastructure
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Add, edit, or control the facilities shown directly on the public homepage.
                </p>
              </div>

              <button
                id="admin-add-facility-btn"
                className="btn-gold"
                onClick={() => {
                  setEditingFacility(null);
                  setFacilityFormData({
                    name: '',
                    description: '',
                    iconName: 'Sparkles',
                    isActive: true,
                  });
                  setShowFacilityModal(true);
                }}
                style={{ padding: '8px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Add New Facility
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {facilities.map((fac) => (
                <div
                  key={fac.id}
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: fac.isActive ? '1px solid var(--border-medium)' : '1px solid rgba(239, 68, 68, 0.3)',
                    opacity: fac.isActive ? 1 : 0.6,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className={`badge ${fac.isActive ? 'badge-present' : 'badge-absent'}`}>
                        {fac.isActive ? 'Active on Home' : 'Hidden'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Icon: <code>{fac.iconName}</code>
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#FFFFFF', fontWeight: '700' }}>
                      {fac.name}
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                      {fac.description}
                    </p>
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        setEditingFacility(fac);
                        setFacilityFormData({
                          name: fac.name,
                          description: fac.description,
                          iconName: fac.iconName,
                          isActive: fac.isActive,
                        });
                        setShowFacilityModal(true);
                      }}
                      style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteFacility(fac.id, fac.name)}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: RULES & CODE OF CONDUCT MANAGEMENT */}
        {activeTab === 'rules' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                  Library Rules &amp; Code of Conduct
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                  Manage the official discipline rules and consequences displayed dynamically on the public home page.
                </p>
              </div>

              <button
                id="admin-add-rule-btn"
                className="btn-gold"
                onClick={() => {
                  setEditingRule(null);
                  setRuleFormData({
                    ruleNumber: String(rules.length + 1),
                    title: '',
                    description: '',
                    category: 'Silence',
                    severity: 'Strict',
                    consequence: '',
                    isActive: true,
                  });
                  setShowRuleModal(true);
                }}
                style={{ padding: '8px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={16} /> Add New Rule
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {rules
                .sort((a, b) => a.ruleNumber - b.ruleNumber)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="glass-panel"
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '20px',
                      flexWrap: 'wrap',
                      opacity: rule.isActive ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flex: 1, minWidth: '280px' }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          flexShrink: 0,
                        }}
                      >
                        #{rule.ruleNumber}
                      </span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h4 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.08rem' }}>{rule.title}</h4>
                          <span className={`badge ${rule.severity === 'Critical' ? 'badge-absent' : rule.severity === 'Strict' ? 'badge-late' : 'badge-excused'}`}>
                            {rule.severity}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            [{rule.category}]
                          </span>
                        </div>
                        <p style={{ margin: '4px 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {rule.description}
                        </p>
                        {rule.consequence && (
                          <div style={{ fontSize: '0.78rem', color: '#EF4444', fontWeight: '600', marginTop: '4px' }}>
                            ⚠️ Enforcement: {rule.consequence}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-outline"
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleFormData({
                            ruleNumber: String(rule.ruleNumber),
                            title: rule.title,
                            description: rule.description,
                            category: rule.category,
                            severity: rule.severity,
                            consequence: rule.consequence || '',
                            isActive: rule.isActive,
                          });
                          setShowRuleModal(true);
                        }}
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={13} /> Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteRule(rule.id, rule.title)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 8: CAROUSEL PHOTO MANAGER (STRICT MAX 8 PHOTOS) */}
        {activeTab === 'carousel' && (
          <div>
            {/* Top Toolbar Strip */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.5rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                    Campus Photo Carousel
                  </h2>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '0.82rem',
                      fontWeight: '800',
                      letterSpacing: '0.04em',
                      background:
                        carouselPhotos.length >= 8
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${
                        carouselPhotos.length >= 8 ? '#EF4444' : '#10B981'
                      }`,
                      color: carouselPhotos.length >= 8 ? '#FCA5A5' : '#6EE7B7',
                    }}
                  >
                    {carouselPhotos.length} / 8 Photos{' '}
                    {carouselPhotos.length >= 8 ? '(Limit Reached)' : 'Active'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Manage the rotating photo carousel displayed on the public homepage.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={handleResetDefaultCarouselPhotos}
                  title="Restore original 8 campus pictures"
                  style={{ fontSize: '0.86rem' }}
                >
                  <RefreshCw size={15} /> Restore Default 8 Photos
                </button>

                <button
                  id="admin-upload-carousel-photo-btn"
                  type="button"
                  className={carouselPhotos.length >= 8 ? 'btn-outline' : 'btn-gold'}
                  disabled={carouselPhotos.length >= 8}
                  onClick={() => {
                    setPhotoUploadError(null);
                    setNewPhotoBase64('');
                    setNewPhotoTitle('');
                    setNewPhotoCaption('');
                    setShowAddPhotoModal(true);
                  }}
                  title={
                    carouselPhotos.length >= 8
                      ? 'Maximum 8 photos reached. Delete an existing photo first to free up a slot.'
                      : 'Upload a new photo'
                  }
                  style={{
                    opacity: carouselPhotos.length >= 8 ? 0.6 : 1,
                    cursor: carouselPhotos.length >= 8 ? 'not-allowed' : 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} /> Upload New Photo ({carouselPhotos.length}/8)
                </button>
              </div>
            </div>

            {/* Strict 8-Photo Limit Policy & Permanent Storage Explanation Banner */}
            <div
              className="glass-panel"
              style={{
                padding: '18px 24px',
                borderRadius: '16px',
                marginBottom: '26px',
                border:
                  carouselPhotos.length >= 8
                    ? '1.5px solid rgba(245, 158, 11, 0.5)'
                    : '1.5px solid rgba(16, 185, 129, 0.35)',
                background:
                  carouselPhotos.length >= 8
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)'
                    : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background:
                      carouselPhotos.length >= 8
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                    color:
                      carouselPhotos.length >= 8 ? 'var(--accent-gold)' : '#34D399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Camera size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color:
                        carouselPhotos.length >= 8
                          ? 'var(--accent-gold-light)'
                          : '#6EE7B7',
                      fontWeight: '800',
                      fontSize: '0.96rem',
                      marginBottom: '4px',
                    }}
                  >
                    {carouselPhotos.length >= 8
                      ? '⚠️ Maximum Limit Reached (Strictly 8 Photos in Carousel)'
                      : `✅ Photo Slots Available: ${8 - carouselPhotos.length} / 8 slots free`}
                  </div>
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.86rem',
                      lineHeight: '1.55',
                      margin: 0,
                    }}
                  >
                    {carouselPhotos.length >= 8 ? (
                      <span>
                        The carousel is strictly capped at <strong>8 photographs</strong>.
                        To upload a new photograph, you must <strong>delete one of the existing photos</strong>{' '}
                        below (which reduces the count to 7/8), or click <strong>Replace / Edit</strong> on any card to swap it in-place.
                      </span>
                    ) : (
                      <span>
                        You have <strong>{8 - carouselPhotos.length} available photo slot(s)</strong>.
                        Click <strong>"Upload New Photo"</strong> to add an image.
                      </span>
                    )}
                    <br />
                    <span style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: '6px', display: 'inline-block' }}>
                      🔒 <strong>Permanent Storage Guarantee:</strong> All photos are saved directly as Base64 Data URLs inside the website storage. Even if you subsequently delete the picture from your personal computer or phone, it will remain permanently preserved and visible on the website.
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Photos Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '20px',
              }}
            >
              {carouselPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  {/* Image Thumbnail Container */}
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      background: '#070A10',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={getAssetUrl(photo.src)}
                      alt={photo.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={() => {
                        console.warn('Image thumbnail failed to load:', photo.src);
                      }}
                    />

                    {/* Slot Badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(10, 15, 25, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid var(--border-gold)',
                        color: 'var(--accent-gold)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.76rem',
                        fontWeight: '800',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Slide #{index + 1}
                    </div>

                    {photo.isCustom && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(59, 130, 246, 0.85)',
                          backdropFilter: 'blur(8px)',
                          color: '#FFFFFF',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                        }}
                      >
                        Custom Upload
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4
                      style={{
                        color: '#FFFFFF',
                        fontSize: '1.02rem',
                        fontWeight: '700',
                        margin: '0 0 6px 0',
                        lineHeight: '1.4',
                      }}
                    >
                      {photo.title}
                    </h4>
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.84rem',
                        lineHeight: '1.5',
                        margin: '0 0 16px 0',
                        flex: 1,
                      }}
                    >
                      {photo.caption}
                    </p>

                    {/* Card Actions */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: '12px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => handleOpenReplacePhoto(photo)}
                        style={{
                          flex: 1,
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Edit2 size={13} /> Replace / Edit
                      </button>

                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleOpenDeletePhoto(photo)}
                        title="Delete this photo to free up a slot"
                        style={{
                          fontSize: '0.8rem',
                          padding: '8px 12px',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: REGISTRATION STATUS & CANCELLATIONS */}
        {activeTab === 'registration' && (
          <div>
            <div className="fee-due-alert" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.3) 100%)' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '6px', color: '#FFFFFF' }}>
                  Registration Review &amp; Cancellation Queue
                </h3>
                <p style={{ color: '#FECACA', fontSize: '0.88rem' }}>
                  Members with 10 Warnings or severe disciplinary breaches are reviewed here. Confirming cancellation immediately terminates portal access.
                </p>
              </div>
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member ID</th>
                    <th>Full Name</th>
                    <th>Status</th>
                    <th>Warning Level</th>
                    <th>Findings / Reason</th>
                    <th>Review Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.filter((m) => m.warningCount >= 8 || m.membershipStatus === 'Review' || m.membershipStatus === 'Cancelled').map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: '800', color: 'var(--accent-gold)' }}>{m.id}</td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{m.fullName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{m.phoneNumber}</div>
                      </td>
                      <td>
                        <span className={`badge ${m.membershipStatus === 'Cancelled' ? 'badge-absent' : 'badge-review'}`}>
                          {m.membershipStatus}
                        </span>
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        <WarningMeter count={m.warningCount} size="sm" />
                      </td>
                      <td style={{ fontSize: '0.82rem', maxWidth: '280px' }}>
                        {m.cancellationReason || m.notes || '10 warnings threshold reached.'}
                      </td>
                      <td>
                        {m.membershipStatus !== 'Cancelled' ? (
                          <button
                            className="btn-danger"
                            onClick={() => {
                              setTargetMemberForCancel(m);
                              setCancellationReason(`Revoked after reaching ${m.warningCount}/10 warnings and disciplinary hearing.`);
                              setShowCancelModal(true);
                            }}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Confirm Cancellation
                          </button>
                        ) : (
                          <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.82rem' }}>Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 10: SETTINGS & OWNER HANDOVER */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: '800px' }}>
            {/* Handover & Successor Administration Console */}
            <div className="glass-panel" style={{ padding: '32px', marginBottom: '30px', border: '1.5px solid var(--border-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #D97706 100%)', color: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h3 style={{ color: '#FFFFFF', fontSize: '1.35rem', margin: 0, fontWeight: '700' }}>
                    Administrator Authority Handover &amp; Succession
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Secure transfer of library management authority to a new administrator
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '22px' }}>
                To safely handover administrative credentials, the existing administrator must first verify their active email and password. Once authenticated, you can register the new administrator with their personal details and secure password.
              </p>

              {/* STEP 1: EX-ADMIN CREDENTIALS VERIFICATION */}
              {handoverStep === 1 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-gold)', color: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: '800' }}>1</span>
                    <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>
                      Verify Current Administrator Credentials
                    </h4>
                  </div>

                  {handoverVerifyError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <span>{handoverVerifyError}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyExAdmin}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">Current Admin Email *</label>
                      <input
                        type="email"
                        id="handover-old-email"
                        className="form-input"
                        value={exAdminEmail}
                        onChange={(e) => setExAdminEmail(e.target.value)}
                        placeholder="Enter your email here"
                        required
                        autoComplete="off"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label">Current Admin Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showExAdminPassword ? 'text' : 'password'}
                          id="handover-old-password"
                          className="form-input"
                          style={{ paddingRight: '42px' }}
                          value={exAdminPassword}
                          onChange={(e) => setExAdminPassword(e.target.value)}
                          placeholder="Enter password here"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowExAdminPassword(!showExAdminPassword)}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: showExAdminPassword ? 'var(--accent-gold)' : '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        >
                          {showExAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="handover-verify-btn"
                      className="btn-gold"
                      style={{ padding: '10px 22px', fontSize: '0.9rem', fontWeight: '700' }}
                    >
                      Authenticate Current Admin &amp; Proceed to Handover →
                    </button>
                  </form>
                </div>
              )}

              {/* STEP 2: REGISTER NEW ADMINISTRATOR */}
              {handoverStep === 2 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#10B981', color: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: '800' }}>2</span>
                      <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>
                        Register New Administrator
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#34D399', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: 'var(--radius-pill)', fontWeight: '600' }}>
                      ✓ Current Admin Identity Verified
                    </span>
                  </div>

                  {handoverRegisterError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <span>{handoverRegisterError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterNewAdmin} autoComplete="off">
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label">New Administrator Full Name *</label>
                      <input
                        type="text"
                        id="handover-new-name"
                        className="form-input"
                        value={newAdminFullName}
                        onChange={(e) => setNewAdminFullName(e.target.value)}
                        placeholder="Enter full name here"
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">New Administrator Email *</label>
                        <input
                          type="email"
                          id="handover-new-email"
                          className="form-input"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="Enter your email here"
                          required
                          autoComplete="off"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">New Administrator Phone *</label>
                        <input
                          type="tel"
                          id="handover-new-phone"
                          className="form-input"
                          value={newAdminPhone}
                          onChange={(e) => setNewAdminPhone(e.target.value)}
                          placeholder="Enter phone number here"
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                      <div className="form-group">
                        <label className="form-label">New Admin Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showNewAdminPassword ? 'text' : 'password'}
                            id="handover-new-password"
                            className="form-input"
                            style={{ paddingRight: '42px' }}
                            value={newAdminPassword}
                            onChange={(e) => setNewAdminPassword(e.target.value)}
                            placeholder="Enter password here"
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: showNewAdminPassword ? 'var(--accent-gold)' : '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          >
                            {showNewAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Confirm New Password *</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showNewAdminConfirmPassword ? 'text' : 'password'}
                            id="handover-new-confirm-password"
                            className="form-input"
                            style={{ paddingRight: '42px' }}
                            value={newAdminConfirmPassword}
                            onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                            placeholder="Enter password again to confirm"
                            required
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewAdminConfirmPassword(!showNewAdminConfirmPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: showNewAdminConfirmPassword ? 'var(--accent-gold)' : '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                          >
                            {showNewAdminConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="submit"
                        id="handover-submit-btn"
                        className="btn-gold"
                        disabled={handoverLoading}
                        style={{ padding: '12px 24px', fontSize: '0.92rem', fontWeight: '700' }}
                      >
                        {handoverLoading ? 'Dispatching Verification Email...' : 'Send Handover Verification Email & Code →'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          setHandoverStep(1);
                          setExAdminPassword('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 3: VERIFY EMAIL CODE OR LINK */}
              {handoverStep === 3 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 'var(--radius-lg)', padding: '26px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-gold)', color: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: '800' }}>3</span>
                    <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>
                      Verify Handover via Email Code or Link
                    </h4>
                  </div>

                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '18px' }}>
                    <div style={{ color: '#93C5FD', fontWeight: '700', fontSize: '0.9rem', marginBottom: '4px' }}>
                      📧 Verification Dispatched to New Admin Email:
                    </div>
                    <div style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '0.95rem' }}>
                      {newAdminEmail}
                    </div>
                    <div style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '6px', lineHeight: '1.5' }}>
                      A 6-digit confirmation code and one-click verification link have been dispatched. Enter the code below or click the link sent to the new administrator's email.
                    </div>
                  </div>

                  {handoverPendingData?.code && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '0.82rem', color: '#6EE7B7' }}>
                        <span>Testing Helper: Generated 6-digit code is </span>
                        <code style={{ background: '#064E3B', color: '#A7F3D0', padding: '2px 8px', borderRadius: '4px', fontWeight: '800', letterSpacing: '2px' }}>
                          {handoverPendingData.code}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverEnteredCode(handoverPendingData.code);
                        }}
                        style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', color: '#A7F3D0', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
                      >
                        Auto-Fill Code
                      </button>
                    </div>
                  )}

                  {handoverRegisterError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <span>{handoverRegisterError}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyHandoverCode}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <label className="form-label" style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>
                        Enter 6-Digit Email Verification Code *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        className="form-input"
                        value={handoverEnteredCode}
                        onChange={(e) => setHandoverEnteredCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="e.g. 482910"
                        style={{ fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', fontWeight: '800', fontFamily: 'monospace' }}
                        required
                        autoFocus
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="btn-gold"
                        disabled={handoverLoading || handoverEnteredCode.length < 6}
                        style={{ padding: '12px 24px', fontSize: '0.92rem', fontWeight: '700' }}
                      >
                        {handoverLoading ? 'Verifying...' : 'Verify Code & Finalize Authority Transfer →'}
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setHandoverStep(2)}
                      >
                        Back to Edit Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* STEP 4: HANDOVER CONFIRMED & GLOBAL CONTACTS ACTIVATED */}
              {handoverStep === 4 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid #10B981', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#10B981', color: '#080C14', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)' }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h4 style={{ color: '#FFFFFF', fontSize: '1.45rem', marginBottom: '8px', fontWeight: '800' }}>
                    Authority Handover Verified &amp; Active!
                  </h4>
                  <p style={{ color: '#D1FAE5', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 16px auto', lineHeight: '1.6' }}>
                    Administrative authority has been officially transferred to <strong>{handoverSuccessInfo?.name || newAdminFullName}</strong>.
                  </p>

                  <div style={{ background: 'rgba(8, 12, 20, 0.6)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px 20px', maxWidth: '520px', margin: '0 auto 22px auto', textAlign: 'left' }}>
                    <div style={{ fontSize: '0.82rem', color: '#34D399', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ✓ Live Contact Channels Updated Website-wide:
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#E2E8F0', lineHeight: '1.7' }}>
                      • <strong>Official Email:</strong> <code>{handoverSuccessInfo?.email || newAdminEmail}</code>
                      <br />
                      • <strong>Helpline &amp; WhatsApp:</strong> <code>{handoverSuccessInfo?.phone || newAdminPhone}</code>
                      <br />
                      • <strong>Navbar &amp; Footer:</strong> Automatically displaying new contact info.
                      <br />
                      • <strong>Fee Reminders:</strong> WhatsApp template now includes new owner number.
                    </div>
                  </div>

                  <button
                    type="button"
                    id="handover-logout-btn"
                    className="btn-gold"
                    onClick={() => {
                      logout();
                      if (onNavigate) onNavigate('admin-login');
                    }}
                    style={{ padding: '12px 30px', fontSize: '0.95rem', fontWeight: '800' }}
                  >
                    Log Out to Let New Admin Sign In →
                  </button>
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, var(--accent-gold) 0%, #D97706 100%)',
                    color: '#080C14',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#FFFFFF' }}>
                    Administrator Password &amp; Phone Security
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Secured with genuine Phone OTP verification via +91 Indian Carrier Network
                  </div>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Password updates and credentials recovery are strictly protected. To change your administrative credentials, initiate a verified SMS OTP session to the registered library administrator phone number (<strong>{displayAdminPhone}</strong>).
              </p>

              <button
                type="button"
                onClick={() => setShowAdminResetModal(true)}
                className="btn-gold"
                style={{ padding: '12px 24px', fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <KeyRound size={16} /> Open Phone OTP Password Reset Console
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ----------------- MODALS ----------------- */}

      {/* MODAL 1: ADD NEW MEMBER */}
      {showAddMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>Register New Library Member</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '22px' }}>
              Next month's fee renewal date will be automatically generated upon admission.
            </p>

            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMemberData.fullName}
                  onChange={(e) => setNewMemberData({ ...newMemberData, fullName: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>
                  Student Email Address (Required for Student Portal Login) *
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={newMemberData.email}
                  onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                  placeholder="Enter student email"
                  required
                  autoComplete="email"
                />
                <div style={{ fontSize: '0.74rem', color: '#93C5FD', marginTop: '3px' }}>
                  🔑 Mandatory: The student uses this registered email to sign in and receive password reset links.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number (Private) *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={newMemberData.phoneNumber}
                  onChange={(e) => setNewMemberData({ ...newMemberData, phoneNumber: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Joining</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newMemberData.joiningDate}
                    onChange={(e) => setNewMemberData({ ...newMemberData, joiningDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newMemberData.monthlyFee}
                    onChange={(e) => setNewMemberData({ ...newMemberData, monthlyFee: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Allotted Desk / Cabin (Admin Controlled Only) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMemberData.seatNumber}
                  onChange={(e) => setNewMemberData({ ...newMemberData, seatNumber: e.target.value })}
                  placeholder="Enter allotted desk / cabin"
                  required
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Student has 24/7 dedicated round-the-clock access to this assigned desk.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Study Goal / Target Exam (Librarian Controlled) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newMemberData.studyTarget}
                  onChange={(e) => setNewMemberData({ ...newMemberData, studyTarget: e.target.value })}
                  placeholder="Enter target exam or study goal"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  Confirm Registration
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowAddMemberModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: EDIT EXISTING MEMBER (ALLOTTED DESK & STUDY GOAL ADMIN CONTROL) */}
      {showEditMemberModal && targetMemberForEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '6px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={20} color="var(--accent-gold)" /> Manage Student Allotments
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Member: <strong style={{ color: '#FFFFFF' }}>{targetMemberForEdit.fullName}</strong>
            </p>

            <form onSubmit={handleSaveMemberEdit}>
              <div className="form-group">
                <label className="form-label">Allotted Desk / Cabin (Admin Managed Only) *</label>
                <input
                  id="admin-edit-member-seat"
                  type="text"
                  className="form-input"
                  value={editMemberForm.seatNumber}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, seatNumber: e.target.value })}
                  placeholder="Enter allotted desk / cabin"
                  required
                />
                <div style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                  🔒 Reflected immediately in student dashboard as their dedicated allotted seat.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Study Goal / Exam Target (Librarian Updated Only) *</label>
                <input
                  id="admin-edit-member-goal"
                  type="text"
                  className="form-input"
                  value={editMemberForm.studyTarget}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, studyTarget: e.target.value })}
                  placeholder="Enter target exam or study goal"
                  required
                />
                <div style={{ fontSize: '0.74rem', color: '#38BDF8', marginTop: '4px' }}>
                  🎯 Displayed directly in student dashboard as their verified preparation goal.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editMemberForm.fullName}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={editMemberForm.phoneNumber}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, phoneNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--accent-gold)' }}>
                  Student Email Address (Used for Portal Sign In &amp; Password Reset) *
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={editMemberForm.email}
                  onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Joining *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editMemberForm.joiningDate}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, joiningDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--accent-gold)' }}>
                    Fee Expiry / Renewal Date *
                  </label>
                  <input
                    id="admin-edit-member-feeduedate"
                    type="date"
                    className="form-input"
                    value={editMemberForm.feeDueDate}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, feeDueDate: e.target.value })}
                    required
                    style={{ borderColor: 'rgba(212, 175, 55, 0.45)' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>
                    Adjust here if &quot;Paid&quot; was clicked twice by mistake.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editMemberForm.monthlyFee}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, monthlyFee: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Membership Status</label>
                  <select
                    className="form-select"
                    value={editMemberForm.membershipStatus}
                    onChange={(e) => setEditMemberForm({ ...editMemberForm, membershipStatus: e.target.value as any })}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Review">On Review</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button id="admin-save-member-edit-btn" type="submit" className="btn-gold" style={{ flex: 1 }}>
                  Save Allotments &amp; Profile
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowEditMemberModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMIZE FEE / EXPIRY DATE */}
      {showFeeModal && targetMemberForFee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Adjust Fee &amp; Joining Schedule</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Student: <strong>{targetMemberForFee.fullName}</strong>
            </p>

            <form onSubmit={handleSaveFeeSettings}>
              <div className="form-group">
                <label className="form-label">Date of Joining *</label>
                <input
                  type="date"
                  className="form-input"
                  value={editFeeJoiningDate}
                  onChange={(e) => setEditFeeJoiningDate(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Official library enrollment/joining date.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Membership Expiry / Fee Due Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={editFeeDueDate}
                  onChange={(e) => setEditFeeDueDate(e.target.value)}
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Reminders will trigger daily once this date passes until marked Paid.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Fee Amount (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={editMonthlyFee}
                  onChange={(e) => setEditMonthlyFee(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  Save Fee Schedule
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowFeeModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE DISCIPLINARY WARNING */}
      {showWarningModal && targetMemberForWarning && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ color: '#EF4444', fontSize: '1.3rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle /> Issue Disciplinary Warning
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Member: <strong>{targetMemberForWarning.fullName}</strong> • Current Count: <strong>{targetMemberForWarning.warningCount}/10</strong>
            </p>

            <form onSubmit={handleIssueWarning}>
              <div className="form-group">
                <label className="form-label">Disciplinary Reason *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Enter violation reason..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <select
                  className="form-select"
                  value={warningSeverity}
                  onChange={(e) => setWarningSeverity(e.target.value as any)}
                >
                  <option value="Minor">Minor (First breach of silence / minor etiquette)</option>
                  <option value="Moderate">Moderate (Disturbing colleagues / food inside desk)</option>
                  <option value="Severe">Severe (Argument with staff / repeat noise offence)</option>
                  <option value="Critical">Critical (Property damage / exam period misconduct)</option>
                </select>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--border-gold)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--accent-gold-light)', marginBottom: '20px' }}>
                <strong>Notice:</strong> This will increment member warning count to <strong>{targetMemberForWarning.warningCount + 1}/10</strong>.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                  Issue Official Warning #{targetMemberForWarning.warningCount + 1}/10
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowWarningModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: AUDITED WARNING CORRECTION */}
      {showCorrectWarningModal && targetWarningForCorrection && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Audited Warning Correction</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Voiding Warning #{targetWarningForCorrection.warningNumber} for {targetWarningForCorrection.memberName}.
            </p>

            <form onSubmit={handleCorrectWarning}>
              <div className="form-group">
                <label className="form-label">Mandatory Correction Justification *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Enter reason for correction..."
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  Confirm Void &amp; Deduct 1 Warning
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowCorrectWarningModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM REGISTRATION CANCELLATION */}
      {showCancelModal && targetMemberForCancel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ color: '#EF4444', fontSize: '1.3rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert /> Confirm Registration Revocation
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Member: <strong>{targetMemberForCancel.fullName}</strong>
            </p>

            <form onSubmit={handleConfirmCancellation}>
              <div className="form-group">
                <label className="form-label">Administrative Revocation Findings *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#FCA5A5', marginBottom: '20px' }}>
                ⚠️ The member's status will be marked <strong>Cancelled</strong> and login access will be permanently revoked.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                  Revoke Registration
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowCancelModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CREATE ANNOUNCEMENT */}
      {showAnnouncementModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>Publish Library Announcement</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Broadcast to library website and member personal dashboards.
            </p>

            <form onSubmit={handlePublishAnnouncement}>
              <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quick Template:</span>
                <button
                  type="button"
                  id="modal-preset-seat-vacancy-btn"
                  className="glass-panel"
                  onClick={() => {
                    setNewAnnouncementData({
                      title: '💺 Seat Vacancy: Desk 03 & Cabin 31 (24/7 Access) Available',
                      content: 'Official Administration Announcement: Desk 03 and Cabin 31 with dedicated workstation ownership, personal reading light, and power outlets are vacant for immediate admission with 24/7 round-the-clock access. Inquire at front desk or call 9622497806.',
                      category: 'Seat Vacancy',
                      isPinned: true,
                      dueDate: '',
                      amount: '',
                      paymentInstructions: '',
                    });
                  }}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--accent-gold)' }}
                >
                  💺 Seat Vacancy Notice
                </button>
                <button
                  type="button"
                  id="modal-preset-fee-notice-btn"
                  className="glass-panel"
                  onClick={() => {
                    setNewAnnouncementData({
                      title: 'Monthly Subscription Renewal & Seat Retention Notice',
                      content: 'All active members are requested to complete the monthly maintenance fee contribution before the due date to retain your assigned workstation desk.',
                      category: 'Fee Notice',
                      isPinned: true,
                      dueDate: '2026-11-25',
                      amount: '1200',
                      paymentInstructions: 'UPI payment available at reception desk or via official library UPI ID: hikmahlibrary@okhdfcbank.',
                    });
                  }}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#60A5FA' }}
                >
                  💳 Fee Notice
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newAnnouncementData.title}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, title: e.target.value })}
                  placeholder="Enter notice title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newAnnouncementData.category}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, category: e.target.value as any })}
                >
                  <option value="Seat Vacancy">💺 Seat Vacancy (Available Desks/Cabins)</option>
                  <option value="General News">📢 General News &amp; Bulletins</option>
                  <option value="Fee Notice">💳 Fee Notice &amp; Renewal</option>
                  <option value="Misconduct Notice">⚠️ Misconduct &amp; General Disciplinary Notice</option>
                  <option value="Library Rules">📜 Library Rules &amp; Policies</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Content *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={newAnnouncementData.content}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, content: e.target.value })}
                  placeholder="Enter notice details..."
                  required
                />
              </div>

              {newAnnouncementData.category === 'Fee Notice' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Payment Due Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newAnnouncementData.dueDate}
                        onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={newAnnouncementData.amount}
                        onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, amount: e.target.value })}
                        placeholder="e.g. 1200"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Instructions</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newAnnouncementData.paymentInstructions}
                      onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, paymentInstructions: e.target.value })}
                      placeholder="e.g. UPI ID or reception counter payment"
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
                <input
                  type="checkbox"
                  id="pin-announcement"
                  checked={newAnnouncementData.isPinned}
                  onChange={(e) => setNewAnnouncementData({ ...newAnnouncementData, isPinned: e.target.checked })}
                />
                <label htmlFor="pin-announcement" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                  Pin this announcement to top of dashboard
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  Publish Announcement
                </button>
                <button type="button" className="btn-outline" onClick={() => setShowAnnouncementModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: ADD / EDIT FACILITY */}
      {showFacilityModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>
              {editingFacility ? 'Edit Facility & Infrastructure' : 'Add New Facility & Infrastructure'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Controls the facility card displayed on the public home page.
            </p>

            <form onSubmit={handleSaveFacility}>
              <div className="form-group">
                <label className="form-label">Facility Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={facilityFormData.name}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, name: e.target.value })}
                  placeholder="e.g. Fully Air Conditioned & Climate Control"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Icon Representation</label>
                <select
                  className="form-select"
                  value={facilityFormData.iconName}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, iconName: e.target.value })}
                >
                  <option value="Sparkles">Sparkles (Luxury / Climate)</option>
                  <option value="VolumeX">VolumeX (Acoustic Silence)</option>
                  <option value="Wifi">Wifi (High-Speed Internet)</option>
                  <option value="Zap">Zap (Power &amp; Charging)</option>
                  <option value="Clock">Clock (24/7 Hours)</option>
                  <option value="ShieldCheck">ShieldCheck (Security / Backup)</option>
                  <option value="Coffee">Coffee (Cafeteria &amp; RO Water)</option>
                  <option value="BookOpen">BookOpen (Library References)</option>
                  <option value="MapPin">MapPin (Location / Prayer Area)</option>
                  <option value="Award">Award (General Excellence)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={facilityFormData.description}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, description: e.target.value })}
                  placeholder="Describe how this facility supports students..."
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
                <input
                  type="checkbox"
                  id="facility-is-active"
                  checked={facilityFormData.isActive}
                  onChange={(e) => setFacilityFormData({ ...facilityFormData, isActive: e.target.checked })}
                />
                <label htmlFor="facility-is-active" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                  Active and visible on the public home page
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  {editingFacility ? 'Save Changes' : 'Create Facility'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setShowFacilityModal(false);
                    setEditingFacility(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: ADD / EDIT LIBRARY RULE */}
      {showRuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.35rem', marginBottom: '6px' }}>
              {editingRule ? 'Edit Library Rule & Conduct' : 'Add New Library Rule & Conduct'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Defines the official discipline norms and penalties shown on the public home page.
            </p>

            <form onSubmit={handleSaveRule}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Rule # *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={ruleFormData.ruleNumber}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, ruleNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Rule Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={ruleFormData.title}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, title: e.target.value })}
                    placeholder="e.g. Strict Silence Protocol"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={ruleFormData.category}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value as any })}
                  >
                    <option value="Silence">Silence</option>
                    <option value="Cleanliness">Cleanliness</option>
                    <option value="Dining">Dining</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Fees">Fees</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select
                    className="form-select"
                    value={ruleFormData.severity}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, severity: e.target.value as any })}
                  >
                    <option value="Info">Info (General Guideline)</option>
                    <option value="Strict">Strict (Warning Issued)</option>
                    <option value="Critical">Critical (Immediate Escalation)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Rule Description *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  placeholder="Explain the specific expectation and behavioral standard..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Enforcement / Consequence</label>
                <input
                  type="text"
                  className="form-input"
                  value={ruleFormData.consequence}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, consequence: e.target.value })}
                  placeholder="e.g. Warning issued if ringtone sounds in study bay"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '14px 0' }}>
                <input
                  type="checkbox"
                  id="rule-is-active"
                  checked={ruleFormData.isActive}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, isActive: e.target.checked })}
                />
                <label htmlFor="rule-is-active" style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                  Active and visible on the public home page
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn-gold" style={{ flex: 1 }}>
                  {editingRule ? 'Save Changes' : 'Create Rule'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    setShowRuleModal(false);
                    setEditingRule(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM MEMBER DELETION POP-UP */}
      {showDeleteMemberModal && targetMemberForDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#EF4444',
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                  Confirm Member Deletion
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Permanent directory removal
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
                fontSize: '0.88rem',
                lineHeight: '1.6',
                color: '#FECACA',
              }}
            >
              Are you sure you want to permanently delete member <strong style={{ color: '#FFFFFF' }}>{targetMemberForDelete.fullName}</strong>?
              <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#E2E8F0' }}>
                <div>• Registered Email: <span style={{ color: '#93C5FD' }}>{targetMemberForDelete.email}</span></div>
                <div>• Allotted Seat: <span style={{ color: 'var(--accent-gold)' }}>{targetMemberForDelete.seatNumber || 'Standard Focus Desk'}</span></div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#F87171', fontWeight: '600' }}>
                ⚠️ This will permanently remove their records, disciplinary history, and release their assigned seat.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                disabled={deletingMember}
                onClick={() => {
                  setShowDeleteMemberModal(false);
                  setTargetMemberForDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-confirm-delete-member-btn"
                className="btn-danger"
                disabled={deletingMember}
                onClick={handleConfirmDeleteMember}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}
              >
                <Trash2 size={15} />
                {deletingMember ? 'Deleting Member...' : 'Yes, Delete Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE ANNOUNCEMENT */}
      {announcementToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', margin: 0, fontWeight: '700' }}>
                Delete Announcement
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Are you sure you want to permanently remove this announcement?
            </p>
            <div style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '20px', color: '#F8FAFC', fontSize: '0.9rem' }}>
              "{announcementToDelete.title}"
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setAnnouncementToDelete(null)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                id="admin-confirm-delete-announcement-btn"
                className="btn-danger"
                onClick={confirmDeleteAnnouncement}
                style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: '700' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP BATCH REMINDERS DISPATCH MODAL */}
      {waBatchQueue && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#25D366',
                  }}
                >
                  <Bell size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                    Dispatch Fee Reminders to Overdue Students
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: '500' }}>
                    {waBatchQueue.length} student(s) currently overdue • Review &amp; select recipients
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaBatchQueue(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Select All Toolbar Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.88rem', color: '#FFFFFF', fontWeight: '700' }}>
                <input
                  type="checkbox"
                  checked={waBatchQueue.length > 0 && waBatchQueue.every((q) => q.selected)}
                  onChange={(e) => handleToggleSelectAll(e.target.checked)}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                />
                Select All ({waBatchQueue.filter((q) => q.selected).length} of {waBatchQueue.length} Selected)
              </label>

              <button
                type="button"
                className="btn-outline"
                onClick={handleCopyBroadcastText}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                }}
                title="Copy formatted notice to clipboard"
              >
                {copyBroadcastSuccess ? <Check size={13} color="#34D399" /> : <Copy size={13} />}
                {copyBroadcastSuccess ? 'Copied Notice!' : 'Copy Fee Notice'}
              </button>
            </div>

            {/* Status Feedback Banner */}
            {dispatchComplete ? (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '14px',
                  color: '#34D399',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  ✓ Reminders recorded in student portals and WhatsApp chats opened! Press <strong>Send</strong> in WhatsApp.
                </span>
              </div>
            ) : (
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginBottom: '14px',
                  lineHeight: '1.4',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                💡 Each selected student's phone number and due fee are pre-filled directly into WhatsApp. You only have to hit <strong>Send</strong>!
              </div>
            )}

            {/* Overdue Students List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', marginBottom: '20px' }}>
              {waBatchQueue.map((item) => (
                <div
                  key={item.member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: item.sent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${item.sent ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggleSelectOne(item.member.id)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#FFFFFF' }}>
                        {item.member.fullName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Fee: ₹{item.member.monthlyFee || 1200} • Due: {item.member.feeDueDate || 'Overdue'} • Phone: <strong style={{ color: '#93C5FD' }}>{item.phone || 'No phone'}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.sent ? (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: '#34D399',
                          fontWeight: '700',
                          padding: '6px 12px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          borderRadius: 'var(--radius-pill)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ✓ WhatsApp Opened
                      </span>
                    ) : item.waUrl ? (
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          window.open(item.waUrl, '_blank');
                          setWaBatchQueue((prev) =>
                            prev
                              ? prev.map((q) => (q.member.id === item.member.id ? { ...q, sent: true } : q))
                              : null
                          );
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: '700' }}
                      >
                        📱 Open Chat
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No Phone</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setWaBatchQueue(null)}
                style={{ padding: '9px 20px', fontSize: '0.88rem' }}
              >
                {dispatchComplete ? 'Done / Close' : 'Cancel'}
              </button>

              <button
                type="button"
                className="btn-gold"
                disabled={isDispatching || waBatchQueue.filter((q) => q.selected).length === 0}
                onClick={handleExecuteSendAllReminders}
                style={{
                  padding: '10px 24px',
                  fontSize: '0.92rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: waBatchQueue.filter((q) => q.selected).length === 0 ? 0.5 : 1,
                }}
              >
                <Bell size={16} />
                {isDispatching
                  ? 'Dispatching Reminders...'
                  : `Send Reminders to All Selected (${waBatchQueue.filter((q) => q.selected).length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD NEW CAROUSEL PHOTO (STRICT MAX 8 ENFORCEMENT) */}
      {showAddPhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={20} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                  Upload Carousel Photo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: '1.5', marginBottom: '18px' }}>
              Slot {carouselPhotos.length + 1} of 8. The uploaded photo is permanently saved as a Base64 Data URL, so it remains on the website even if you delete the original file from your computer or phone.
            </p>

            {photoUploadError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
                {photoUploadError}
              </div>
            )}

            <form onSubmit={handleSaveNewPhoto}>
              <div className="form-group">
                <label className="form-label">Select Photo File from Device *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadPhotoFile(e, false)}
                  className="form-input"
                  style={{ padding: '8px' }}
                  required
                />
              </div>

              {newPhotoBase64 && (
                <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-gold)', maxHeight: '200px' }}>
                  <img src={newPhotoBase64} alt="Preview" style={{ width: '100%', height: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Photo Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  placeholder="e.g. Modern Silent Study Bay"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Caption / Description *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="e.g. Individual focus cabins with power sockets and reading spotlight"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={uploadingPhoto || !newPhotoBase64}
                  style={{ flex: 1, padding: '10px', fontWeight: '700' }}
                >
                  {uploadingPhoto ? 'Saving to Website...' : 'Save & Publish to Carousel'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowAddPhotoModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPLACE / EDIT CAROUSEL PHOTO */}
      {showReplacePhotoModal && targetPhotoForReplace && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={20} />
                </div>
                <h3 style={{ fontSize: '1.3rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                  Replace / Edit Slide #{targetPhotoForReplace.order}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReplacePhotoModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.3rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {photoUploadError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#FCA5A5', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px' }}>
                {photoUploadError}
              </div>
            )}

            <form onSubmit={handleSaveReplacePhoto}>
              <div style={{ marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', maxHeight: '180px' }}>
                <img
                  src={replacePhotoBase64 || getAssetUrl(targetPhotoForReplace.src)}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Choose New Photo File (Leave blank to keep existing image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadPhotoFile(e, true)}
                  className="form-input"
                  style={{ padding: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Photo Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={replacePhotoTitle}
                  onChange={(e) => setReplacePhotoTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Caption / Description *</label>
                <input
                  type="text"
                  className="form-input"
                  value={replacePhotoCaption}
                  onChange={(e) => setReplacePhotoCaption(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={uploadingPhoto}
                  style={{ flex: 1, padding: '10px', fontWeight: '700' }}
                >
                  {uploadingPhoto ? 'Saving Replacement...' : 'Save Updates'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowReplacePhotoModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CAROUSEL PHOTO CONFIRMATION */}
      {showDeletePhotoModal && targetPhotoForDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                <Trash2 size={20} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: 0, fontWeight: '800' }}>
                Delete Carousel Photo
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Are you sure you want to delete slide #{targetPhotoForDelete.order}?
            </p>

            <div style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <div style={{ fontWeight: '700', color: '#FFFFFF', fontSize: '0.92rem' }}>
                {targetPhotoForDelete.title}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {targetPhotoForDelete.caption}
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '20px', fontSize: '0.82rem', color: '#A7F3D0' }}>
              ✓ Deleting this photo will free up a slot (count will become {carouselPhotos.length - 1}/8), allowing you to upload a new photo.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setShowDeletePhotoModal(false)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDeletePhoto}
                style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: '700' }}
              >
                Yes, Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PHONE OTP PASSWORD RESET MODAL */}
      <PasswordResetModal
        isOpen={showAdminResetModal}
        role="admin"
        initialPhone={cleanAdminPhone}
        onClose={() => setShowAdminResetModal(false)}
        onSuccess={() => {
          setShowAdminResetModal(false);
          alert('Administrator credentials updated successfully!');
        }}
      />
    </div>
  );
};
