import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Zap,
  VolumeX,
  Coffee,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  BookOpen,
  MapPin,
  Flame,
  Award,
  Plus,
  X,
  Phone,
  Settings,
  ChevronLeft,
  ChevronRight,
  Camera,
  MessageCircle,
  Mail,
  Trash2,
  Bell,
} from 'lucide-react';
import { InstagramIcon } from '../components/InstagramIcon';
import { useAuth } from '../context/AuthContext';
import { DataService, INITIAL_CAROUSEL_PHOTOS } from '../services/dataService';
import { getAssetUrl } from '../utils/assets';
import type { Announcement, LibraryFacility, LibraryRule, CarouselPhoto } from '../types';

interface PublicHomeProps {
  onNavigate: (view: string) => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({ onNavigate }) => {
  const { isAdmin, adminPhone, adminEmail } = useAuth();
  const cleanPhone = (adminPhone || '9622497806').replace(/[^0-9]/g, '');
  const displayPhone = adminPhone.startsWith('+') ? adminPhone : `+91 ${adminPhone}`;
  const contactEmail = adminEmail || 'syedabsar99@gmail.com';
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [facilities, setFacilities] = useState<LibraryFacility[]>([]);
  const [rules, setRules] = useState<LibraryRule[]>([]);
  const [carouselPhotos, setCarouselPhotos] = useState<CarouselPhoto[]>(INITIAL_CAROUSEL_PHOTOS);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ src: string; title: string; desc: string } | null>(null);

  useEffect(() => {
    DataService.getAnnouncements().then(setAnnouncements);
    DataService.getFacilities().then(setFacilities);
    DataService.getRules().then(setRules);
    DataService.getCarouselPhotos().then((photos) => {
      if (photos && photos.length > 0) {
        setCarouselPhotos(photos);
      }
    });
  }, []);

  const [showQuickPostModal, setShowQuickPostModal] = useState(false);
  const [quickNoticeText, setQuickNoticeText] = useState('');
  const [postingNotice, setPostingNotice] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState<{ id: string; title: string } | null>(null);

  const confirmDeleteNotice = async () => {
    if (!isAdmin) {
      setNoticeToDelete(null);
      alert('Access Denied: Notices can strictly be removed by the Administrator only.');
      return;
    }
    if (!noticeToDelete) return;
    const targetId = noticeToDelete.id;
    // Optimistic UI update
    setAnnouncements((prev) => prev.filter((a) => a.id !== targetId));
    setNoticeToDelete(null);
    try {
      await DataService.deleteAnnouncement(targetId, 'Chief Librarian');
      const updated = await DataService.getAnnouncements();
      setAnnouncements(updated);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const handleQuickPostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoticeText.trim()) return;
    setPostingNotice(true);
    try {
      await DataService.addAnnouncement(
        {
          title: quickNoticeText.trim(),
          content: quickNoticeText.trim(),
          category: 'General News',
          isPinned: false,
          publishedBy: 'Chief Librarian',
        },
        'Chief Librarian'
      );
      setQuickNoticeText('');
      setShowQuickPostModal(false);
      const updated = await DataService.getAnnouncements();
      setAnnouncements(updated);
    } catch {
      // fallback
    } finally {
      setPostingNotice(false);
    }
  };

  // Clean notice text: simple plain English without subjects
  const getNoticeText = (item: Announcement) => {
    if (!item.title && !item.content) return '';
    if (!item.content) return item.title.replace(/^SUBJECT:\s*/i, '').trim();
    if (!item.title) return item.content.trim();
    if (item.title === item.content) return item.title.replace(/^SUBJECT:\s*/i, '').trim();
    const cleanTitle = item.title.replace(/^SUBJECT:\s*/i, '').trim();
    if (cleanTitle && item.content && !item.content.includes(cleanTitle)) {
      return `${cleanTitle} — ${item.content}`;
    }
    return item.content.trim();
  };

