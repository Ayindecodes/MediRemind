"use client";

import React, { useState, useEffect } from 'react';
import { 
  Check, X, Crown, Users, Zap, ArrowLeft, Star,
  Shield, Sparkles, TrendingUp
} from 'lucide-react';

interface User {
  plan: 'free' | 'individual' | 'family';
  fullName: string;
  email: string;
}

export default function UpgradePage() {
  const [user, setUser] = useState<User | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      window.location.href = '/login';
    }
  }, []);

  const handleUpgrade = async (plan: 'individual' | 'family') => {
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/user/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          plan,
          billingCycle
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update localStorage
        const updatedUser = { ...user, plan };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        alert(`🎉 Successfully upgraded to ${plan === 'individual' ? 'Premium' : 'Family'} plan!`);
        window.location.href = '/dashboard';
      } else {
        throw new Error('Upgrade failed');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to upgrade. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) return null;

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Zap,
      tagline: 'Perfect to get started',
      price: { monthly: 0, yearly: 0 },
      features: [
        { text: 'Up to 3 medications', included: true },
        { text: 'Basic reminders', included: true },
        { text: '7-day history', included: true },
        { text: 'Single profile', included: true },
        { text: 'Email support', included: true },
        { text: 'Photo uploads', included: false },
        { text: 'Health coach sessions', included: false },
        { text: 'Advanced analytics', included: false },
        { text: 'Family mode', included: false },
      ],
      cta: 'Current Plan',
      disabled: user.plan === 'free',
      popular: false
    },
    {
      id: 'individual',
      name: 'Premium',
      icon: Star,
      tagline: 'For serious health tracking',
      price: { monthly: 3, yearly: 30 },
      features: [
        { text: 'Unlimited medications', included: true },
        { text: 'Smart adaptive reminders', included: true },
        { text: 'Full medication history', included: true },
        { text: 'Photo uploads for pills', included: true },
        { text: 'Health coach sessions', included: true },
        { text: 'Advanced analytics & insights', included: true },
        { text: 'PDF export for doctors', included: true },
        { text: 'Refill reminders', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Cloud sync across devices', included: true },
      ],
      cta: user.plan === 'individual' ? 'Current Plan' : 'Upgrade to Premium',
      disabled: user.plan === 'individual' || user.plan === 'family',
      popular: true
    },
    {
      id: 'family',
      name: 'Family',
      icon: Users,
      tagline: 'For the whole household',
      price: { monthly: 8, yearly: 80 },
      features: [
        { text: 'Everything in Premium', included: true },
        { text: 'Unlimited family profiles', included: true },
        { text: 'Caregiver access & permissions', included: true },
        { text: 'Shared medication schedules', included: true },
        { text: 'Family adherence dashboard', included: true },
        { text: 'Multiple device support', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Phone support', included: true },
        { text: 'Custom onboarding', included: true },
        { text: 'Early access to new features', included: true },
      ],
      cta: user.plan === 'family' ? 'Current Plan' : 'Upgrade to Family',
      disabled: user.plan === 'family',
      popular: false
    }
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Upgrade to unlock powerful features and never miss a dose
          </p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            billingCycle === 'monthly'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
            billingCycle === 'yearly'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Yearly
          <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
            Save 17%
          </span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
          const isCurrentPlan = 
            (plan.id === 'free' && user.plan === 'free') ||
            (plan.id === 'individual' && user.plan === 'individual') ||
            (plan.id === 'family' && user.plan === 'family');

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-slate-800 rounded-2xl border-2 p-8 transition-all ${
                plan.popular
                  ? 'border-indigo-600 shadow-2xl scale-105'
                  : 'border-gray-200 dark:border-gray-700'
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  MOST POPULAR
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Current
                </div>
              )}

              <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 ${
                  plan.id === 'free' ? 'bg-gray-100 dark:bg-slate-700' :
                  plan.id === 'individual' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                  'bg-gradient-to-br from-amber-500 to-orange-600'
                }`}>
                  <Icon className={`w-8 h-8 ${plan.id === 'free' ? 'text-gray-600' : 'text-white'}`} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.tagline}
                </p>
              </div>

              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    ${price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && plan.id !== 'free' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ${(price / 12).toFixed(2)}/month billed annually
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (plan.id === 'individual') handleUpgrade('individual');
                  if (plan.id === 'family') handleUpgrade('family');
                }}
                disabled={plan.disabled || isProcessing}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-6 ${
                  plan.disabled || isCurrentPlan
                    ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:scale-105'
                }`}
              >
                {isProcessing ? 'Processing...' : plan.cta}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${
                      feature.included
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Frequently Asked Questions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Is my data secure?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Yes! All your data is encrypted and stored securely. We never share your medical information with third parties.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Can I cancel anytime?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Absolutely! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              How many profiles in Family plan?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unlimited! Add as many family members as you need. Perfect for managing medications for children, elderly parents, or the entire household.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              What payment methods do you accept?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We accept all major credit cards, debit cards, and PayPal. All payments are processed securely through Stripe.
            </p>
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Trusted by thousands of users worldwide
        </p>
        <div className="flex items-center justify-center gap-8 opacity-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-sm">HIPAA Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-sm">SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            <span className="text-sm">30-Day Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
}