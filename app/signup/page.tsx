"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, AlertCircle, Loader, ShieldCheck } from 'lucide-react';

export default function SignUpPage() {
  const [step, setStep] = useState<'signup' | 'verify'>('signup');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [errors, setErrors] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ fullName: false, email: false, password: false, confirmPassword: false });
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; label: string; color: string; }>({ score: 0, label: 'None', color: 'bg-gray-300' });

  const calculatePasswordStrength = (password: string) => {
    let score = 0;
    if (password.length === 0) return { score: 0, label: 'None', color: 'bg-gray-300' };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    else if (score === 3) return { score, label: 'Medium', color: 'bg-yellow-500' };
    else return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'fullName': return !value.trim() ? 'Full name is required' : value.trim().length < 2 ? 'Full name must be at least 2 characters' : '';
      case 'email': return !value.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email address' : '';
      case 'password': return !value ? 'Password is required' : value.length < 8 ? 'Password must be at least 8 characters' : !/(?=.*[a-z])(?=.*[A-Z])/.test(value) ? 'Password must include uppercase and lowercase letters' : !/(?=.*\d)/.test(value) ? 'Password must include at least one number' : '';
      case 'confirmPassword': return !value ? 'Please confirm your password' : value !== formData.password ? 'Passwords do not match' : '';
      default: return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'password') setPasswordStrength(calculatePasswordStrength(value));
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
      if (name === 'password' && touched.confirmPassword) {
        const confirmError = validateField('confirmPassword', formData.confirmPassword);
        setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => formData.fullName.trim() !== '' && formData.email.trim() !== '' && formData.password !== '' && formData.confirmPassword !== '' && !errors.fullName && !errors.email && !errors.password && !errors.confirmPassword;

  const handleSubmit = async () => {
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    const newErrors = { fullName: validateField('fullName', formData.fullName), email: validateField('email', formData.email), password: validateField('password', formData.password), confirmPassword: validateField('confirmPassword', formData.confirmPassword) };
    setErrors(newErrors);
    if (Object.values(newErrors).some(error => error !== '')) return;

    setIsSubmitting(true);
    setApiResponse(null);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: formData.fullName, email: formData.email, password: formData.password })
      });

      const data = await response.json();
      if (response.ok) {
        setApiResponse({ type: 'success', message: `Verification code sent to ${formData.email}!` });
        setTimeout(() => setStep('verify'), 1000);
      } else {
        setApiResponse({ type: 'error', message: data.message || 'Signup failed. Please try again.' });
      }
    } catch (error) {
      setApiResponse({ type: 'error', message: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) document.getElementById(`code-${index + 1}`)?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) document.getElementById(`code-${index - 1}`)?.focus();
  };

  const handleVerify = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setApiResponse({ type: 'error', message: 'Please enter the complete 6-digit code' });
      return;
    }

    setIsVerifying(true);
    setApiResponse(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code })
      });

      const data = await response.json();
      if (response.ok) {
        setApiResponse({ type: 'success', message: 'Account verified! Redirecting to dashboard...' });
        setTimeout(() => window.location.href = '/dashboard', 2000);
      } else {
        setApiResponse({ type: 'error', message: data.message || 'Verification failed. Please try again.' });
      }
    } catch (error) {
      setApiResponse({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setApiResponse(null);
    try {
      const response = await fetch('/api/resend-code', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ email: formData.email, type: 'signup' }) 
      });
      const data = await response.json();
      if (response.ok) {
        setApiResponse({ type: 'success', message: 'New verification code sent! Check your email.' });
        setVerificationCode(['', '', '', '', '', '']);
      } else {
        setApiResponse({ type: 'error', message: data.message || 'Failed to resend code.' });
      }
    } catch (error) {
      setApiResponse({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-3xl">💊</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">MediRemind</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{step === 'signup' ? 'Create Account' : 'Verify Your Email'}</h1>
          <p className="text-gray-600 dark:text-gray-400">{step === 'signup' ? 'Start your journey to better medication adherence' : `We sent a 6-digit code to ${formData.email}`}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {step === 'signup' ? (
            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} onBlur={handleBlur} className={`w-full pl-11 pr-4 py-3 rounded-lg border ${touched.fullName && errors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`} placeholder="John Doe" />
                </div>
                {touched.fullName && errors.fullName && <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" /><span>{errors.fullName}</span></div>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} className={`w-full pl-11 pr-4 py-3 rounded-lg border ${touched.email && errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`} placeholder="john@example.com" />
                </div>
                {touched.email && errors.email && <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" /><span>{errors.email}</span></div>}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} className={`w-full pl-11 pr-12 py-3 rounded-lg border ${touched.password && errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
                {formData.password && <div className="mt-2"><div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-600 dark:text-gray-400">Password strength:</span><span className={`text-xs font-medium ${passwordStrength.label === 'Weak' ? 'text-red-600' : passwordStrength.label === 'Medium' ? 'text-yellow-600' : passwordStrength.label === 'Strong' ? 'text-green-600' : 'text-gray-600'}`}>{passwordStrength.label}</span></div><div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"><div className={`h-full ${passwordStrength.color} transition-all duration-300`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }}></div></div></div>}
                {touched.password && errors.password && <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" /><span>{errors.password}</span></div>}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} className={`w-full pl-11 pr-12 py-3 rounded-lg border ${touched.confirmPassword && errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'} bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
                {touched.confirmPassword && !errors.confirmPassword && formData.confirmPassword && <div className="flex items-center gap-1 mt-2 text-sm text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4" /><span>Passwords match</span></div>}
                {touched.confirmPassword && errors.confirmPassword && <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400"><AlertCircle className="w-4 h-4" /><span>{errors.confirmPassword}</span></div>}
              </div>

              {apiResponse && <div className={`p-4 rounded-lg border ${apiResponse.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}><div className="flex items-start gap-2">{apiResponse.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}<p className={`text-sm ${apiResponse.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{apiResponse.message}</p></div></div>}

              <button type="button" onClick={handleSubmit} disabled={!isFormValid() || isSubmitting} className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${!isFormValid() || isSubmitting ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}`}>{isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" />Creating Account...</span> : 'Create Account'}</button>
            
              <div className="mt-6 text-center"><p className="text-sm text-gray-600 dark:text-gray-400">Already have an account? <a href="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">Log in</a></p></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center"><div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /></div></div>
              <div className="text-center"><p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Enter the 6-digit code we sent to<br /><span className="font-medium text-gray-900 dark:text-white">{formData.email}</span></p></div>
              
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input key={index} id={`code-${index}`} type="text" maxLength={1} value={verificationCode[index]} onChange={(e) => handleCodeChange(index, e.target.value)} onKeyDown={(e) => handleCodeKeyDown(index, e)} className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                ))}
              </div>

              {apiResponse && <div className={`p-4 rounded-lg border ${apiResponse.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}><div className="flex items-start gap-2">{apiResponse.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />}<p className={`text-sm ${apiResponse.type === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{apiResponse.message}</p></div></div>}

              <button type="button" onClick={handleVerify} disabled={verificationCode.join('').length !== 6 || isVerifying} className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${verificationCode.join('').length !== 6 || isVerifying ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'}`}>{isVerifying ? <span className="flex items-center justify-center gap-2"><Loader className="w-5 h-5 animate-spin" />Verifying...</span> : 'Verify Account'}</button>

              <div className="text-center"><p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Didn't receive the code?</p><button type="button" onClick={handleResendCode} disabled={isSubmitting} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50">Resend Code</button></div>

              <button type="button" onClick={() => { setStep('signup'); setVerificationCode(['', '', '', '', '', '']); setApiResponse(null); }} className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">← Back to signup</button>
            </div>
          )}
        </div>

        {step === 'signup' && <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">By signing up, you agree to our <a href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">Terms of Service</a> and <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">Privacy Policy</a></p>}
      </div>
    </div>
  );
}