  // Format date and time stamp clearly
  const formatNoticeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today at ${timeStr}`;
      }
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${timeStr}`;
      }
      return `${d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })} at ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  // Always sorted strictly by latest first
  const sortedNotices = [...announcements].sort((a, b) => {
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });


  // Helper to dynamically render facility icons
  const renderFacilityIcon = (iconName: string) => {
    const size = 26;
    const color = 'var(--accent-gold)';
    switch (iconName) {
      case 'VolumeX':
        return <VolumeX size={size} color={color} />;
      case 'Wifi':
        return <Wifi size={size} color={color} />;
      case 'Zap':
        return <Zap size={size} color={color} />;
      case 'Sparkles':
        return <Sparkles size={size} color={color} />;
      case 'Clock':
        return <Clock size={size} color={color} />;
      case 'ShieldCheck':
        return <ShieldCheck size={size} color={color} />;
      case 'Coffee':
        return <Coffee size={size} color={color} />;
      case 'BookOpen':
        return <BookOpen size={size} color={color} />;
      case 'MapPin':
        return <MapPin size={size} color={color} />;
      case 'Award':
      default:
        return <Award size={size} color={color} />;
    }
  };

  // Typewriter animation for library name in hero
  const fullHeroTitle = 'Hikmah Library & Study Lounge';
  const [typedTitleCount, setTypedTitleCount] = useState(0);
  const [isDeletingTitle, setIsDeletingTitle] = useState(false);

  useEffect(() => {
    let timeout: any;
    if (!isDeletingTitle && typedTitleCount < fullHeroTitle.length) {
      timeout = setTimeout(() => {
        setTypedTitleCount((prev) => prev + 1);
      }, 70);
    } else if (!isDeletingTitle && typedTitleCount === fullHeroTitle.length) {
      timeout = setTimeout(() => {
        setIsDeletingTitle(true);
      }, 4200);
    } else if (isDeletingTitle && typedTitleCount > 0) {
      timeout = setTimeout(() => {
        setTypedTitleCount((prev) => prev - 1);
      }, 35);
    } else if (isDeletingTitle && typedTitleCount === 0) {
      timeout = setTimeout(() => {
        setIsDeletingTitle(false);
      }, 600);
    }
    return () => clearTimeout(timeout);
  }, [typedTitleCount, isDeletingTitle, fullHeroTitle.length]);

  // Auto-moving picture carousel (runs continuously every 4 seconds, pauses on hover)
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const photoCount = carouselPhotos.length || 1;
  const safeCarouselIndex = carouselIndex % photoCount;

  useEffect(() => {
    if (carouselPhotos.length <= 1 || isCarouselHovered) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselPhotos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [carouselPhotos.length, isCarouselHovered]);

  const prevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + carouselPhotos.length) % carouselPhotos.length);
  };

  const nextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % carouselPhotos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45) {
      nextSlide();
    } else if (diff < -45) {
      prevSlide();
    }
    setTouchStartX(null);
  };

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          position: 'relative',
          padding: '100px 0 95px 0',
          borderBottom: '1px solid var(--border-subtle)',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '920px', margin: '0 auto', textAlign: 'center' }}>
            {/* Tagline Badge */}
            <div className="hero-wisdom-badge">
              <Sparkles size={16} color="var(--accent-gold)" /> WHERE WISDOM MEETS FOCUS
            </div>

            {/* PRESTIGE ANIMATED HERO TITLE WITH TYPEWRITER ANIMATION & GLOW ORB */}
            <div className="hero-title-container">
              <div className="hero-title-glow-orb" />
              <h1 className="hero-title-epic" aria-label="Hikmah Library & Study Lounge">
                {typedTitleCount <= 16 ? (
                  <span>{fullHeroTitle.slice(0, typedTitleCount)}</span>
                ) : (
                  <>
                    <span>{fullHeroTitle.slice(0, 16)}</span>
                    <span className="hero-title-gold-accent">
                      {fullHeroTitle.slice(16, typedTitleCount)}
                    </span>
                  </>
                )}
                <span className="hero-typewriter-cursor">|</span>
              </h1>
              {/* Golden Ornamental Divider */}
              <div className="hero-title-ornament">
                <span className="hero-ornament-line" />
                <span className="hero-ornament-diamond" />
                <span className="hero-ornament-line" />
              </div>
            </div>

            <p
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                marginBottom: '36px',
                maxWidth: '780px',
                margin: '0 auto 36px auto',
              }}
            >
              A premier <strong>24/7 round-the-clock</strong> distraction-free sanctuary in Soibugh, Budgam.
              Equipped with fully air-conditioned study halls, private focus cubicles with individual lighting &amp; power sockets,
              300 Mbps high-speed Wi-Fi, and <strong>zero shift restrictions</strong> — enter and leave whenever you want.
            </p>

            {/* Quick Portal Action Buttons */}
            <div className="hero-buttons-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
              <button
                id="hero-member-portal-btn"
                className="btn-gold"
                onClick={() => onNavigate('member-login')}
                style={{ padding: '15px 32px', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <UserCheck size={20} /> Member Portal Sign In
              </button>

              <button
                id="hero-admin-login-btn"
                className="btn-primary"
                onClick={() => onNavigate('admin-login')}
                style={{ padding: '15px 32px', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ShieldCheck size={20} /> Administrator Login
              </button>
            </div>

            {/* Micro Highlights Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                marginTop: '55px',
                textAlign: 'center',
              }}
            >
              {[
                { number: '24 / 7', label: 'Zero Shifts • Free Entry & Exit' },
                { number: '100%', label: 'Private Study Cabins' },
                { number: '300 Mbps', label: 'Dual Band Fiber Wi-Fi' },
                { number: '10-Point', label: 'Strict Disciplinary Code' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card"
                  style={{
                    padding: '20px 16px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ color: 'var(--accent-gold)', fontSize: '1.75rem', fontWeight: '800' }}>
                    {item.number}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. NOTICES AND INFORMATION (SINGLE CARD WITH BULLET POINTS SORTED BY LATEST) */}
      <section
        id="bulletins"
        style={{
          padding: '60px 0 50px 0',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
        }}
      >
        <div className="container" style={{ maxWidth: '960px' }}>
          {/* SINGLE CARD: NOTICES AND INFORMATION */}
          <div
            className="glass-dark"
            style={{
              background: 'linear-gradient(135deg, rgba(11, 20, 38, 0.96) 0%, rgba(15, 27, 51, 0.96) 100%)',
              border: '1.5px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '20px',
              padding: '30px 34px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(212, 175, 55, 0.08)',
            }}
          >
            {/* CARD HEADER */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                paddingBottom: '20px',
                borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
                marginBottom: '22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.4)',
                    color: 'var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <Bell size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2
                      style={{
                        fontSize: '1.55rem',
                        color: '#FFFFFF',
                        fontWeight: '800',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Notices and Information
                    </h2>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#6EE7B7',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#10B981',
                          boxShadow: '0 0 6px #10B981',
                        }}
                      />
                      Live
                    </span>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                    Official announcements and daily updates from library administration
                  </p>
                </div>
              </div>

              {/* ACTION: Post notice for Admin */}
              {isAdmin && (
                <button
                  onClick={() => setShowQuickPostModal(true)}
                  className="btn-gold"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  <Plus size={15} /> Post New Notice
                </button>
              )}
            </div>

            {/* QUICK POST NOTICE MODAL / FORM (FOR ADMIN) */}
            {isAdmin && showQuickPostModal && (
              <form
                onSubmit={handleQuickPostNotice}
                style={{
                  background: 'rgba(0, 0, 0, 0.45)',
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: '12px',
                  padding: '18px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.92rem', color: 'var(--accent-gold)', fontWeight: '700' }}>
                    Post Simple Notice (e.g. "Library is off today", "Drinking water is not available")
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickPostModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={quickNoticeText}
                  onChange={(e) => setQuickNoticeText(e.target.value)}
                  placeholder="Enter notice text here..."
                  required
                  autoFocus
                  style={{ marginBottom: '12px', background: 'rgba(255, 255, 255, 0.06)', color: '#FFFFFF' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowQuickPostModal(false)}
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={postingNotice || !quickNoticeText.trim()}
                    style={{ padding: '6px 18px', fontSize: '0.82rem', fontWeight: '700' }}
                  >
                    {postingNotice ? 'Posting...' : 'Publish Notice'}
                  </button>
                </div>
              </form>
            )}

            {/* BULLET POINTS LIST - SORTED BY LATEST FIRST */}
            {sortedNotices.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
                <p style={{ margin: 0, fontSize: '0.92rem' }}>No current notices. Check back later for updates.</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {sortedNotices.map((item, idx) => {
                  const noticeText = getNoticeText(item);
                  const isLast = idx === sortedNotices.length - 1;

                  return (
                    <li
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '16px 12px',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                        transition: 'background 0.2s',
                        borderRadius: '8px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* GOLD BULLET POINT DOT */}
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                          boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)',
                          flexShrink: 0,
                          marginTop: '8px',
                        }}
                      />

                      {/* NOTICE CONTENT + DATE/TIME STAMP */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#F8FAFC',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            fontWeight: '500',
                            wordBreak: 'break-word',
                          }}
                        >
                          {noticeText}
                        </div>

                        {/* DATE AND TIME STAMP */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#94A3B8',
                            fontSize: '0.78rem',
                            marginTop: '6px',
                            fontWeight: '500',
                          }}
                        >
                          <Clock size={12} style={{ color: 'var(--accent-gold)' }} />
                          <span>{formatNoticeTime(item.publishedAt)}</span>
                        </div>
                      </div>

                      {/* ADMIN DELETE BUTTON */}
                      {isAdmin && (
                        <button
                          onClick={() => setNoticeToDelete({ id: item.id, title: noticeText })}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            opacity: 0.7,
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                          title="Delete notice"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* DELETE NOTICE IN-APP CONFIRMATION MODAL - Strictly Admin Only */}
            {isAdmin && noticeToDelete && (
              <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                      <Trash2 size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', margin: 0, fontWeight: '700' }}>
                      Delete Notice
                    </h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '18px' }}>
                    Are you sure you want to remove this notice?
                  </p>
                  <div style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '20px', color: '#F8FAFC', fontSize: '0.9rem' }}>
                    "{noticeToDelete.title}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setNoticeToDelete(null)}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={confirmDeleteNotice}
                      style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      Yes, Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. CAMPUS PHOTO CAROUSEL */}
      <section
        id="campus-carousel"
        style={{
          padding: '80px 0',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        <div className="container">
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 36px auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-gold)',
                fontWeight: '700',
                fontSize: '0.84rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              <Camera size={16} /> Campus Visual Tour
            </div>
            <h2 style={{ fontSize: '2.4rem', marginBottom: '10px', fontWeight: '800' }}>
              Life Inside <span style={{ color: 'var(--accent-gold)' }}>Hikmah Library</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: 0 }}>
              Authentic view of our climate-controlled cabins, ergonomic seating, and distraction-free study environment.
            </p>
          </div>

          {/* Carousel Frame - Auto Moving */}
          <div
            style={{
              maxWidth: '1060px',
              margin: '0 auto',
              position: 'relative',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseEnter={() => setIsCarouselHovered(true)}
            onMouseLeave={() => setIsCarouselHovered(false)}
          >
            {/* Viewport with rounded corners & gold glow */}
            <div
              style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                background: '#070A10',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                boxShadow: '0 20px 45px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.08)',
                aspectRatio: '16 / 9',
                maxHeight: '540px',
                minHeight: '320px',
              }}
            >
              {/* Sliding Track */}
              <div
                style={{
                  display: 'flex',
                  width: `${photoCount * 100}%`,
                  height: '100%',
                  transform: `translateX(-${(safeCarouselIndex * 100) / photoCount}%)`,
                  transition: 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {carouselPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    style={{
                      width: `${100 / photoCount}%`,
                      height: '100%',
                      position: 'relative',
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                    onClick={() => setLightboxPhoto({ src: getAssetUrl(photo.src), title: photo.title, desc: photo.caption })}
                  >
                    <img
                      src={getAssetUrl(photo.src)}
                      alt={photo.caption}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={() => {
                        console.warn(`Carousel photo failed to load: ${photo.src}`);
                      }}
                    />

                    {/* Gradient Overlay at Bottom with concise text */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '45%',
                        background: 'linear-gradient(to top, rgba(4, 7, 13, 0.95) 0%, rgba(4, 7, 13, 0.65) 55%, transparent 100%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '24px 32px',
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          gap: '16px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: 'var(--accent-gold)',
                              boxShadow: '0 0 10px var(--accent-gold)',
                              flexShrink: 0,
                            }}
                          />
                          <p
                            style={{
                              color: '#FFFFFF',
                              fontSize: '1.18rem',
                              fontWeight: '600',
                              margin: 0,
                              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                              letterSpacing: '0.01em',
                            }}
                          >
                            {photo.caption}
                          </p>
                        </div>

                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.12)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#F8FAFC',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {index + 1} / {carouselPhotos.length}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prev Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="Previous Photo"
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(10, 15, 25, 0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-gold)';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(10, 15, 25, 0.75)';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <ChevronLeft size={24} />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="Next Photo"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(10, 15, 25, 0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 5,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-gold)';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(10, 15, 25, 0.75)';
                  e.currentTarget.style.color = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Bottom Dots Indicator Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '18px',
              }}
            >
              {carouselPhotos.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => setCarouselIndex(dotIdx)}
                  aria-label={`Go to slide ${dotIdx + 1}`}
                  style={{
                    height: '8px',
                    width: safeCarouselIndex === dotIdx ? '28px' : '8px',
                    borderRadius: 'var(--radius-pill)',
                    background: safeCarouselIndex === dotIdx ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.25)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. DYNAMIC BASIC FACILITIES & INFRASTRUCTURE (ADMIN CONTROLLED) */}
      <section
        id="facilities"
        style={{
          padding: '90px 0',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '45px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-gold)',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                }}
              >
                <Award size={16} /> World-Class Study Environment
              </div>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#FFFFFF', fontWeight: '800' }}>
                Basic Facilities &amp; <span style={{ color: 'var(--accent-gold)' }}>Infrastructure</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', maxWidth: '650px', margin: 0, lineHeight: '1.6' }}>
                Engineered to eliminate fatigue and ensure 24/7 academic comfort for serious competitive exam preparation.
              </p>
            </div>

            {isAdmin && (
              <button
                className="btn-gold"
                onClick={() => onNavigate('admin-dashboard')}
                style={{ padding: '10px 20px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Settings size={16} /> Manage Facilities (Admin Console)
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: '24px',
            }}
          >
            {facilities
              .filter((f) => f.isActive)
              .sort((a, b) => a.order - b.order)
              .map((facility) => (
                <div
                  key={facility.id}
                  className="glass-card"
                  style={{
                    padding: '30px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid var(--border-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '18px',
                      }}
                    >
                      {renderFacilityIcon(facility.iconName)}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#FFFFFF', fontWeight: '700' }}>
                      {facility.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      {facility.description}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* 5. DYNAMIC LIBRARY RULES & CODE OF CONDUCT (ALWAYS VISIBLE ON HOME PAGE) */}
      <section id="rules" style={{ padding: '90px 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '45px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#EF4444',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '10px',
                }}
              >
                <Flame size={16} /> Academic Discipline &amp; Decorum
              </div>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '8px', color: '#FFFFFF', fontWeight: '800' }}>
                Library Rules &amp; <span style={{ color: 'var(--accent-gold)' }}>Code of Conduct</span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', maxWidth: '650px', margin: 0, lineHeight: '1.6' }}>
                All registered members must uphold these standards to preserve our peaceful study atmosphere.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* Core Dynamic Rules Card */}
            <div
              className="glass-panel"
              style={{
                padding: '36px 30px',
                border: '1px solid var(--border-medium)',
              }}
            >
              <h3 style={{ fontSize: '1.35rem', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                <CheckCircle2 color="var(--status-paid)" /> Essential Library Norms
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '0.94rem' }}>
                {rules
                  .filter((r) => r.isActive)
                  .sort((a, b) => a.ruleNumber - b.ruleNumber)
                  .map((rule) => (
                    <li key={rule.id} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.82rem',
                          fontWeight: '800',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {rule.ruleNumber}
                      </span>
                      <div>
                        <strong style={{ color: '#FFFFFF', fontSize: '0.98rem' }}>{rule.title}: </strong>
                        <span style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{rule.description}</span>
                        {rule.consequence && (
                          <div style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>
                            ⚠️ Enforcement: {rule.consequence}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>

            {/* 10-Warning Policy Card */}
            <div
              className="glass-panel"
              style={{
                padding: '36px 30px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <h3 style={{ fontSize: '1.35rem', marginBottom: '16px', color: 'var(--accent-gold-light)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle color="var(--accent-gold)" /> Disciplinary 10-Warning System
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '20px' }}>
                Every student begins with a clean <strong>0/10</strong> record. Violations result in audited administrative warnings recorded in your private portal:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#FBBF24' }}>1 - 3 Warnings (Minor):</strong> Notification issued to member portal (e.g. phone ringtone or desk clutter).
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#F97316' }}>4 - 7 Warnings (Moderate):</strong> Mandatory counseling with library administration &amp; seat review.
                </div>
                <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: '#EF4444' }}>8 - 9 Warnings (Critical):</strong> Final formal watchlist notice before registration revocation.
                </div>
                <div style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', color: '#FCA5A5', fontWeight: '700' }}>
                  🚨 10/10 Warnings: Automatic registration review. Portal access revoked, workstation forfeited, and admission terminated.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DEDICATED ADMINISTRATION CONTACT SECTION */}
      <section
        id="contact"
        style={{
          padding: '85px 0',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(8, 12, 20, 0.95) 100%)',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-gold)',
                fontWeight: '700',
                fontSize: '0.84rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              <Phone size={16} /> Official Directorate Channels
            </div>
            <h2 style={{ fontSize: '2.4rem', color: '#FFFFFF', fontWeight: '800', marginBottom: '12px' }}>
              Administration &amp; <span style={{ color: 'var(--accent-gold)' }}>Contact Desk</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.65' }}>
              Direct access to library administration for admissions, vacant desk reservation, monthly fee clearance, and urgent inquiries.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '22px',
              marginBottom: '36px',
            }}
          >
            {/* 1. Instagram */}
            <div
              className="glass-card"
              style={{
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(244, 114, 182, 0.3)',
                background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.06) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #E1306C 0%, #F56040 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '18px',
                    boxShadow: '0 8px 20px rgba(225, 48, 108, 0.3)',
                  }}
                >
                  <InstagramIcon size={26} />
                </div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#F472B6', fontWeight: '700', letterSpacing: '0.06em' }}>
                  Official Instagram
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '6px 0 10px 0', fontWeight: '800' }}>
                  @hikmahlibraryandstudyhall
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
                  Follow our official Instagram for campus tour photos, facilities updates, and community announcements.
                </p>
              </div>
              <a
                href="https://www.instagram.com/hikmahlibraryandstudyhall/"
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(244, 114, 182, 0.15)',
                  border: '1px solid rgba(244, 114, 182, 0.4)',
                  color: '#F472B6',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                }}
              >
                <span>Visit Instagram Profile ↗</span>
              </a>
            </div>

            {/* 2. WhatsApp Direct */}
            <div
              className="glass-card"
              style={{
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.06) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: '#25D366',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '18px',
                    boxShadow: '0 8px 20px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <MessageCircle size={26} />
                </div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#34D399', fontWeight: '700', letterSpacing: '0.06em' }}>
                  Instant WhatsApp
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '6px 0 10px 0', fontWeight: '800' }}>
                  {displayPhone}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
                  Fastest response channel for seat reservation inquiries, fee slip verification, and student support.
                </p>
              </div>
              <a
                href={`https://wa.me/91${cleanPhone.slice(-10)}?text=Hello%20Hikmah%20Library%20Administration,%20I%20would%20like%20to%20inquire%20about%20admissions%20and%20seat%20availability.`}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: '#25D366',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)',
                }}
              >
                <span>Chat on WhatsApp ↗</span>
              </a>
            </div>

            {/* 3. Phone Helpline */}
            <div
              className="glass-card"
              style={{
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#080C14',
                    marginBottom: '18px',
                    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <Phone size={26} />
                </div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: '700', letterSpacing: '0.06em' }}>
                  Direct Helpline
                </div>
                <h3 style={{ fontSize: '1.15rem', color: '#FFFFFF', margin: '6px 0 10px 0', fontWeight: '800' }}>
                  {displayPhone}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
                  Speak directly with the Chief Librarian or administrative front desk for urgent queries and guidance.
                </p>
              </div>
              <a
                href={`tel:${cleanPhone}`}
                style={{
                  marginTop: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: 'var(--accent-gold)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                }}
              >
                <span>Call Administration Desk ↗</span>
              </a>
            </div>

            {/* 4. Official Email */}
            <div
              className="glass-card"
              style={{
                padding: '30px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid rgba(147, 197, 253, 0.3)',
                background: 'linear-gradient(135deg, rgba(147, 197, 253, 0.06) 0%, rgba(15, 23, 42, 0.8) 100%)',
              }}
            >
              <div>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: '18px',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <Mail size={26} />
                </div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#93C5FD', fontWeight: '700', letterSpacing: '0.06em' }}>
                  Official Email
                </div>
                <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', margin: '6px 0 10px 0', fontWeight: '800', wordBreak: 'break-all' }}>
                  {contactEmail}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.55', margin: 0 }}>
                  Formal inquiries, fee receipt submissions, account verifications, and institutional correspondence.
                </p>
              </div>
              <a
                href={`mailto:${contactEmail}`}
                style={{
                  marginTop: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#93C5FD',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                }}
              >
                <span>Send Official Email ↗</span>
              </a>
            </div>
          </div>

          {/* Location & Facility Access Strip */}
          <div
            style={{
              padding: '20px 28px',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MapPin size={22} color="var(--accent-gold)" />
              <div>
                <strong style={{ color: '#FFFFFF', fontSize: '0.92rem' }}>Physical Campus Location:</strong>{' '}
                <span style={{ color: '#CBD5E1', fontSize: '0.88rem' }}>
                  Hib Complex, Near New Hospital, Opp. Jamia Masjid, Soibugh, Budgam (PIN: 191111)
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
              <span style={{ color: '#10B981', fontWeight: '700' }}>● Open 24/7 Dedicated Access</span>
              <span style={{ color: '#64748B' }}>•</span>
              <span style={{ color: 'var(--accent-gold)' }}>Individual Cabins &amp; Lockers</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. LIGHTBOX PHOTO MODAL */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '100%',
              background: '#0B0F19',
              border: '1px solid var(--border-gold)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ position: 'relative', maxHeight: '550px', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={lightboxPhoto.src}
                alt={lightboxPhoto.title}
                style={{ width: '100%', maxHeight: '550px', objectFit: 'contain', display: 'block' }}
              />
              <button
                onClick={() => setLightboxPhoto(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#FFFFFF', marginBottom: '6px', fontWeight: '800' }}>
                {lightboxPhoto.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: '1.6' }}>
                {lightboxPhoto.desc}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
