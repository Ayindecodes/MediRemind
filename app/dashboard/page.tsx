"use client";

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, Clock, AlertCircle, Plus, TrendingUp,
  Calendar, MessageCircle, Video, Smile, Meh, Frown,
  Zap, Award, Target, ChevronRight, RefreshCw, Pill
} from 'lucide-react';

type User = {
  fullName?: string;
  email?: string;
};

type Medication = {
  id: string;
  name: string;
  dosage?: string;
  time?: string;
  status?: 'taken' | 'upcoming' | 'missed' | string;
  color?: string; // tailwind color classes or gradient token
  icon?: React.ReactNode | React.ComponentType<any>;
  takenAt?: string;
};

type StreakData = {
  currentStreak?: number;
  weeklyAdherence?: number;
  totalMedsTaken?: number;
  longestStreak?: number;
};

type TherapySession = {
  therapist: string;
  date: string;
  time: string;
  type: string;
  unreadMessages?: number;
};

export default function DashboardHome(): React.ReactElement {

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showMoodFeedback, setShowMoodFeedback] = useState<boolean>(false);
  const [moodMessage, setMoodMessage] = useState<string>('');

  // Data states
  const [userData, setUserData] = useState<User | null>(null);
  const [todaysMeds, setTodaysMeds] = useState<Medication[]>([]);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [therapySession, setTherapySession] = useState<TherapySession | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all dashboard data on component mount
   */
  useEffect(() => {
    fetchDashboardData();

    // Set up real-time sync every 30 seconds
    const syncInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Main function to fetch all dashboard data
   */
  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    if (silent) setIsSyncing(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Fetch all data in parallel
      const [userRes, medsRes, streakRes, therapyRes, moodRes] = await Promise.all([
        fetch('/api/user/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/medications/today', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/streak', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/therapy/upcoming-session', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/mood/today', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      // Only throw error if critical endpoints fail (not therapy/mood)
      if (!userRes.ok || !medsRes.ok || !streakRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [user, meds, streak, therapy, mood] = await Promise.all([
        userRes.json(),
        medsRes.json(),
        streakRes.json(),
        therapyRes.ok ? therapyRes.json() : { session: null },
        moodRes.ok ? moodRes.json() : { mood: null }
      ]);

      setUserData(user ?? null);
      setTodaysMeds(Array.isArray(meds.medications) ? meds.medications : []);
      setStreakData(streak ?? null);
      setTherapySession((therapy && therapy.session) ? therapy.session : null);
      setSelectedMood(mood?.mood ?? null);

      console.log('✅ Dashboard data loaded');

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);

      // Only show error if we're not in silent mode and it's the initial load
      if (!silent && isLoading) {
        setError('Failed to load dashboard. Please refresh the page.');
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  /**
   * Mark medication as taken
   */
  const handleMarkAsTaken = async (medId: string) => {
    setIsUpdating(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/medications/mark-taken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          medicationId: medId,
          takenAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to mark medication');

      const data = await response.json();

      // Optimistic update
      setTodaysMeds(prev =>
        prev.map(med =>
          med.id === medId ? { ...med, status: 'taken', takenAt: new Date().toISOString() } : med
        )
      );

      if (data.streak) setStreakData(data.streak);

      console.log('✅ Medication marked as taken!');

    } catch (err) {
      console.error('Failed to mark medication:', err);
      // user-visible fallback
      // eslint-disable-next-line no-alert
      alert('Failed to update medication. Please try again.');
      fetchDashboardData(true);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Save mood selection with personalized feedback
   */
  const handleMoodSelect = async (mood: string) => {
    const previousMood = selectedMood;
    setSelectedMood(mood);

    // Show personalized mood message
    const messages: Record<string, string> = {
      happy: "🎉 Wow! Keep being glad! Your positive energy is amazing!",
      neutral: "👍 That's okay! Every day has its ups and downs. You're doing great!",
      sad: "💙 We're here for you. Remember, it's okay to not be okay. Consider talking to your health coach."
    };

    setMoodMessage(messages[mood] || "Thanks for sharing how you feel!");
    setShowMoodFeedback(true);

    // Hide feedback after 5 seconds
    setTimeout(() => {
      setShowMoodFeedback(false);
    }, 5000);

    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/mood/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mood,
          date: new Date().toISOString(),
          note: ''
        })
      });

      console.log('✅ Mood logged');

    } catch (err) {
      console.error('Failed to log mood:', err);
      setSelectedMood(previousMood);
    }
  };

  /**
   * Navigation helpers
   */
  const handleAddMedication = () => { window.location.href = '/dashboard/medications/add'; };
  const handleBookSession = () => { window.location.href = '/dashboard/therapy'; };
  const handleChatNow = () => { window.location.href = '/dashboard/therapy'; };
  const handleViewAllMeds = () => { window.location.href = '/dashboard/medications'; };
  const handleViewMoodHistory = () => { window.location.href = '/dashboard/history?tab=mood'; };
  const handleReadMoreTips = () => { window.location.href = '/dashboard/therapy?tab=resources'; };
  const handleRefresh = () => { fetchDashboardData(); };

  const moods: { value: string; icon: React.ComponentType<any>; label: string; color: string }[] = [
    { value: 'happy', icon: Smile, label: 'Great', color: 'text-green-500' },
    { value: 'neutral', icon: Meh, label: 'Okay', color: 'text-yellow-500' },
    { value: 'sad', icon: Frown, label: 'Not good', color: 'text-red-500' }
  ];

  // Small inline spinner used where Loader was previously used
  const InlineSpinner = ({ className }: { className?: string }) => (
    <svg className={className ?? 'w-4 h-4 animate-spin'} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"></circle>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
    </svg>
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 dark:text-red-400 hover:text-red-700">✕</button>
          </div>
        </div>
      )}

      {/* Mood Feedback Message */}
      {showMoodFeedback && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-800 dark:text-indigo-300">{moodMessage}</p>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userData?.fullName?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Here's your medication overview for today</p>
        </div>

        <button onClick={handleRefresh} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{streakData?.currentStreak || 0} days</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Weekly Adherence</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{streakData?.weeklyAdherence || 0}%</p>
            </div>
            <TrendingUp className="w-12 h-12 p-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Taken</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{streakData?.totalMedsTaken || 0}</p>
            </div>
            <Award className="w-12 h-12 p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Longest Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{streakData?.longestStreak || 0} days</p>
            </div>
            <Target className="w-12 h-12 p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Medications */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Today's Medications
                {todaysMeds.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ({todaysMeds.filter(m => m.status === 'taken').length}/{todaysMeds.length} taken)
                  </span>
                )}
              </h2>
              <button
                onClick={handleAddMedication}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Med
              </button>
            </div>

            {todaysMeds.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                  <Pill className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No medications yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  Start tracking your medications by adding your first one. We'll send you reminders so you never miss a dose.
                </p>
                <button
                  onClick={handleAddMedication}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Medication
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {todaysMeds.map(med => {
                    const IconComp = (med.icon && typeof med.icon === 'function') ? med.icon as React.ComponentType<any> : null;
                    return (
                      <div key={med.id} className={`rounded-xl p-4 bg-gradient-to-r ${med.color ?? ''} bg-opacity-10 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${med.color ?? 'from-indigo-100 to-indigo-200'} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                              {IconComp ? <IconComp /> : (med.icon ?? null)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{med.name}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{med.dosage}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">{med.time}</span>
                              </div>
                            </div>
                          </div>

                          <div className="ml-4">
                            {med.status === 'taken' ? (
                              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium whitespace-nowrap">
                                <CheckCircle className="w-4 h-4" />
                                Taken
                              </div>
                            ) : med.status === 'upcoming' ? (
                              <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
                                Upcoming
                              </div>
                            ) : (
                              <button onClick={() => handleMarkAsTaken(med.id)} disabled={isUpdating} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50">
                                {isUpdating ? <InlineSpinner className="w-4 h-4 mx-auto" /> : 'Mark as Taken'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleViewAllMeds}
                  className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
                >
                  View All Medications →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Therapy Session Card */}
          {therapySession ? (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Health Coach</h3>
                </div>
                {therapySession.unreadMessages && therapySession.unreadMessages > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                    {therapySession.unreadMessages}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {therapySession.therapist.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{therapySession.therapist}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Licensed Therapist</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{therapySession.date} at {therapySession.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Video className="w-4 h-4" />
                    <span>{therapySession.type} Session</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleChatNow}
                    className="flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat Now
                  </button>
                  <button
                    onClick={handleBookSession}
                    className="py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No upcoming sessions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Book a session with a health coach</p>
              <button
                onClick={handleBookSession}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              >
                Book Session
              </button>
            </div>
          )}

          {/* Mood Tracker */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">How are you feeling today?</h3>

            <div className="grid grid-cols-3 gap-3">
              {moods.map(mood => {
                const Icon = mood.icon;
                const isSelected = selectedMood === mood.value;
                return (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodSelect(mood.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                  >
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : mood.color}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{mood.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleViewMoodHistory}
              className="w-full mt-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
            >
              View mood history →
            </button>
          </div>

          {/* Daily Tip */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Today's Tip</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Taking medications at the same time daily can improve adherence by up to 40%. Set consistent reminders!
            </p>
            <button
              onClick={handleReadMoreTips}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              Read more tips
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
