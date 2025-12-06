import React from 'react';
import { Calendar, Video, Clock, CheckCircle, MessageCircle, Shield } from 'lucide-react';
import Image from "next/image";


export default function TherapistSection() {
  const benefits = [
    { icon: Video, text: "Video & voice consultations" },
    { icon: Calendar, text: "Flexible scheduling 24/7" },
    { icon: Shield, text: "100% confidential & secure" },
    { icon: Clock, text: "Get help within minutes" }
  ];

  return (
    <section 
      id="therapist" 
      className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 transition-all duration-300 overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Content */}
          <div className="order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-6">
              <MessageCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                Professional Support
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Need Help Staying
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                On Track?
              </span>
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              Connect with certified health professionals who understand medication adherence challenges. 
              Get personalized guidance, support, and strategies to build lasting habits.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug pt-2">
                      {benefit.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/book-session"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                <Calendar className="w-5 h-5" />
                Book a Session
              </a>
              <a
                href="/learn-more"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-600 dark:hover:border-indigo-500 transition-all duration-200"
              >
                Learn More
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Licensed Professionals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>

          {/* Right Side: Image */}
          <div className="relative order-1 lg:order-2">
            {/* Decorative Background Element */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-3xl transform rotate-6"></div>
            
            {/* Image Container */}
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border-8 border-white dark:border-slate-700">
              {/* Image Placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                {/* Replace this div with your actual image */}
                
                {<Image
  src="/therapy.jpg"
  alt="Professional therapist consultation"
  width={800}
  height={600}
  className="w-full h-full object-cover rounded-3xl"
/>
}
              </div>

              {/* Floating Stats/Badges */}
              <div className="absolute top-6 left-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">1,000+</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Sessions Completed</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">4.9/5</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Average Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Quick Response",
              description: "Get matched with a therapist in under 5 minutes",
              emoji: "⚡"
            },
            {
              title: "Affordable Care",
              description: "Sessions starting at just $29 per consultation",
              emoji: "💰"
            },
            {
              title: "Expert Guidance",
              description: "Certified professionals with medication adherence expertise",
              emoji: "🎓"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{feature.emoji}</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}