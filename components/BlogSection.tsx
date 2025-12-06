import React, { useState } from 'react';
import { ArrowRight, Clock, User, Tag } from 'lucide-react';

const blogPosts = [
  { 
    title: "5 Tips to Remember Your Medication", 
    img: "/blog1.png", 
    excerpt: "Discover proven strategies to never miss a dose and build lasting medication habits.",
    link: "#",
    author: "Dr. Sarah Johnson",
    date: "Dec 1, 2024",
    readTime: "5 min read",
    category: "Tips & Tricks"
  },
  { 
    title: "How MediRemind Improves Health Outcomes", 
    img: "/blog2.png", 
    excerpt: "Real stories from users who transformed their health with consistent medication adherence.",
    link: "#",
    author: "Michael Chen",
    date: "Nov 28, 2024",
    readTime: "7 min read",
    category: "Success Stories"
  },
  { 
    title: "Family Medication Management Made Easy", 
    img: "/blog3.png", 
    excerpt: "A complete guide to managing medications for your entire family from one account.",
    link: "#",
    author: "Emily Rodriguez",
    date: "Nov 25, 2024",
    readTime: "6 min read",
    category: "Family Care"
  },
];

export default function BlogSection() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <section 
      id="blog" 
      className="relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 transition-all duration-300 overflow-hidden"
    >
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-6">
            <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              Latest Insights
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            From Our
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Health Blog
            </span>
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Expert tips, success stories, and guides to help you stay on top of your medication routine.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => {
            const isHovered = hoveredIndex === index;

            return (
              <article
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ${
                  isHovered ? '-translate-y-2' : ''
                }`}
              >
                {/* Image Container */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-slate-700 dark:to-slate-600 overflow-hidden">
{/* Placeholder - Replace with actual image */}
                 
                  
                  {
                  <img 
                    src="/medd.png"
                    alt="Medication Practice"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                  }

                  {/* Category Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {post.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{post.readTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{post.author}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Date & Read More Link */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {post.date}
                    </span>
                    <a
                      href={post.link}
                      className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:gap-3 transition-all"
                    >
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Hover Border Effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-600 dark:group-hover:border-indigo-400 rounded-2xl transition-all duration-300 pointer-events-none"></div>
              </article>
            );
          })}
        </div>

        {/* View All Blog Button */}
        <div className="text-center mt-12">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            View All Articles
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>

        {/* Newsletter Signup (Bonus) */}
        <div className="mt-20 p-8 md:p-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl shadow-2xl text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Stay Updated with Health Tips
            </h3>
            <p className="text-indigo-100 mb-6">
              Get weekly medication reminders, health tips, and exclusive content delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-indigo-200 mt-4">
              No spam. Unsubscribe anytime. 🔒
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}