"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, Plus, X, Clock, Calendar, Pill, Bell, 
  Camera, Trash2, Save, AlertCircle, CheckCircle, Info
} from 'lucide-react';

export default function AddMedicationPage() {
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
    refillQuantity: '',
    refillReminder: 7,
    enableSound: true,
    enableEmail: true,
    soundType: 'default'
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Predefined options
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

  /**
   * Update frequency and adjust times accordingly
   */
  const handleFrequencyChange = (freq) => {
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

  /**
   * Add new time slot
   */
  const handleAddTime = () => {
    setFormData(prev => ({
      ...prev,
      times: [...prev.times, '12:00']
    }));
  };

  /**
   * Remove time slot
   */
  const handleRemoveTime = (index) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }));
  };

  /**
   * Update specific time
   */
  const handleTimeChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.map((time, i) => i === index ? value : time)
    }));
  };

  /**
   * Handle photo upload
   */
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    const newErrors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/medications/create', {
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

      if (!response.ok) {
        throw new Error('Failed to add medication');
      }

      setShowSuccess(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard/medications';
      }, 2000);

    } catch (error) {
      console.error('Error adding medication:', error);
      setErrors({ submit: 'Failed to add medication. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => window.location.href = '/dashboard/medications'}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Medications
        </button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Medication</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Fill in the details below to add a new medication to your schedule</p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Medication added successfully!</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Redirecting to your medications...</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-600" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Medication Name */}
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

              {/* Dosage */}
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

              {/* Medication Form */}
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

          {/* Schedule */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Reminder Schedule
            </h2>

            {/* Frequency */}
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

            {/* Reminder Times */}
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

          {/* Duration */}
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
                  placeholder="Leave empty for ongoing"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty for ongoing medication</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Notification Preferences
            </h2>

            <div className="space-y-4">
              {/* Sound Notification */}
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

              {/* Email Notification */}
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
                    Receive email reminders before each dose
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Customization */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Customization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Color */}
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

              {/* Icon */}
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

              {/* Photo Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Photo (Optional)
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
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Upload Photo</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
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
              disabled={isSubmitting}
              className="flex-1 md:flex-initial md:px-8 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
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
              onClick={() => window.location.href = '/dashboard/medications'}
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