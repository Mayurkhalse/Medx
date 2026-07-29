import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ReportEntry from './pages/ReportEntry';
import WhatIfAssistant from './pages/WhatIfAssistant';
import { LayoutDashboard, PlusCircle, Sparkles, LogOut, Activity, User } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '1.25rem', color: '#64748b', fontWeight: 500 }}>Initializing session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="logo-section">
            <Activity size={28} />
            <span style={{ trackingLetter: '-0.05em' }}>MedX</span>
          </div>

          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
                  <LayoutDashboard size={20} />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/entry" className={`nav-item ${location.pathname === '/entry' ? 'active' : ''}`}>
                  <PlusCircle size={20} />
                  Log Results
                </Link>
              </li>
              <li>
                <Link to="/whatif" className={`nav-item ${location.pathname === '/whatif' ? 'active' : ''}`}>
                  <Sparkles size={20} />
                  What-If AI
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* User Info / Logout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {user && (
            <div className="user-profile-badge">
              <User size={16} color="#64748b" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {user.name}
              </span>
            </div>
          )}
          <button onClick={logout} className="nav-item btn-secondary" style={{ border: 'none', background: 'none', width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/entry" element={<ReportEntry />} />
                <Route path="/whatif" element={<WhatIfAssistant />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
