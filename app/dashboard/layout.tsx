"use client";

import React, { useState } from 'react';
import { 
  Home, Pill, Calendar, MessageCircle, FileText, Users, 
  Settings, LogOut, Bell, Menu, X, ChevronDown, Sun, Moon
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Mock user data
  const user = {
    fullName: 'John Doe',
    email: 'john@example.com',
    accountType: 'family', // 'personal' or 'family'
    avatar: null,
    premium: false
  };

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'medications', label: 'Medications', icon: Pill, href: '/dashboard/medications' },
    { id: 'history', label: 'History', icon: Calendar, href: '/dashboard/history' },
    { id: 'therapy', label: 'Health Coach', icon: MessageCircle, href: '/dashboard/therapy', badge: 'NEW' },
    { id: 'reports', label: 'Reports', icon: FileText, href: '/dashboard/reports' },
    ...(user.accountType === 'family' ? [{ id: 'family', label: 'Family', icon: Users, href: '/dashboard/family' }] : []),
  ];

  // Mock notifications
  const notifications = [
    { id: 1, type: 'reminder', message: 'Time to take Vitamin D', time: '2 min ago', unread: true },
    { id: 2, type: 'session', message: 'Therapy session tomorrow at 3 PM', time: '1 hour ago', unread: true },
    { id: 3, type: 'streak', message: 'You hit a 7-day streak! 🔥', time: '2 hours ago', unread: false }
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

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
                return (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      className="group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {item.label}
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}

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

                {/* Mobile Navigation */}
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <a
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className="group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            {item.label}
                            {item.badge && (
                              <span className="ml-auto rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 text-xs font-semibold text-white">
                                {item.badge}
                              </span>
                            )}
                          </a>
                        </li>
                      );
                    })}

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
                {notifications.filter(n => n.unread).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer ${
                          notif.unread ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                        }`}
                      >
                        <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.premium ? 'Premium' : 'Free Plan'}
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