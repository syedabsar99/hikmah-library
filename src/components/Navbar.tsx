import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Shield, User, LogOut, Menu, X, Phone, MessageCircle, Mail, ChevronDown, MapPin } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { currentUser, isAdmin, isMember, logout, adminPhone, adminEmail } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);

  const cleanPhone = (adminPhone || '7006523332').replace(/[^0-9]/g, '');
  const contactEmail = adminEmail || 'hikmahlibrary6@gmail.com';

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
    setShowContactDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target as Node)) {
        setShowContactDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <nav className="app-navbar">
      <div className="container nav-wrapper">
        {/* Brand / Logo */}
        <div className="logo-brand" onClick={() => handleNav('home')}>
          <div className="logo-icon-box">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="brand-title">HIKMAH LIBRARY</div>
            <div className="brand-tagline">Where Wisdom Meets Focus</div>
          </div>
        </div>

        {/* Desktop Center: Home */}
        <div className="nav-center-desktop">
          <button
            id="nav-home-btn"
            type="button"
            onClick={() => handleNav('home')}
            className={`nav-home-link ${currentView === 'home' ? 'active' : ''}`}
            title="Navigate to Home"
          >
            Home
          </button>
        </div>

        {/* Right Section: Contact Us dropdown + Action links + Mobile Menu Toggle */}
        <div className="nav-right-area">
          {/* Single "Contact Us" Dropdown Button */}
          <div className="nav-contact-dropdown-container" ref={contactDropdownRef}>
            <button
              id="nav-contact-us-btn"
              type="button"
              className="nav-contact-btn"
              onClick={() => setShowContactDropdown(!showContactDropdown)}
              aria-expanded={showContactDropdown}
              title="Contact Hikmah Library administration"
            >
              <Phone className="contact-btn-icon" size={14} style={{ color: 'var(--accent-gold)' }} />
              <span className="contact-btn-text">Contact Us</span>
              <ChevronDown
                size={13}
                style={{
                  transform: showContactDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {showContactDropdown && (
              <div className="nav-contact-dropdown-menu">
                <div className="nav-contact-header">
                  <div style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '0.92rem' }}>
                    Contact Administration
                  </div>
                  <div style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: '600' }}>
                    Soibugh, Budgam • 24/7 Operations
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <a
                    href="https://wa.me/917006523332"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}>
                      <MessageCircle size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>WhatsApp Support</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>+91 70065 23332 • Quick Reply</div>
                    </div>
                  </a>

                  <a
                    href="tel:7006523332"
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D' }}>
                      <Phone size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Helpline (Primary)</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', fontWeight: '700' }}>+91 70065 23332</div>
                    </div>
                  </a>

                  <a
                    href="tel:7889527218"
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D' }}>
                      <Phone size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Administration Desk</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>+91 78895 27218</div>
                    </div>
                  </a>

                  <a
                    href="tel:9599891661"
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#FCD34D' }}>
                      <Phone size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Administration Desk</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>+91 95998 91661</div>
                    </div>
                  </a>

                  <a
                    href="https://www.instagram.com/hikmahlibraryandstudyhall/"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(244, 114, 182, 0.15)', color: '#F472B6' }}>
                      <InstagramIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Instagram</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>@hikmahlibraryandstudyhall</div>
                    </div>
                  </a>

                  <a
                    href={`mailto:${contactEmail}`}
                    className="nav-contact-item"
                    onClick={() => setShowContactDropdown(false)}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(147, 197, 253, 0.15)', color: '#93C5FD' }}>
                      <Mail size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Official Email</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{contactEmail}</div>
                    </div>
                  </a>

                  <div
                    className="nav-contact-item"
                    style={{ cursor: 'default', background: 'rgba(255, 255, 255, 0.02)' }}
                  >
                    <div className="nav-contact-icon-box" style={{ background: 'rgba(212, 175, 55, 0.12)', color: 'var(--accent-gold)' }}>
                      <MapPin size={17} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>Library Location</div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Main Chowk, Soibugh, Budgam</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Nav Actions */}
          <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isAdmin && (
              <button
                id="nav-admin-console-btn"
                className="btn-gold"
                onClick={() => handleNav('admin-dashboard')}
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
              >
                <Shield size={16} /> Admin Console
              </button>
            )}

            {isMember && (
              <button
                id="nav-member-portal-btn"
                className="btn-gold"
                onClick={() => handleNav('member-portal')}
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
              >
                <User size={16} /> Member Portal
              </button>
            )}

            {currentUser ? (
              <button
                id="nav-logout-btn"
                className="btn-outline"
                onClick={logout}
                title="Sign out of account"
                style={{ padding: '8px 14px', fontSize: '0.88rem', background: 'transparent', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.3)' }}
              >
                <LogOut size={16} /> Logout
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  id="nav-member-login-btn"
                  className="btn-outline"
                  onClick={() => handleNav('member-login')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.88rem',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#FFFFFF',
                    borderColor: 'rgba(212,175,55,0.4)',
                  }}
                >
                  <User size={16} style={{ color: 'var(--accent-gold)' }} /> Member Sign In
                </button>
                <button
                  id="nav-admin-login-btn"
                  className="btn-gold"
                  onClick={() => handleNav('admin-login')}
                  style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                >
                  <Shield size={16} /> Admin Login
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle - ONLY on mobile */}
          <button
            className="mobile-menu-btn"
            style={{ display: 'none' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            background: 'var(--primary-navy)',
            borderTop: '1px solid rgba(212,175,55,0.2)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Mobile Admin Contact Links */}
          <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: '700', marginBottom: '8px' }}>
              Administration Helpdesk &amp; Social
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a
                href="https://www.instagram.com/hikmahlibraryandstudyhall/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  background: 'rgba(244, 114, 182, 0.12)',
                  color: '#F472B6',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                <InstagramIcon size={14} /> Instagram
              </a>
              <a
                href={`https://wa.me/91${cleanPhone.slice(-10)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  background: 'rgba(52, 211, 153, 0.12)',
                  color: '#34D399',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a
                href={`tel:${cleanPhone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#FCD34D',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                <Phone size={14} /> Helpline
              </a>
              <a
                href={`mailto:${contactEmail}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 10px',
                  background: 'rgba(147, 197, 253, 0.12)',
                  color: '#93C5FD',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                }}
              >
                <Mail size={14} /> Email
              </a>
            </div>
          </div>

          <button
            onClick={() => handleNav('home')}
            style={{ textAlign: 'left', color: '#FFFFFF', fontSize: '1rem', padding: '8px 0' }}
          >
            Home
          </button>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          {isAdmin ? (
            <button
              className="btn-gold"
              onClick={() => handleNav('admin-dashboard')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Shield size={18} /> Admin Dashboard
            </button>
          ) : isMember ? (
            <button
              className="btn-gold"
              onClick={() => handleNav('member-portal')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <User size={18} /> Member Portal
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                id="mobile-nav-member-login-btn"
                className="btn-primary"
                onClick={() => handleNav('member-login')}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1E3E62 0%, #0F172A 100%)',
                  border: '1.5px solid rgba(212, 175, 55, 0.5)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.94rem',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <User size={18} style={{ color: 'var(--accent-gold)' }} />
                <span>Member Sign In</span>
              </button>
              <button
                id="mobile-nav-admin-login-btn"
                className="btn-gold"
                onClick={() => handleNav('admin-login')}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px 18px',
                  fontSize: '0.94rem',
                  fontWeight: '700',
                }}
              >
                <Shield size={18} /> Admin Login
              </button>
            </div>
          )}

          {currentUser && (
            <button
              className="btn-danger"
              onClick={logout}
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
};
