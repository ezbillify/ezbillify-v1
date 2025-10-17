"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Terms() {
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
                <Image
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
            Effective Date: January 2025
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
            Terms of Service
          </h1>
          
          <p className="text-xl text-gray-600">
            Please read these terms carefully before using EZBillify services.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            
            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              By accessing and using EZBillify Technologies' services ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Services.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">2. Description of Services</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              EZBillify provides:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Cloud-based billing and invoicing platform with GST compliance</li>
              <li>Inventory management and tracking</li>
              <li>E-invoice and e-way bill generation</li>
              <li>Financial reporting and analytics</li>
              <li>Customer and vendor management</li>
              <li>API integrations with third-party services</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              To use our Services, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Be at least 18 years old or have parental consent</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not share your account with unauthorized persons</li>
              <li>Immediately notify us of any unauthorized access</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">4. Subscription and Payments</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Free Trial:</strong> We offer a 14-day free trial. No credit card required.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Paid Subscriptions:</strong> After the trial period, you may subscribe to a paid plan. Fees are charged in advance on a monthly or annual basis.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Billing:</strong> You authorize us to charge your payment method automatically. Failure to pay may result in service suspension.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Refunds:</strong> We offer refunds within 7 days of purchase if you're not satisfied. Refunds are processed within 10 business days.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">5. User Responsibilities</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>Provide accurate business information and data</li>
              <li>Use the Services in compliance with Indian laws, including GST regulations</li>
              <li>Not use the Services for illegal or fraudulent activities</li>
              <li>Not attempt to reverse engineer, hack, or compromise our Services</li>
              <li>Not upload malicious code, viruses, or harmful content</li>
              <li>Not impersonate others or provide false information</li>
              <li>Maintain regular backups of your data</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">6. Data Ownership and Usage</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Your Data:</strong> You retain ownership of all data you input into our Services. We do not claim ownership of your business data.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Our Rights:</strong> You grant us a license to use your data to provide Services, perform analytics, and improve our platform.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Data Backup:</strong> While we perform regular backups, you are responsible for maintaining your own backups.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">7. Service Availability</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We strive for 99.9% uptime but do not guarantee uninterrupted service. Scheduled maintenance will be announced in advance. We are not liable for service interruptions caused by factors beyond our control.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">8. Intellectual Property</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              All content, features, and functionality of the Services are owned by EZBillify Technologies and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our intellectual property without permission.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-6">
              <li>EZBillify is provided "as is" without warranties of any kind</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
              <li>We are not responsible for data loss, though we make best efforts to prevent it</li>
            </ul>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">10. GST Compliance Disclaimer</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              While EZBillify provides tools for GST compliance, you are ultimately responsible for ensuring your tax filings are accurate and timely. We recommend consulting with a qualified tax professional.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">11. Termination</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>By You:</strong> You may cancel your subscription at any time through your account settings.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>By Us:</strong> We may terminate or suspend your account if you violate these Terms or engage in fraudulent activity.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              <strong>Effect of Termination:</strong> Upon termination, you will lose access to the Services. You may export your data before termination.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">12. Modifications to Terms</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              We may modify these Terms at any time. We will notify you of significant changes via email or through the platform. Continued use of Services after changes constitutes acceptance.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">13. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              These Terms are governed by the laws of India. Any disputes shall be resolved in the courts of Bengaluru, Karnataka.
            </p>

            <h2 className="text-3xl font-bold text-gray-900 mt-8 mb-4">14. Contact Information</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              For questions about these Terms, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <p className="text-gray-700 mb-2"><strong>Company:</strong> EZBillify Technologies</p>
              <p className="text-gray-700 mb-2"><strong>Email:</strong> ezbillify@gmail.com</p>
              <p className="text-gray-700 mb-2"><strong>Phone:</strong> +91 98765 43210</p>
              <p className="text-gray-700"><strong>Address:</strong> Bengaluru, Karnataka, India</p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 mt-8">
              <p className="text-blue-900 font-semibold mb-2">Agreement</p>
              <p className="text-blue-800">
                By using EZBillify, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of businesses streamlining their operations with EZBillify.
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
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}