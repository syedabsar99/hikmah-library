import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicHome } from './pages/PublicHome';
import { AdminLogin } from './pages/AdminLogin';
import { MemberLogin } from './pages/MemberLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { MemberPortal } from './pages/MemberPortal';
import { ResetPassword } from './pages/ResetPassword';

const isResetPasswordRoute = (): boolean => {
  try {
    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    return (
      pathname.includes('reset-password') ||
      search.has('oobCode') ||
      search.get('mode') === 'resetPassword' ||
      window.location.href.includes('reset-password') ||
      window.location.hash.includes('reset-password')
    );
  } catch {
    return false;
  }
};

const resolveInitialView = (): string => {
  if (isResetPasswordRoute()) {
    return 'reset-password';
  }
  try {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/admin/login') || path.includes('/admin/dashboard') || path.endsWith('/admin') || path.includes('/admin/')) {
      const savedAuth = sessionStorage.getItem('hikmah_auth_session_v2');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.role === 'admin') return 'admin-dashboard';
      }
      return 'admin-login';
    }
    if (path.includes('/student') || path.includes('/member')) {
      const savedAuth = sessionStorage.getItem('hikmah_auth_session_v2');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.role === 'member') return 'member-portal';
      }
      return 'member-login';
    }
  } catch {}
  return 'home';
};

const AppContent: React.FC = () => {
  const { isAdmin, isMember } = useAuth();
  const [currentView, setCurrentView] = useState<string>(() => resolveInitialView());

  // Listen for browser popstate or URL changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(resolveInitialView());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Synchronize browser address bar with active authenticated view
  useEffect(() => {
    try {
      const base = window.location.pathname.startsWith('/hikmah-library') ? '/hikmah-library' : '';
      if (currentView === 'admin-dashboard' && window.location.pathname.includes('/login')) {
        window.history.replaceState(null, '', `${base}/admin`);
      } else if (currentView === 'member-portal' && window.location.pathname.includes('/login')) {
        window.history.replaceState(null, '', `${base}/student/portal`);
      }
    } catch {}
  }, [currentView]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    try {
      const base = window.location.pathname.startsWith('/hikmah-library') ? '/hikmah-library' : '';
      if (view === 'home' || view === 'facilities' || view === 'gallery' || view === 'rules') {
        window.history.pushState(null, '', `${base}/`);
      } else if (view === 'admin-login') {
        window.history.pushState(null, '', `${base}/admin/login`);
      } else if (view === 'admin-dashboard') {
        window.history.pushState(null, '', `${base}/admin`);
      } else if (view === 'member-login') {
        window.history.pushState(null, '', `${base}/student/login`);
      } else if (view === 'member-portal') {
        window.history.pushState(null, '', `${base}/student/portal`);
      } else if (view === 'reset-password') {
        window.history.pushState(null, '', `${base}/reset-password`);
      }
    } catch {
      // fallback
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route protection
  if (currentView === 'admin-dashboard' && !isAdmin) {
    return <AdminLogin onNavigate={handleNavigate} onSuccess={() => setCurrentView('admin-dashboard')} />;
  }

  if (currentView === 'member-portal' && !isMember) {
    return <MemberLogin onNavigate={handleNavigate} onSuccess={() => setCurrentView('member-portal')} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      <div style={{ flex: 1 }}>
        {currentView === 'home' && <PublicHome onNavigate={handleNavigate} />}
        {currentView === 'facilities' && <PublicHome onNavigate={handleNavigate} />}
        {currentView === 'gallery' && <PublicHome onNavigate={handleNavigate} />}
        {currentView === 'rules' && <PublicHome onNavigate={handleNavigate} />}
        
        {currentView === 'admin-login' && (
          <AdminLogin onNavigate={handleNavigate} onSuccess={() => setCurrentView('admin-dashboard')} />
        )}

        {currentView === 'member-login' && (
          <MemberLogin onNavigate={handleNavigate} onSuccess={() => setCurrentView('member-portal')} />
        )}

        {currentView === 'reset-password' && (
          <ResetPassword onNavigate={handleNavigate} />
        )}

        {currentView === 'admin-dashboard' && isAdmin && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}

        {currentView === 'member-portal' && isMember && (
          <MemberPortal onNavigate={handleNavigate} />
        )}
      </div>

      {currentView !== 'admin-dashboard' && <Footer onNavigate={handleNavigate} />}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
