import React, { useState } from 'react';
import { Bell, Users, TrendingUp, Calendar, Zap, Shield, Clock, Heart, Award, Smartphone, Cloud, FileText } from 'lucide-react';

export default function FeaturesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const features = [
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Adaptive notifications that learn your schedule and never let you miss a dose.",
      gradient: "from-blue-500 to-cyan-500",
      benefits: ["Missed dose detection", "Snooze with follow-ups", "Custom sounds"]
    },
    {
      icon: Award,
      title: "Streak Tracking",
      description: "Stay motivated with gamified streaks, badges, and achievement rewards.",
      gradient: "from-purple-500 to-pink-500",
      benefits: ["Daily streaks", "Achievement badges", "Progress rings"]
    },
    {
      icon: TrendingUp,
      title: "Analytics & Insights",
      description: "Visualize your adherence with beautiful charts and detailed reports.",
      gradient: "from-green-500 to-emerald-500",
      benefits: ["Weekly trends", "Adherence score", "PDF export"]
    },
    {
      icon: Users,
      title: "Family Mode",
      description: "Manage medications for your entire family from one account.",
      gradient: "from-orange-500 to-red-500",
      benefits: ["Multiple profiles", "Caregiver access", "Shared schedules"]
    },
    {
      icon: Calendar,
      title: "Refill Reminders",
      description: "Never run out of medication with automatic refill alerts.",
      gradient: "from-indigo-500 to-purple-500",
      benefits: ["Auto-calculate", "Pharmacy notes", "7-day warnings"]
    },
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Access your medications from any device, anywhere, anytime.",
      gradient: "from-cyan-500 to-blue-500",
      benefits: ["Cross-device", "Offline mode", "Real-time sync"]
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your health data is encrypted and never shared with third parties.",
      gradient: "from-slate-500 to-gray-600",
      benefits: ["End-to-end encrypted", "HIPAA compliant", "No data selling"]
    },
    {
      icon: Smartphone,
      title: "Beautiful UI",
      description: "Gorgeous glassmorphic design that makes health tracking enjoyable.",
      gradient: "from-pink-500 to-rose-500",
      benefits: ["Dark mode", "Smooth animations", "Intuitive UX"]
    },
    {
      icon: FileText,
      title: "History Export",
      description: "Generate professional PDF reports for your doctor appointments.",
      gradient: "from-amber-500 to-yellow-500",
      benefits: ["PDF generation", "Full history", "Doctor-ready"]
    }
  ];

  return (
    <section
      id="features"
      className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 transition-all duration-300 overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-6">
            <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Powerful Features
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Stay On Track
            </span>
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From smart reminders to family management, MediRemind has every feature 
            you need to never miss a medication again.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group relative p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl transition-all duration-300 ${
                  isHovered ? '-translate-y-2' : ''
                }`}
              >
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                {/* Icon */}
                <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${feature.gradient}`}></div>
                      {benefit}
                    </li>
                  ))}
                </ul>

                {/* Hover Arrow */}
                <div className={`absolute bottom-6 right-6 text-indigo-600 dark:text-indigo-400 transition-all duration-300 ${
                  isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                }`}>
                  →
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-2xl">
            <div className="flex-1 text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Ready to take control of your health?
              </h3>
              <p className="text-indigo-100">
                Join thousands of users who never miss their medications.
              </p>
            </div>
            <a
              href="/signup"
              className="px-8 py-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 whitespace-nowrap"
            >
              Get Started Free →
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "10,000+", label: "Active Users", icon: Users },
            { value: "98%", label: "Adherence Rate", icon: TrendingUp },
            { value: "4.9/5", label: "User Rating", icon: Award },
            { value: "50M+", label: "Reminders Sent", icon: Bell }
          ].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-3">
                  <StatIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
