import React, { useState } from 'react';
import { Check, Zap, Star, Crown, ArrowRight, X } from 'lucide-react';

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const plans = [
    {
      name: "Free",
      tagline: "Perfect to get started",
      icon: Zap,
      price: {
        monthly: 0,
        yearly: 0
      },
      period: "forever",
      features: [
        "Up to 3 medications",
        "Basic reminders",
        "7-day history",
        "Single profile",
        "Email support"
      ],
      limitations: [
        "No family mode",
        "No PDF export",
        "Limited analytics"
      ],
      cta: "Get Started Free",
      ctaLink: "/signup",
      popular: false,
      gradient: "from-gray-500 to-gray-600"
    },
    {
      name: "Premium",
      tagline: "For serious health tracking",
      icon: Star,
      price: {
        monthly: 3,
        yearly: 30
      },
      period: billingCycle === 'monthly' ? 'per month' : 'per year',
      savings: billingCycle === 'yearly' ? 'Save $6/year' : null,
      features: [
        "Unlimited medications",
        "Smart adaptive reminders",
        "Full medication history",
        "Family mode (up to 5 profiles)",
        "Advanced analytics & insights",
        "PDF export for doctors",
        "Refill reminders",
        "Photo uploads for pills",
        "Priority email support",
        "Cloud sync across devices"
      ],
      limitations: [],
      cta: "Start Premium",
      ctaLink: "/signup?plan=premium",
      popular: true,
      gradient: "from-indigo-600 to-purple-600"
    },
    {
      name: "Family",
      tagline: "For the whole household",
      icon: Crown,
      price: {
        monthly: 8,
        yearly: 80
      },
      period: billingCycle === 'monthly' ? 'per month' : 'per year',
      savings: billingCycle === 'yearly' ? 'Save $16/year' : null,
      features: [
        "Everything in Premium",
        "Unlimited family profiles",
        "Caregiver access & permissions",
        "Shared medication schedules",
        "Family adherence dashboard",
        "Multiple device support",
        "Dedicated account manager",
        "Phone support",
        "Custom onboarding",
        "Early access to new features"
      ],
      limitations: [],
      cta: "Start Family Plan",
      ctaLink: "/signup?plan=family",
      popular: false,
      gradient: "from-amber-500 to-orange-600"
    }
  ];

  return (
    <section 
      id="pricing" 
      className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 transition-all duration-300 overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-6">
            <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Simple, Transparent Pricing
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Perfect Plan
            </span>
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
            Start free, upgrade anytime. No credit card required for free plan.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1 bg-gray-200 dark:bg-slate-700 rounded-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all duration-200 relative ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                SAVE
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div
                key={index}
                className={`relative bg-white dark:bg-slate-800 rounded-3xl border-2 ${
                  plan.popular 
                    ? 'border-indigo-600 dark:border-indigo-500 shadow-2xl transform scale-105' 
                    : 'border-gray-200 dark:border-gray-700 shadow-lg'
                } transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 overflow-hidden`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className={`absolute top-0 right-0 bg-gradient-to-r ${plan.gradient} text-white px-6 py-2 text-sm font-bold`}>
                    MOST POPULAR
                  </div>
                )}

                {/* Card Content */}
                <div className="p-8">
                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        /{plan.period}
                      </span>
                    </div>
                    {plan.savings && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                        {plan.savings}
                      </p>
                    )}
                  </div>

                  {/* CTA Button */}
                  <a
                    href={plan.ctaLink}
                    className={`block w-full text-center px-6 py-4 rounded-xl font-semibold transition-all duration-200 mb-6 ${
                      plan.popular
                        ? `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:shadow-xl hover:scale-105`
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {plan.cta}
                  </a>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      What's included:
                    </p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Limitations (only for Free plan) */}
                  {plan.limitations.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        Not included:
                      </p>
                      {plan.limitations.map((limitation, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {limitation}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Trust Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6">
            <div className="text-3xl mb-3">✓</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Cancel Anytime
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No contracts, no hidden fees. Cancel with just one click.
            </p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-3">💳</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Secure Payments
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              All transactions encrypted and protected by Stripe.
            </p>
          </div>
          <div className="p-6">
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              14-Day Money Back
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Not happy? Get a full refund within 14 days, no questions asked.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center p-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-2xl">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Still not sure? Try it free!
          </h3>
          <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
            Start with our free plan and upgrade anytime. No credit card required.
          </p>
          <a
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}