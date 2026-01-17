"use client";

import React, { useState, useEffect } from 'react';
import { 
  Home, Pill, Calendar, MessageCircle, FileText, Users, 
  Settings, LogOut, Bell, Menu, X, ChevronDown, Sun, Moon, Crown
} from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
  plan: 'free' | 'individual' | 'family';
}

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no user, redirect to login
      window.location.href = '/login';
    }

    // Fetch real notifications
    fetchNotifications();

    // Set up auto-refresh for notifications
    const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleUpgrade = () => {
    window.location.href = '/dashboard/upgrade';
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!user) return null; // Loading or redirecting

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'medications', label: 'Medications', icon: Pill, href: '/dashboard/medications' },
    { id: 'history', label: 'History', icon: Calendar, href: '/dashboard/history' },
    { 
      id: 'therapy', 
      label: 'Health Coach', 
      icon: MessageCircle, 
      href: '/dashboard/therapy', 
      badge: user.plan !== 'free' ? 'NEW' : 'PREMIUM',
      locked: user.plan === 'free'
    },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/dashboard/reports' },
    ...(user.plan === 'family' ? [{ id: 'family', label: 'Family', icon: Users, href: '/dashboard/family' }] : []),
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-20 shrink-0 items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">💊</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              MediRemind
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLocked = item.locked;
                return (
                  <li key={item.id}>
                    <a
                      href={isLocked ? undefined : item.href}
                      onClick={isLocked ? handleUpgrade : undefined}
                      className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-all duration-200 ${
                        isLocked
                          ? 'text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                      {item.badge && (
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.badge === 'PREMIUM'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}

              {/* Upgrade Card for Free Plan */}
              {user.plan === 'free' && (
                <li className="mt-4">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Upgrade to Premium</h3>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Unlock therapy sessions, family mode, and advanced analytics
                    </p>
                    <button
                      onClick={handleUpgrade}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                    >
                      View Plans
                    </button>
                  </div>
                </li>
              )}

              {/* Settings & Logout at bottom */}
              <li className="mt-auto">
                <a
                  href="/dashboard/settings"
                  className="group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200"
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  Settings
                </a>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="w-full group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
          
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-slate-800 px-6 pb-4">
                {/* Logo */}
                <div className="flex h-20 shrink-0 items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">💊</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    MediRemind
                  </span>
                </div>

                {/* Mobile Navigation - Same as desktop */}
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isLocked = item.locked;
                      return (
                        <li key={item.id}>
                          <a
                            href={isLocked ? undefined : item.href}
                            onClick={() => {
                              if (isLocked) {
                                handleUpgrade();
                              } else {
                                setSidebarOpen(false);
                              }
                            }}
                            className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-all duration-200 ${
                              isLocked
                                ? 'text-gray-400 dark:text-gray-500 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                            {item.badge && (
                              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.badge === 'PREMIUM'
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </a>
                        </li>
                      );
                    })}

                    {user.plan === 'free' && (
                      <li className="mt-4">
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Upgrade to Premium</h3>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Unlock therapy sessions, family mode, and advanced analytics
                          </p>
                          <button
                            onClick={handleUpgrade}
                            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                          >
                            View Plans
                          </button>
                        </div>
                      </li>
                    )}

                    <li className="mt-auto">
                      <a href="/dashboard/settings" className="group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200">
                        <Settings className="h-5 w-5 shrink-0" />
                        Settings
                      </a>
                    </li>
                    <li>
                      <button onClick={handleLogout} className="w-full group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200">
                        <LogOut className="h-5 w-5 shrink-0" />
                        Logout
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Top Header */}
        <div className="sticky top-0 z-40 flex h-20 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" />

          {/* Search bar */}
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="relative flex flex-1 items-center">
              <input
                type="search"
                placeholder="Search medications, history..."
                className="w-full rounded-lg border-0 bg-gray-100 dark:bg-slate-700 px-4 py-2 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Right side - Notifications, Theme, Profile */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <a
                          key={notif.id}
                          href={notif.actionUrl || '#'}
                          className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                            !notif.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                          }`}
                        >
                          <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(notif.timestamp)}</p>
                        </a>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => window.location.href = '/dashboard/notifications'}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button className="flex items-center gap-x-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 p-2 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.fullName.charAt(0)}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {user.plan === 'free' && 'Free Plan'}
                    {user.plan === 'individual' && (
                      <>
                        <Crown className="w-3 h-3 text-amber-500" />
                        Individual Plan
                      </>
                    )}
                    {user.plan === 'family' && (
                      <>
                        <Crown className="w-3 h-3 text-amber-500" />
                        Family Plan
                      </>
                    )}
                  </p>
                </div>
                <ChevronDown className="hidden lg:block h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}