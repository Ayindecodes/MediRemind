// components/NewsletterSection.tsx
"use client";

export default function NewsletterSection() {
  return (
    <section id="newsletter" className="w-full py-20 px-6 md:px-12 bg-gray-50 dark:bg-[#0f172a] transition-all duration-300">
      <div className="max-w-2xl mx-auto text-center p-10 bg-white dark:bg-[#1e293b] backdrop-blur-lg border border-white/20 rounded-xl shadow-md">
        <h2 className="text-3xl font-bold font-inter text-gray-900 dark:text-gray-100 mb-4">
          Subscribe to Our Newsletter
        </h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 font-inter">
          Get the latest updates and health tips straight to your inbox.
        </p>
        <form className="flex flex-col md:flex-row gap-4 justify-center">
          <input
            type="email"
            placeholder="Your email"
            className="px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0f172a] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white rounded-lg shadow-md hover:shadow-lg transition"
          >
            Subscribe
          </button>
        </form>
      </div>
    </section>
  );
}
