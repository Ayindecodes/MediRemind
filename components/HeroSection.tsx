import React, { useState, useEffect } from 'react';
import { ArrowRight, Play, CheckCircle, Sparkles, Calendar, Bell, TrendingUp } from 'lucide-react';

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Floating animation for pills
  const FloatingPill = ({ delay, duration, emoji }) => (
    <div
      className="absolute opacity-20 dark:opacity-10"
      style={{
        animation: `float ${duration}s ease-in-out ${delay}s infinite`,
      }}
    >
      <span className="text-4xl md:text-6xl">{emoji}</span>
    </div>
  );

  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20 md:py-0 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 overflow-hidden transition-all duration-300"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingPill delay={0} duration={6} emoji="💊" />
        <FloatingPill delay={1} duration={8} emoji="🩺" />
        <FloatingPill delay={2} duration={7} emoji="⏰" />
        <FloatingPill delay={0.5} duration={9} emoji="📋" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content Container */}
      <div className="relative max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          
          {/* Left: Text Content */}
          <div 
            className={`flex-1 flex flex-col gap-6 text-center lg:text-left transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 self-center lg:self-start px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 w-fit">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                #1 Medication Tracker
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
              <span className="text-gray-900 dark:text-white">
                Never Miss Your
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Medication Again
              </span>
              <span className="inline-block ml-2 text-5xl lg:text-6xl animate-bounce">💊</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
              Smart reminders, streak tracking, and beautiful design that makes staying healthy 
              <span className="font-semibold text-indigo-600 dark:text-indigo-400"> actually enjoyable</span>.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Free Forever</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">No Credit Card</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">10,000+ Users</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center lg:justify-start">
              <a
                href="/signup"
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              
              <a
                href="#demo"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </a>
            </div>

            {/* Social Proof */}
            <div className="flex items-center gap-4 justify-center lg:justify-start mt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">4.9/5</span> from 2,450 reviews
                </p>
              </div>
            </div>
          </div>

          {/* Right: App Preview */}
          <div 
            className={`flex-1 relative transition-all duration-1000 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            {/* Glassmorphic Container */}
            <div className="relative max-w-2xl mx-auto">
              {/* Floating Stats Cards */}
              <div className="absolute -top-8 -left-8 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">98%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Adherence Rate</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">47</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Day Streak</p>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Preview */}
              <div className="relative bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-2xl">
                {/* Mock Dashboard */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
                  {/* Dashboard Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Today's Medications</h3>
                    <p className="text-indigo-100 text-sm">Tuesday, December 3, 2024</p>
                  </div>

                  {/* Medication Cards */}
                  <div className="p-6 space-y-4">
                    {[
                      { name: 'Aspirin', time: '8:00 AM', status: 'taken', color: 'from-blue-500 to-cyan-500' },
                      { name: 'Vitamin D', time: '2:00 PM', status: 'upcoming', color: 'from-amber-500 to-orange-500' },
                      { name: 'Blood Pressure', time: '8:00 PM', status: 'pending', color: 'from-purple-500 to-pink-500' },
                    ].map((med, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${med.color} flex items-center justify-center text-white text-xl shadow-lg`}>
                            💊
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{med.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{med.time}</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          med.status === 'taken' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {med.status === 'taken' ? '✓ Taken' : 'Pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(5deg); }
          50% { transform: translateY(-10px) rotate(-5deg); }
          75% { transform: translateY(-30px) rotate(3deg); }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}