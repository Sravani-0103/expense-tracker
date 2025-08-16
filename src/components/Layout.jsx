import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Receipt,
  Calendar,
  Users,
  PiggyBank,
  BarChart3,
  Split,
  Menu,
  X,
  LogOut,
  User,
  Bell
} from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout, userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard', color: '#667eea' },
    { path: '/expenses', icon: Receipt, label: 'Expenses', color: '#f093fb' },
    { path: '/festival', icon: Calendar, label: 'Festival Mode', color: '#f6d55c' },
    { path: '/family', icon: Users, label: 'Family', color: '#3dccc7' },
    { path: '/savings', icon: PiggyBank, label: 'Savings & Gold', color: '#20bf6b' },
    { path: '/reports', icon: BarChart3, label: 'Reports', color: '#eb4d4b' },
    { path: '/splitting', icon: Split, label: 'Split Expenses', color: '#6c5ce7' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="layout">
      <header className="mobile-header">
        <button
          className="menu-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X /> : <Menu />}
        </button>
        <h1 className="app-title">🪙 Expense Tracker</h1>
        <div className="header-actions">
          <button className="notification-btn">
            <Bell />
          </button>
        </div>
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Expense Tracker</h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
                style={{ '--item-color': item.color }}
              >
                <Icon className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              <User />
            </div>
            <div className="user-details">
              <p className="user-name">
                {userProfile?.displayName || currentUser?.displayName || 'User'}
              </p>
              <p className="user-email">{currentUser?.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
