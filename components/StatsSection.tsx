import React, { useState, useEffect } from 'react';
import { Users, Activity, Calendar, Pill } from 'lucide-react';

export default function StatsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({
    users: 0,
    adherence: 0,
    families: 0
  });

  // Animate numbers on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          animateNumbers();
        }
      },
      { threshold: 0.3 }
    );

    const section = document.getElementById('stats');
    if (section) observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const animateNumbers = () => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    const targets = {
      users: 10234,
      adherence: 98,
      families: 4562
    };

    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setCounts({
        users: Math.floor(targets.users * progress),
        adherence: Math.floor(targets.adherence * progress),
        families: Math.floor(targets.families * progress)
      });

      if (currentStep >= steps) {
        setCounts(targets);
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const stats = [
    {
      icon: Users,
      value: counts.users.toLocaleString(),
      suffix: "+",
      label: "Users Helped",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Activity,
      value: counts.adherence,
      suffix: "%",
      label: "Adherence Rate",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      valueColor: "text-green-600 dark:text-green-400"
    },
    {
      icon: Calendar,
      value: counts.families.toLocaleString(),
      suffix: "+",
      label: "Family Accounts",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      valueColor: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <section
      id="stats"
      className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Our Impact in Numbers
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real results from real people using MediRemind every day
          </p>
        </div>

        {/* Two Column Layout: Image + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Image Container */}
          <div className="relative order-2 lg:order-1">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl transform rotate-3"></div>
            
            {/* Image Placeholder - Replace with your actual image */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-8 border-white dark:border-slate-700">
              {/* Placeholder for actual image */}
              <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                {  <img src="/impact.jpg" alt="MediRemind Impact" className="w-full h-full object-cover" /> }
               
              </div>

              {/* Floating Badge on Image */}
              <div className="absolute top-6 right-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">⭐</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">4.9/5</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">User Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Stats Cards */}
          <div className="space-y-6 order-1 lg:order-2">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-6 p-6 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-16 h-16 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-8 h-8 ${stat.iconColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className={`text-4xl font-bold ${stat.valueColor} mb-1`}>
                      {stat.value}
                      <span className="text-2xl">{stat.suffix}</span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Additional Info Card */}
            <div className="mt-8 p-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl text-white">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Join Our Community</h3>
                  <p className="text-indigo-100 text-sm mb-4">
                    Be part of thousands who have transformed their medication adherence and health outcomes.
                  </p>
                  <a
                    href="/signup"
                    className="inline-block px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
                  >
                    Get Started Free →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          {[
            { value: "150+", label: "Countries", emoji: "🌍" },
            { value: "24/7", label: "Support", emoji: "💬" },
            { value: "99.9%", label: "Uptime", emoji: "⚡" },
            { value: "2M+", label: "Doses Tracked", emoji: "💊" }
          ].map((metric, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{metric.emoji}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}