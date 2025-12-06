// components/Footer.tsx
"use client";

import { FaTwitter, FaFacebook, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="w-full py-12 px-6 md:px-12 bg-gray-50 dark:bg-[#1e293b] transition-all duration-300">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-gray-700 dark:text-gray-300 font-inter">
          © 2025 MediRemind. All rights reserved.
        </p>
        <div className="flex gap-4 text-gray-700 dark:text-gray-300">
          <a href="#"><FaTwitter size={20} /></a>
          <a href="#"><FaFacebook size={20} /></a>
          <a href="#"><FaInstagram size={20} /></a>
        </div>
      </div>
    </footer>
  );
}
