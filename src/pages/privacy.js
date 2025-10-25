"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Privacy() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src="/logomain.png"
                  alt="EZBillify"
                  width={42}
                  height={42}
                  className="rounded-xl shadow-md"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EZBillify</h1>
                <p className="text-xs text-gray-500">Technologies</p>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Home</Link>
              <Link href="/about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About</Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Contact</Link>
            </div>
            
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Access Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`pt-32 pb-12 px-6 transition-all duration-1500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Last Updated: January 2025
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Privacy Policy
          </h1>
          
          <p className="text-xl text-gray-600">
            Your privacy is important to us. This policy explains how we collect, use, and protect your information.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            
            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We collect information that you provide directly to us when using EZBillify services, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Account information (name, email, phone number, company details)</li>
              <li>Business data (invoices, inventory, customer information)</li>
              <li>Payment information (processed securely through third-party providers)</li>
              <li>Usage data and analytics</li>
              <li>Communication preferences</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and security alerts</li>
              <li>Respond to comments, questions, and customer service requests</li>
              <li>Comply with legal obligations and prevent fraud</li>
              <li>Analyze usage trends and optimize user experience</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">3. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Bank-grade encryption (SSL/TLS) for data transmission</li>
              <li>Secure data storage with regular backups</li>
              <li>Access controls and authentication measures</li>
              <li>Regular security audits and monitoring</li>
              <li>Compliance with GST and Indian data protection regulations</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">4. Data Sharing</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We do not sell your personal information. We may share your data only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations</li>
              <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
              <li>In connection with a business transfer or acquisition</li>
              <li>To protect rights, property, or safety of EZBillify, users, or others</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">5. Your Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Access and update your personal information</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent at any time</li>
              <li>Lodge a complaint with appropriate authorities</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We use cookies and similar technologies to enhance your experience. You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We retain your information for as long as necessary to provide services and comply with legal obligations. Business records may be retained for up to 7 years as per GST regulations.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect information from children.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">9. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We may update this privacy policy from time to time. We will notify you of significant changes via email or through our platform.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have questions about this privacy policy or your data, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <p className="text-gray-700 mb-2"><strong>Email:</strong> ezbillify@gmail.com</p>
              <p className="text-gray-700 mb-2"><strong>Phone:</strong> +91 98765 43210</p>
              <p className="text-gray-700"><strong>Address:</strong> Bengaluru, Karnataka, India</p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Experience secure and compliant business automation with EZBillify.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Start Free Trial
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}