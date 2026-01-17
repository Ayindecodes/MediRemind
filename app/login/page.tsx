"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, CheckCircle, Loader, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'verify'>('login');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [apiResponse, setApiResponse] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        return !value.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Please enter a valid email' : '';
      case 'password':
        return !value ? 'Password is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (touched[name as keyof typeof touched]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => formData.email.trim() !== '' && formData.password !== '' && !errors.email && !errors.password;

  const handleLogin = async () => {
    setTouched({ email: true, password: true });
    const newErrors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password)
    };
    setErrors(newErrors);
    
    if (Object.values(newErrors).some(error => error !== '')) return;

    setIsSubmitting(true);
    setApiResponse(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.requiresVerification) {
        setApiResponse({ type: 'success', message: `Verification code sent to ${formData.email}!` });
        setTimeout(() => setStep('verify'), 1000);
      } else if (!response.ok) {
        if (response.status === 429) {
          setApiResponse({ 
            type: 'error', 
            message: data.message || 'Too many attempts. Please try again later.' 
          });
        } else if (response.status === 403) {
          setApiResponse({ 
            type: 'warning', 
            message: data.message || 'Please verify your email first.' 
          });
        } else {
          setApiResponse({ 
            type: 'error', 
            message: data.message || 'Login failed. Please check your credentials.' 
          });
        }
      }
    } catch (error) {
      setApiResponse({ type: 'error', message: 'Network error. Please check your connection.' });
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
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      document.getElementById(`code-${index - 1}`)?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setApiResponse({ type: 'error', message: 'Please enter the complete 6-digit code' });
      return;
    }

    setIsVerifying(true);
    setApiResponse(null);

    try {
      const response = await fetch('/api/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code })
      });

      const data = await response.json();

      if (response.ok) {
        setApiResponse({ type: 'success', message: 'Login successful! Redirecting...' });
        
        // Store the JWT token
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        setTimeout(() => window.location.href = '/dashboard', 2000);
      } else {
        setApiResponse({ type: 'error', message: data.message || 'Invalid code. Please try again.' });
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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setApiResponse({ type: 'success', message: 'New code sent! Check your email.' });
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {step === 'login' ? 'Welcome Back' : 'Verify Your Login'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {step === 'login' ? 'Enter your credentials to access your account' : `We sent a 6-digit code to ${formData.email}`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {step === 'login' ? (
            <div className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && isFormValid() && handleLogin()}
                    className={`w-full pl-11 pr-4 py-3 rounded-lg border ${
                      touched.email && errors.email
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                    } bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                    placeholder="john@example.com"
                  />
                </div>
                {touched.email && errors.email && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && isFormValid() && handleLogin()}
                    className={`w-full pl-11 pr-12 py-3 rounded-lg border ${
                      touched.password && errors.password
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'
                    } bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {apiResponse && (
                <div className={`p-4 rounded-lg border ${
                  apiResponse.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : apiResponse.type === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {apiResponse.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        apiResponse.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                      }`} />
                    )}
                    <p className={`text-sm ${
                      apiResponse.type === 'success'
                        ? 'text-green-800 dark:text-green-300'
                        : apiResponse.type === 'warning'
                        ? 'text-yellow-800 dark:text-yellow-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {apiResponse.message}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleLogin}
                disabled={!isFormValid() || isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                  !isFormValid() || isSubmitting
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>

              <div className="text-center">
                <a href="/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  Forgot your password?
                </a>
              </div>

              <div className="mt-6 text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <a href="/signup" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    Sign up
                  </a>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  For your security, enter the 6-digit code we sent to<br />
                  <span className="font-medium text-gray-900 dark:text-white">{formData.email}</span>
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    maxLength={1}
                    value={verificationCode[index]}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                ))}
              </div>

              {apiResponse && (
                <div className={`p-4 rounded-lg border ${
                  apiResponse.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {apiResponse.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-sm ${
                      apiResponse.type === 'success'
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}>
                      {apiResponse.message}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verificationCode.join('').length !== 6 || isVerifying}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                  verificationCode.join('').length !== 6 || isVerifying
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isVerifying ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Didn't receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSubmitting}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setVerificationCode(['', '', '', '', '', '']);
                  setApiResponse(null);
                }}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to login
              </button>
            </div>
          )}
        </div>

        {step === 'login' && (
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Secured with two-factor email verification</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}