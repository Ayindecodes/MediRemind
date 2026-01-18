"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Edit, Trash2, Clock, Calendar,
  ChevronDown, CheckCircle, AlertCircle, X, Save, Pill,
  History, TrendingUp, Package, ArrowLeft, MoreVertical,
  Eye, EyeOff, Circle, CheckCircle2
} from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  color: string;
  icon: string;
  startDate: string;
  endDate?: string;
  form?: string;
  notes?: string;
  photoUrl?: string;
  enableSound?: boolean;
  enableEmail?: boolean;
  active?: boolean;
}

interface TodayDose {
  id: string;
  medicationId: string;
  time: string;
  status: 'taken' | 'missed' | 'upcoming';
  takenAt?: string;
}

interface MedicationWithDoses extends Medication {
  todayDoses?: TodayDose[];
}

interface MedicationLog {
  id: string;
  medicationId: string;
  medicationName: string;
  takenAt: string;
  scheduledTime: string;
  status: 'taken' | 'missed';
  date: string;
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<MedicationWithDoses[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<MedicationWithDoses[]>([]);
  const [medicationHistory, setMedicationHistory] = useState<MedicationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingDose, setIsUpdatingDose] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [showHistory, setShowHistory] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [deletingMed, setDeletingMed] = useState<Medication | null>(null);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
    fetchHistory();
  }, []);

  useEffect(() => {
    // Filter medications based on search and status
    let filtered = medications;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(med =>
        med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.dosage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(med => {
        if (med.endDate) {
          return new Date(med.endDate) >= new Date();
        }
        return true;
      });
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(med => {
        if (med.endDate) {
          return new Date(med.endDate) < new Date();
        }
        return false;
      });
    }

    setFilteredMedications(filtered);
  }, [searchQuery, filterStatus, medications]);

  const fetchMedications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const [medsRes, todayRes] = await Promise.all([
        fetch('/api/medications/list', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/medications/today', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (medsRes.ok) {
        const medsData = await medsRes.json();
        const todayData = todayRes.ok ? await todayRes.json() : { medications: [] };
        
        // Merge today's doses with medications
        const medsWithDoses = (medsData.medications || []).map((med: Medication) => {
          const todayDoses = (todayData.medications || [])
            .filter((dose: any) => dose.medicationId === med.id || dose.name === med.name)
            .map((dose: any) => ({
              id: dose.id,
              medicationId: med.id,
              time: dose.time,
              status: dose.status,
              takenAt: dose.takenAt
            }));
          
          return { ...med, todayDoses };
        });
        
        setMedications(medsWithDoses);
      }
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/medications/history', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMedicationHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleEdit = (med: Medication) => {
    setEditingMed({ ...med });
    setActiveDropdown(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMed) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/medications/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editingMed)
      });

      if (response.ok) {
        setMedications(prev =>
          prev.map(med => med.id === editingMed.id ? editingMed : med)
        );
        setEditingMed(null);
        alert('✅ Medication updated successfully!');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update medication. Please try again.');
    }
  };

  const handleDelete = async (med: Medication) => {
    if (!confirm(`Are you sure you want to delete "${med.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/medications/delete/${med.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setMedications(prev => prev.filter(m => m.id !== med.id));
        setActiveDropdown(null);
        alert('✅ Medication deleted successfully!');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete medication. Please try again.');
    }
  };

  const handleMarkDoseAsTaken = async (medId: string, doseId: string, scheduledTime: string) => {
    setIsUpdatingDose(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/medications/mark-taken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          medicationId: doseId,
          takenAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Update local state
        setMedications(prev =>
          prev.map(med =>
            med.id === medId
              ? {
                  ...med,
                  todayDoses: med.todayDoses?.map(dose =>
                    dose.id === doseId
                      ? { ...dose, status: 'taken' as const, takenAt: new Date().toISOString() }
                      : dose
                  )
                }
              : med
          )
        );
        
        // Refresh history
        fetchHistory();
      } else {
        throw new Error('Failed to mark as taken');
      }
    } catch (error) {
      console.error('Mark taken error:', error);
      alert('Failed to mark dose as taken. Please try again.');
    } finally {
      setIsUpdatingDose(false);
    }
  };

  const getAdherenceRate = (medId: string): number => {
    const logs = medicationHistory.filter(log => log.medicationId === medId);
    if (logs.length === 0) return 0;
    const taken = logs.filter(log => log.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  };

  const stats = {
    total: medications.length,
    active: medications.filter(m => !m.endDate || new Date(m.endDate) >= new Date()).length,
    inactive: medications.filter(m => m.endDate && new Date(m.endDate) < new Date()).length,
    adherenceRate: medicationHistory.length > 0
      ? Math.round((medicationHistory.filter(l => l.status === 'taken').length / medicationHistory.length) * 100)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Medications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage all your medications in one place</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/medications/add'}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Medication
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Medications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <Pill className="w-10 h-10 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
            </div>
            <CheckCircle className="w-10 h-10 p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.inactive}</p>
            </div>
            <Package className="w-10 h-10 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Adherence Rate</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.adherenceRate}%</p>
            </div>
            <TrendingUp className="w-10 h-10 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search medications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              Completed
            </button>
          </div>

          {/* History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              showHistory
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            <History className="w-5 h-5" />
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>
      </div>

      {/* History Section */}
      {showHistory && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            Medication History
          </h2>

          {medicationHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No medication history yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {medicationHistory.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {log.status === 'taken' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{log.medicationName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.date).toLocaleDateString()} at {log.scheduledTime}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    log.status === 'taken'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medications List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {filteredMedications.length === 0 ? (
          <div className="text-center py-16">
            <Pill className="w-20 h-20 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No medications found' : 'No medications yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first medication'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => window.location.href = '/dashboard/medications/add'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Your First Medication
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMedications.map((med) => {
              const isActive = !med.endDate || new Date(med.endDate) >= new Date();
              const adherence = getAdherenceRate(med.id);

              return (
                <div
                  key={med.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  {editingMed?.id === med.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Medication</h3>
                        <button
                          onClick={() => setEditingMed(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Medication Name
                          </label>
                          <input
                            type="text"
                            value={editingMed.name}
                            onChange={(e) => setEditingMed({ ...editingMed, name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={editingMed.dosage}
                            onChange={(e) => setEditingMed({ ...editingMed, dosage: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={editingMed.startDate}
                            onChange={(e) => setEditingMed({ ...editingMed, startDate: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            End Date (Optional)
                          </label>
                          <input
                            type="date"
                            value={editingMed.endDate || ''}
                            onChange={(e) => setEditingMed({ ...editingMed, endDate: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingMed(null)}
                          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${med.color} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                          {med.icon}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {med.name}
                                {!isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
                                    Completed
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{med.dosage}</p>
                            </div>

                            <div className="relative">
                              <button
                                onClick={() => setActiveDropdown(activeDropdown === med.id ? null : med.id)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                              >
                                <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </button>

                              {activeDropdown === med.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-10">
                                  <button
                                    onClick={() => handleEdit(med)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                    <span className="text-sm text-gray-900 dark:text-white">Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(med)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600 dark:text-red-400">Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Frequency</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {med.frequency.replace(/_/g, ' ')}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Times</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {med.times.join(', ')}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {new Date(med.startDate).toLocaleDateString()}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Adherence</p>
                              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {adherence}%
                              </p>
                            </div>
                          </div>

                          {/* Today's Doses */}
                          {med.todayDoses && med.todayDoses.length > 0 && (
                            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                Today's Doses
                              </h4>
                              <div className="space-y-2">
                                {med.todayDoses.map((dose) => (
                                  <div
                                    key={dose.id}
                                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      {dose.status === 'taken' ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                      ) : dose.status === 'missed' ? (
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-gray-400" />
                                      )}
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {dose.time}
                                        </p>
                                        {dose.takenAt && (
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Taken at {new Date(dose.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {dose.status !== 'taken' && (
                                      <button
                                        onClick={() => handleMarkDoseAsTaken(med.id, dose.id, dose.time)}
                                        disabled={isUpdatingDose}
                                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                                      >
                                        {isUpdatingDose ? (
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          'Mark as Taken'
                                        )}
                                      </button>
                                    )}

                                    {dose.status === 'taken' && (
                                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                                        ✓ Taken
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {med.notes && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300">{med.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}