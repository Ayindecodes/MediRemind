"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, X, Clock, Calendar, Pill, Bell, 
  Camera, Trash2, Save, AlertCircle, CheckCircle, Info, Crown, Lock
} from 'lucide-react';

interface User {
  plan: 'free' | 'individual' | 'family';
  fullName: string;
  email: string;
}

export default function AddMedicationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [medicationCount, setMedicationCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    form: 'tablet',
    frequency: 'daily',
    times: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    color: 'from-blue-500 to-cyan-500',
    icon: '💊',
    notes: '',
    refillReminder: '',
    enableSound: true,
    enableEmail: true,
    soundType: 'default'
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    // Load user and check medication count
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMedicationCount();
    } else {
      window.location.href = '/login';
    }
  }, []);

  const fetchMedicationCount = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/medications/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMedicationCount(data.medications?.length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch medication count:', error);
    }
  };

  const medicationForms = [
    { value: 'tablet', label: 'Tablet' },
    { value: 'capsule', label: 'Capsule' },
    { value: 'liquid', label: 'Liquid' },
    { value: 'injection', label: 'Injection' },
    { value: 'cream', label: 'Cream/Ointment' },
    { value: 'drops', label: 'Drops' },
    { value: 'inhaler', label: 'Inhaler' },
    { value: 'patch', label: 'Patch' }
  ];

  const frequencies = [
    { value: 'as_needed', label: 'As Needed' },
    { value: 'daily', label: 'Once Daily' },
    { value: 'twice_daily', label: 'Twice Daily' },
    { value: 'three_times', label: 'Three Times Daily' },
    { value: 'four_times', label: 'Four Times Daily' },
    { value: 'every_other_day', label: 'Every Other Day' },
    { value: 'weekly', label: 'Once Weekly' },
    { value: 'custom', label: 'Custom Schedule' }
  ];

  const colorOptions = [
    { value: 'from-blue-500 to-cyan-500', label: 'Blue', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { value: 'from-purple-500 to-pink-500', label: 'Purple', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { value: 'from-green-500 to-emerald-500', label: 'Green', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { value: 'from-amber-500 to-orange-500', label: 'Orange', color: 'bg-gradient-to-r from-amber-500 to-orange-500' },
    { value: 'from-red-500 to-rose-500', label: 'Red', color: 'bg-gradient-to-r from-red-500 to-rose-500' },
    { value: 'from-indigo-500 to-purple-500', label: 'Indigo', color: 'bg-gradient-to-r from-indigo-500 to-purple-500' }
  ];

  const iconOptions = ['💊', '💉', '🩹', '🧪', '🧬', '⚕️', '🔬', '💙', '❤️', '💚'];

  const soundOptions = [
    { value: 'default', label: 'Default Chime' },
    { value: 'gentle', label: 'Gentle Bell' },
    { value: 'urgent', label: 'Urgent Alert' },
    { value: 'melody', label: 'Soft Melody' }
  ];

  const handleFrequencyChange = (freq: string) => {
    setFormData(prev => {
      let newTimes = ['08:00'];
      
      switch (freq) {
        case 'twice_daily':
          newTimes = ['08:00', '20:00'];
          break;
        case 'three_times':
          newTimes = ['08:00', '14:00', '20:00'];
          break;
        case 'four_times':
          newTimes = ['08:00', '12:00', '16:00', '20:00'];
          break;
        case 'as_needed':
          newTimes = [];
          break;
        default:
          newTimes = ['08:00'];
      }
      
      return { ...prev, frequency: freq, times: newTimes };
    });
  };

  const handleAddTime = () => {
    setFormData(prev => ({
      ...prev,
      times: [...prev.times, '12:00']
    }));
  };

  const handleRemoveTime = (index: number) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }));
  };

  const handleTimeChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.map((time, i) => i === index ? value : time)
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if user is on free plan
    if (user?.plan === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Medication name is required';
    }

    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }

    if (formData.frequency !== 'as_needed' && formData.times.length === 0) {
      newErrors.times = 'At least one reminder time is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    // Check plan limits
    if (user?.plan === 'free' && medicationCount >= 3) {
      newErrors.plan = 'Free plan is limited to 3 medications. Please upgrade to add more.';
      setShowUpgradeModal(true);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/medications/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          photoUrl: photoPreview
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.upgradeRequired) {
          setShowUpgradeModal(true);
        }
        throw new Error(data.error || 'Failed to add medication');
      }

      setShowSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error: any) {
      console.error('Error adding medication:', error);
      setErrors({ submit: error.message || 'Failed to add medication. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    window.location.href = '/dashboard';
  };

  // Show loading while checking user
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Upgrade to Premium
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {user.plan === 'free' && medicationCount >= 3
                  ? 'Free plan is limited to 3 medications. Upgrade to add unlimited medications.'
                  : 'Photo uploads are only available on Premium and Family plans.'}
              </p>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Premium Features:</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 text-left">
                  <li>✓ Unlimited medications</li>
                  <li>✓ Photo uploads for pills</li>
                  <li>✓ Therapy sessions</li>
                  <li>✓ Advanced analytics</li>
                  <li>✓ PDF export for doctors</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.href = '/dashboard/upgrade'}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all mb-2"
              >
                View Pricing Plans
              </button>
              
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Medication</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Fill in the details below to add a new medication to your schedule</p>
          </div>
          {user.plan === 'free' && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">{medicationCount}/3</span> medications used
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/upgrade'}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
              >
                Upgrade for unlimited
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Medication added successfully!</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {formData.enableEmail ? 'A confirmation email has been sent. ' : ''}
                Redirecting to dashboard...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan Warning for Free Users */}
      {user.plan === 'free' && medicationCount >= 2 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {medicationCount === 2 ? 'One medication slot remaining' : 'Medication limit reached'}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {medicationCount === 2 
                  ? 'This is your last medication on the free plan. Upgrade for unlimited medications.' 
                  : 'You\'ve reached the 3 medication limit for free accounts.'}
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/upgrade'}
                className="text-xs text-amber-700 dark:text-amber-300 underline hover:no-underline mt-2"
              >
                Upgrade to Premium →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ... (Keep all the existing form fields - Basic Information, Schedule, Duration, Notification Settings) ... */}
          {/* I'll keep the form sections the same as your original, just update the photo upload section: */}

          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medication Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                  placeholder="e.g., Aspirin, Vitamin D, Lisinopril"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dosage *
                </label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.dosage ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                  placeholder="e.g., 500mg, 2 tablets, 5ml"
                />
                {errors.dosage && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.dosage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Form Type
                </label>
                <select
                  value={formData.form}
                  onChange={(e) => setFormData({...formData, form: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {medicationForms.map(form => (
                    <option key={form.value} value={form.value}>{form.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule - Keep your existing code */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Reminder Schedule
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How often do you take this?
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {frequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>

            {formData.frequency !== 'as_needed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reminder Times *
                </label>
                <div className="space-y-3">
                  {formData.times.map((time, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      {formData.times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="mt-3 flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Time
                </button>
                {errors.times && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.times}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Duration - Keep your existing code */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Duration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty for ongoing medication</p>
              </div>
            </div>
          </div>

          {/* Notification Settings - Keep your existing code */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Notification Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enableSound"
                  checked={formData.enableSound}
                  onChange={(e) => setFormData({...formData, enableSound: e.target.checked})}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <label htmlFor="enableSound" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Sound Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Play a sound when it's time to take this medication
                  </p>
                  
                  {formData.enableSound && (
                    <select
                      value={formData.soundType}
                      onChange={(e) => setFormData({...formData, soundType: e.target.value})}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                    >
                      {soundOptions.map(sound => (
                        <option key={sound.value} value={sound.value}>{sound.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enableEmail"
                  checked={formData.enableEmail}
                  onChange={(e) => setFormData({...formData, enableEmail: e.target.checked})}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="enableEmail" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Email Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Receive email reminders before each dose to {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customization - UPDATED PHOTO UPLOAD SECTION */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Customization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, color: color.value})}
                      className={`h-12 rounded-lg ${color.color} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-indigo-600' : ''}`}
                    ></button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({...formData, icon})}
                      className={`h-12 rounded-lg flex items-center justify-center text-2xl ${formData.icon === icon ? 'bg-indigo-100 dark:bg-indigo-900/30 ring-2 ring-indigo-600' : 'bg-gray-100 dark:bg-slate-700'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload - UPDATED WITH PLAN CHECK */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  Photo (Optional)
                  {user.plan === 'free' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                      <Lock className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg transition-colors ${
                      user.plan === 'free' 
                        ? 'border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50' 
                        : 'border-gray-300 dark:border-gray-600 cursor-pointer hover:border-indigo-500'
                    }`}>
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {user.plan === 'free' ? 'Premium Feature' : 'Upload Photo'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                        disabled={user.plan === 'free'}
                      />
                    </label>
                  )}
                  {user.plan === 'free' && !photoPreview && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Photo uploads are available on Premium and Family plans.{' '}
                      <button
                        type="button"
                        onClick={() => window.location.href = '/dashboard/upgrade'}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Upgrade now
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add any special instructions, side effects to watch for, or other notes..."
            ></textarea>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting || (user.plan === 'free' && medicationCount >= 3)}
              className="flex-1 md:flex-initial md:px-8 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Medication
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Reminder Tips</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Set reminders for times when you're usually at home</li>
              <li>• Enable both sound and email for important medications</li>
              <li>• Add notes about taking with food or avoiding certain activities</li>
              <li>• Use different colors to easily identify medications at a glance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}