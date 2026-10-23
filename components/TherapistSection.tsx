import React from 'react';
import { MessageCircle } from 'lucide-react';
import Image from 'next/image';

// The Health Coach isn't built yet, so this section only describes it as planned
export default function TherapistSection() {
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
                Coming Later
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
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              We are planning a Health Coach feature that would connect you with qualified
              professionals for guidance on building lasting medication habits. It is not available
              yet.
            </p>
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

                {
                  <Image
                    src="/therapy.jpg"
                    alt="Professional therapist consultation"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover rounded-3xl"
                  />
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
