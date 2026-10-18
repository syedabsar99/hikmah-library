import React, { useState } from 'react';
import { BookOpen, MapPin, Phone, Mail, Clock, ShieldCheck, MessageCircle } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { FacebookIcon } from './FacebookIcon';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/assets';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [imgError, setImgError] = useState(false);
  const { adminPhone, adminEmail } = useAuth();
  const cleanPhone = (adminPhone || '9622497806').replace(/[^0-9]/g, '');
  const displayPhone = adminPhone.startsWith('+') ? adminPhone : `+91 ${adminPhone}`;
  const contactEmail = adminEmail || 'syedabsar99@gmail.com';

  return (
    <footer className="app-footer">
      <div className="container footer-container">
        <div className="footer-grid">
          
          {/* Col 1: Brand & Philosophy */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div className="logo-icon-box" style={{ width: '36px', height: '36px' }}>
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="footer-brand-title">HIKMAH LIBRARY</h3>
                <div className="footer-brand-sub">
                  Where Wisdom Meets Focus
                </div>
              </div>
            </div>
            <p className="footer-text">
              A premium, disciplined sanctuary engineered for competitive exam aspirants, research scholars, and university students seeking absolute focus and intellectual mastery.
            </p>
          </div>

          {/* Col 2: Library Operations & Access */}
          <div>
            <h4 className="footer-heading">
              <Clock size={16} color="var(--accent-gold)" /> Library Operations &amp; Access
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0, margin: 0 }}>
              <li className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                <span style={{ color: '#E2E8F0' }}>Access Hours:</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: '700' }}>24 Hours • 7 Days a Week</span>
              </li>
              <li className="footer-text" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                <span style={{ color: '#E2E8F0' }}>Desk Allocation:</span>
                <span style={{ color: '#FDE68A' }}>Dedicated Assigned Desk</span>
              </li>
              <li style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Operational &amp; Closure Notices:</span>
                <span className="footer-text" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                  Temporary off days and holiday notices are posted directly by administration on the homepage notice board.
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Administration */}
          <div>
            <h4 className="footer-heading">
              <Phone size={16} color="var(--accent-gold)" /> Official Administration
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="footer-link-item">
                <MapPin size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                <span className="footer-text">Hib Complex, Near New Hospital, Opp. Jamia Masjid, Soibugh, Budgam (PIN: 191111)</span>
              </div>
              <div className="footer-link-item">
                <Phone size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                <a href={`tel:${cleanPhone}`} className="footer-text" style={{ color: '#E2E8F0', textDecoration: 'none' }}>
                  {displayPhone}
                </a>
              </div>
              <div className="footer-link-item">
                <MessageCircle size={16} style={{ color: '#25D366', flexShrink: 0 }} />
                <a href={`https://wa.me/91${cleanPhone.slice(-10)}`} target="_blank" rel="noreferrer" style={{ color: '#25D366', textDecoration: 'none', fontWeight: '600' }} className="footer-text">
                  WhatsApp: {displayPhone}
                </a>
              </div>
              <div className="footer-link-item">
                <Mail size={16} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                <a href={`mailto:${contactEmail}`} className="footer-text" style={{ color: '#E2E8F0', textDecoration: 'none' }}>
                  {contactEmail}
                </a>
              </div>
              <div className="footer-link-item">
                <InstagramIcon size={16} style={{ color: '#E1306C', flexShrink: 0 }} />
                <a
                  href="https://www.instagram.com/hikmahlibraryandstudyhall/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#F472B6', textDecoration: 'none', fontWeight: '600' }}
                  className="footer-text"
                >
                  @hikmahlibraryandstudyhall
                </a>
              </div>
            </div>
          </div>

          {/* Col 4: Quick Portals & Secure System */}
          <div>
            <h4 className="footer-heading">
              <ShieldCheck size={16} color="var(--accent-gold)" /> Secure Systems
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => onNavigate('member-login')}
                className="footer-nav-btn"
              >
                → Member Self-Service Portal
              </button>
              <button
                onClick={() => onNavigate('admin-login')}
                className="footer-nav-btn"
              >
                → Authorized Administration Console
              </button>
              <button
                onClick={() => {
                  onNavigate('home');
                  setTimeout(() => {
                    const el = document.getElementById('rules');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="footer-nav-btn"
              >
                → Disciplinary 10-Warning Code
              </button>
              <div style={{ marginTop: '8px', fontSize: '0.74rem', color: '#64748B', lineHeight: '1.4' }}>
                ⚡ 100% Free Tier Cloud Architecture: Cloudflare Pages + Firebase Spark Engine.
              </div>
            </div>
          </div>
        </div>

        {/* DEVELOPER PROFILE CREDIT SECTION */}
        <div className="footer-dev-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
            {/* Developer Avatar */}
            <div className="footer-dev-avatar">
              {!imgError ? (
                <img
                  src={getAssetUrl('/images/syed_absar.jpg')}
                  alt="Syed Absar"
                  onError={() => setImgError(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 15%',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--accent-gold) 0%, #997312 100%)',
                    color: 'var(--primary-navy)',
                    fontWeight: '800',
                    fontSize: '1rem',
                  }}
                >
                  SA
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="footer-dev-tag">
                System Architecture &amp; Full-Stack Development
              </div>
              <div className="footer-dev-name" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  Designed &amp; Developed by{' '}
                  <span
                    style={{
                      color: '#FACC15',
                      fontWeight: '900',
                      letterSpacing: '0.02em',
                      textShadow: '0 0 16px rgba(250, 204, 21, 0.55), 0 0 3px #FACC15',
                    }}
                  >
                    Syed Absar
                  </span>
                </span>
                <span className="footer-dev-socials" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '2px' }}>
                  <a
                    href="https://www.instagram.com/syednoorulabsar/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram - @syednoorulabsar"
                    aria-label="Instagram Profile"
                    className="dev-social-icon-btn instagram"
                  >
                    <InstagramIcon size={14} />
                  </a>
                  <a
                    href="https://www.facebook.com/syedabsar99"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook - @syedabsar99"
                    aria-label="Facebook Profile"
                    className="dev-social-icon-btn facebook"
                  >
                    <FacebookIcon size={14} />
                  </a>
                </span>
              </div>
              <div className="footer-dev-role">
                Web Developer
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="footer-bottom-bar">
          <div>
            © {new Date().getFullYear()} Hikmah Library and Study Lounge. All rights reserved.
          </div>
          <div className="footer-bottom-badges">
            <span>E2E Encrypted Member Chat</span>
            <span>•</span>
            <span>Zero Administrative Snooping</span>
            <span>•</span>
            <span>Spark Free Cloud</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
