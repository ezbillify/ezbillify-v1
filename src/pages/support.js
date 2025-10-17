import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const SUPPORT_CHANNELS = [
  {
    icon: "🎧",
    title: "24/7 Live Support",
    description: "Get instant help from our technical support team",
    action: "Start Chat",
    link: "#",
    availability: "Always Available"
  },
  {
    icon: "📧",
    title: "Email Support",
    description: "Send us detailed queries and get comprehensive solutions",
    action: "Send Email",
    link: "mailto:support@ezbillify.com",
    availability: "Response within 4 hours"
  },
  {
    icon: "📱",
    title: "WhatsApp Support",
    description: "Quick assistance via WhatsApp for urgent issues",
    action: "Message Us",
    link: "https://wa.me/919876543210",
    availability: "Mon-Fri, 9 AM - 6 PM"
  },
  {
    icon: "📞",
    title: "Phone Support",
    description: "Speak directly with our support specialists",
    action: "Call Now",
    link: "tel:+919876543210",
    availability: "Mon-Fri, 9 AM - 6 PM"
  }
];

const FAQ_CATEGORIES = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "How do I set up my EZBillify account?",
        answer: "Setting up your account is simple. After registration, you'll receive a welcome email with setup instructions. Our onboarding team will also reach out to guide you through the process within 24 hours."
      },
      {
        question: "What documents do I need for GST compliance setup?",
        answer: "You'll need your GSTIN number, business registration documents, bank account details, and authorized signatory information. Our compliance team will help you configure everything correctly."
      },
      {
        question: "How long does the initial setup take?",
        answer: "Most businesses are up and running within 24-48 hours. Complex integrations may take 3-5 business days. We provide dedicated support throughout the entire process."
      }
    ]
  },
  {
    category: "Billing & Invoicing",
    questions: [
      {
        question: "How do I create my first invoice?",
        answer: "Navigate to Sales > Invoice > New. Fill in customer details, add items, and the system will automatically calculate taxes and totals. You can preview before sending."
      },
      {
        question: "Can I customize invoice templates?",
        answer: "Yes! Go to Settings > Templates to customize layouts, add your logo, change colors, and modify fields. We offer multiple pre-designed templates and custom options."
      },
      {
        question: "How do I handle different tax rates?",
        answer: "Our system automatically applies correct GST rates based on item categories and customer locations. You can also manually override rates when needed."
      }
    ]
  },
  {
    category: "Technical Issues",
    questions: [
      {
        question: "Why can't I access my dashboard?",
        answer: "Check your internet connection and try refreshing the page. If the issue persists, clear your browser cache or try a different browser. Contact support if problems continue."
      },
      {
        question: "How do I reset my password?",
        answer: "Click 'Forgot Password' on the login page, enter your email, and follow the reset instructions. If you don't receive the email, check your spam folder or contact support."
      },
      {
        question: "Why are my reports not generating?",
        answer: "Ensure you have selected the correct date range and filters. Large reports may take a few minutes to generate. If reports still fail, contact our technical team for assistance."
      }
    ]
  },
  {
    category: "Integrations",
    questions: [
      {
        question: "What third-party apps can I integrate?",
        answer: "We support integrations with popular accounting software, payment gateways, CRM systems, and e-commerce platforms. Check our integrations page for the full list."
      },
      {
        question: "How do I set up payment gateway integration?",
        answer: "Go to Settings > Payment Gateways, select your provider, and enter your API credentials. Our team can assist with testing and configuration."
      },
      {
        question: "Can I import data from my previous system?",
        answer: "Yes! We support data migration from Excel, CSV files, and most accounting software. Our migration team will help ensure all your data transfers correctly."
      }
    ]
  }
];

const RESOURCES = [
  {
    icon: "📖",
    title: "User Guide",
    description: "Comprehensive documentation covering all features",
    link: "#"
  },
  {
    icon: "🎥",
    title: "Video Tutorials",
    description: "Step-by-step video guides for common tasks",
    link: "#"
  },
  {
    icon: "🔧",
    title: "API Documentation",
    description: "Technical documentation for developers",
    link: "#"
  },
  {
    icon: "💡",
    title: "Best Practices",
    description: "Tips and tricks to maximize your efficiency",
    link: "#"
  }
];

export default function Support() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Getting Started");
  const [openQuestions, setOpenQuestions] = useState([]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleQuestion = (index) => {
    setOpenQuestions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectedCategoryData = FAQ_CATEGORIES.find(cat => cat.category === selectedCategory);

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
              <Link href="/support" className="text-blue-600 font-medium">Support</Link>
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
            Help & Support
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            We're Here to
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Help You Succeed
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
            Get the support you need, when you need it. Our dedicated team is committed to ensuring your success with EZBillify.
          </p>

          {/* Quick Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for help articles, guides, or ask a question..."
                className="w-full px-6 py-4 pr-12 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
              />
              <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get Help Your Way</h2>
            <p className="text-xl text-gray-600">Choose the support channel that works best for you</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {SUPPORT_CHANNELS.map(({ icon, title, description, action, link, availability }, index) => (
              <div
                key={title}
                className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl p-6 transition-all duration-700 hover:scale-105 text-center"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{description}</p>
                <div className="text-xs text-blue-600 font-medium mb-4">{availability}</div>
                <a
                  href={link}
                  target={link.startsWith('http') ? '_blank' : '_self'}
                  rel={link.startsWith('http') ? 'noopener noreferrer' : ''}
                  className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:shadow-lg transition-all duration-300"
                >
                  {action}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Find quick answers to common questions</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Category Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-32">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  {FAQ_CATEGORIES.map(({ category }) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">{selectedCategory}</h3>
                <div className="space-y-4">
                  {selectedCategoryData?.questions.map(({ question, answer }, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleQuestion(index)}
                        className="w-full text-left px-6 py-4 font-medium text-gray-900 hover:bg-gray-50 transition-colors flex justify-between items-center"
                      >
                        <span>{question}</span>
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            openQuestions.includes(index) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openQuestions.includes(index) && (
                        <div className="px-6 pb-4">
                          <p className="text-gray-600 leading-relaxed">{answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Self-Help Resources</h2>
            <p className="text-xl text-gray-600">Explore our comprehensive resource library</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {RESOURCES.map(({ icon, title, description, link }, index) => (
              <div
                key={title}
                className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 p-6 transition-all duration-700 hover:scale-105 text-center"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                  {title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{description}</p>
                <a
                  href={link}
                  className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  Explore
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status & Updates */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">System Status</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-lg">All systems operational</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>API Services: Online</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>Billing Platform: Online</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>Support Systems: Online</span>
                </div>
              </div>
            </div>
            
            <div className="text-center md:text-right">
              <h3 className="text-xl font-bold mb-4">Need Immediate Help?</h3>
              <p className="text-blue-100 mb-6">Our support team is standing by to assist you</p>
              <div className="space-y-3">
                <a
                  href="mailto:support@ezbillify.com"
                  className="block bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300"
                >
                  Email Support
                </a>
                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}