// src/pages/contact.js - EZBillify V1
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const CONTACT_INFO = [
  {
    icon: "📧",
    title: "Email Us",
    details: "ezbillify@gmail.com",
    action: "mailto:ezbillify@gmail.com"
  },
  {
    icon: "📱",
    title: "Call Us",
    details: "+91 98765 43210",
    action: "tel:+919876543210"
  },
  {
    icon: "📍",
    title: "Visit Us",
    details: "Bengaluru, Karnataka, India",
    action: "#"
  },
  {
    icon: "🕒",
    title: "Business Hours",
    details: "Mon - Fri: 9:00 AM - 6:00 PM",
    action: "#"
  }
];

const OFFICE_LOCATIONS = [
  {
    city: "Bengaluru",
    address: "Electronic City, Bengaluru, Karnataka 560100",
    phone: "+91 98765 43210",
    email: "bengaluru@ezbillify.com"
  }
];

export default function Contact() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [submitStatus, setSubmitStatus] = useState("");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus("sending");
    
    try {
      // Simulate form submission - replace with actual EmailJS or API call
      setTimeout(() => {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          company: "",
          phone: "",
          subject: "",
          message: ""
        });
        setTimeout(() => setSubmitStatus(""), 3000);
      }, 1000);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus(""), 3000);
    }
  };

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
              <Link href="/contact" className="text-blue-600 font-medium">Contact</Link>
              <Link href="/careers" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Careers</Link>
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
      <section className={`pt-32 pb-20 px-6 transition-all duration-1500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Get in Touch
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Let's Start a
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Conversation
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto">
            Have questions about our solutions? Want to discuss how EZBillify can transform your business? 
            We're here to help. Reach out and let's explore possibilities together.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CONTACT_INFO.map(({ icon, title, details, action }) => (
              <a
                key={title}
                href={action}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105 text-center"
              >
                <div className="text-5xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600">{details}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Send us a Message</h2>
              <p className="text-gray-600 mb-8">Fill out the form below and we'll get back to you within 24 hours.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    placeholder="Tell us more about your needs..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitStatus === "sending"}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitStatus === "sending" ? "Sending..." : "Send Message"}
                </button>

                {submitStatus === "success" && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 text-center font-medium">✅ Message sent successfully! We'll get back to you soon.</p>
                  </div>
                )}

                {submitStatus === "error" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-center font-medium">❌ Something went wrong. Please try again.</p>
                  </div>
                )}
              </form>
            </div>

            {/* Office Info & Map */}
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Office</h2>
                
                {OFFICE_LOCATIONS.map((location) => (
                  <div key={location.city} className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{location.city} Office</h3>
                      <p className="text-gray-600">{location.address}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <a href={`tel:${location.phone}`} className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors">
                        <span className="text-xl">📱</span>
                        <span>{location.phone}</span>
                      </a>
                      <a href={`mailto:${location.email}`} className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors">
                        <span className="text-xl">📧</span>
                        <span>{location.email}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Contact Buttons */}
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Contact</h3>
                <div className="space-y-3">
                  <a
                    href="https://wa.me/919876543210?text=Hi, I'd like to know more about EZBillify solutions."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold text-center hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span>💬</span>
                    <span>WhatsApp Us</span>
                  </a>
                  <a
                    href="tel:+919876543210"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-center hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span>📞</span>
                    <span>Call Now</span>
                  </a>
                  <a
                    href="mailto:ezbillify@gmail.com"
                    className="w-full border-2 border-blue-600 text-blue-600 px-6 py-3 rounded-lg font-semibold text-center hover:bg-blue-50 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <span>📧</span>
                    <span>Email Us</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Quick answers to common questions</p>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">What are your business hours?</h3>
              <p className="text-gray-600">We're available Monday through Friday, 9:00 AM to 6:00 PM IST. For urgent support, please contact us via WhatsApp.</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">How quickly can I expect a response?</h3>
              <p className="text-gray-600">We typically respond to all inquiries within 24 hours on business days. For urgent matters, please call us directly.</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Do you offer demos?</h3>
              <p className="text-gray-600">Yes! We offer free product demos and consultations. Contact us to schedule a personalized demo of our solutions.</p>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Can I visit your office?</h3>
              <p className="text-gray-600">Absolutely! We welcome visitors to our Bengaluru office. Please schedule an appointment in advance to ensure someone is available to meet with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of businesses already using EZBillify to streamline their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Start Free Trial
            </Link>
            <Link
              href="/about"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}