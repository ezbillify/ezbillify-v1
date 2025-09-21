// src/pages/index.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'

const SOLUTIONS = [
  {
    key: "ezbillify",
    title: "EZBillify Billing Platform",
    desc: "Comprehensive invoicing solution featuring automated GST compliance, real-time inventory management, and multi-device accessibility. Streamline your billing process with professional invoice generation and tracking capabilities.",
    features: ["GST Compliance", "Real-time Tracking", "Multi-device Access"]
  },
  {
    key: "ezhydrakan",
    title: "EZHydakan Water Management",
    desc: "IoT-based water sensor and monitoring system that integrates with utility services for automated meter reading, leak detection, and smart water management. Transform your water infrastructure with intelligent monitoring.",
    features: ["IoT Sensors", "Automated Reading", "Leak Detection"]
  },
  {
    key: "hallodore",
    title: "Hallodore Electric Mobility",
    desc: "Advanced electric delivery vehicle technology engineered for urban logistics. Our proprietary scooter platform delivers superior efficiency, zero-emission transportation, and optimized last-mile delivery performance.",
    features: ["Zero Emission", "Urban Logistics", "Last-mile Delivery"]
  },
  {
    key: "saas-apps",
    title: "Custom SaaS Applications",
    desc: "Tailored software-as-a-service solutions designed for your specific business needs. From workflow automation to data analytics, we build scalable cloud applications that grow with your business.",
    features: ["Cloud-based", "Scalable Architecture", "Custom Features"]
  },
  {
    key: "websites",
    title: "Professional Websites",
    desc: "Modern, responsive websites and web applications built with cutting-edge technologies. From corporate websites to e-commerce platforms, we create digital experiences that drive results.",
    features: ["Responsive Design", "SEO Optimized", "Fast Performance"]
  }
];

const FOUNDERS = [
  {
    name: "Nehal Shenoy",
    role: "Co-Founder & Chief Executive Officer",
    description: "Strategic leadership in business development and operations"
  },
  {
    name: "Darshan Murthy K",
    role: "Co-Founder & Chief Technology Officer", 
    description: "Technical innovation and product development leadership"
  }
];

const STATS = [
  { number: "1K+", label: "Active Users" },
  { number: "50+", label: "Businesses Served" },
  { number: "99.9%", label: "Uptime" },
  { number: "24/7", label: "Support" }
];

export default function HomePage() {
  const { isAuthenticated, hasCompany, loading } = useAuth()
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");

  // Redirect authenticated users
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (hasCompany) {
        router.push('/dashboard')
      } else {
        router.push('/setup')
      }
    }
  }, [isAuthenticated, hasCompany, loading, router])

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If authenticated, show redirect message
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setSubscriptionStatus("subscribing");
    
    try {
      // Simulate newsletter subscription
      setTimeout(() => {
        setSubscriptionStatus("success");
        setEmail("");
        setTimeout(() => setSubscriptionStatus(""), 3000);
      }, 1000);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubscriptionStatus("error");
      setTimeout(() => setSubscriptionStatus(""), 3000);
    }
  };

  const getSolutionLink = (key) => {
    switch (key) {
      case "ezbillify":
        return "/login";
      default:
        return "/services";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/50 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EZBillify</h1>
                <p className="text-xs text-gray-500">Technologies</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#solutions" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Solutions</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About</a>
              <a href="#contact" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Contact</a>
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
      <section className={`pt-24 pb-20 px-6 transition-all duration-1500 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
                Next-Generation Business Solutions
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Transform Your
                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Business Operations
                </span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                EZBillify Technologies provides cutting-edge automation solutions that streamline operations, ensure compliance, and drive growth for modern enterprises.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
                >
                  Get Started
                </Link>
                <Link
                  href="#solutions"
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-blue-500 hover:text-blue-600 transition-all duration-300 text-center"
                >
                  Learn More
                </Link>
              </div>
              
              <div className="grid grid-cols-4 gap-8 pt-8 border-t border-gray-200">
                {STATS.map(({ number, label }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{number}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl rotate-6 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 transform -rotate-2">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-sm text-gray-500">EZBillify Dashboard</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="h-4 bg-gradient-to-r from-blue-200 to-blue-300 rounded-full"></div>
                    <div className="h-4 bg-gradient-to-r from-indigo-200 to-indigo-300 rounded-full w-3/4"></div>
                    <div className="h-4 bg-gradient-to-r from-purple-200 to-purple-300 rounded-full w-1/2"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">₹10.8L</div>
                      <div className="text-sm text-gray-500">Monthly Revenue</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">1408</div>
                      <div className="text-sm text-gray-500">Invoices</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className={`py-20 px-6 bg-white transition-all duration-1500 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Business Solutions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our integrated platform delivers powerful tools designed to optimize every aspect of your business operations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {SOLUTIONS.map(({ key, title, desc, features }, index) => (
              <div
                key={key}
                className={`group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 overflow-hidden transition-all duration-700 hover:scale-105 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${700 + index * 200}ms` }}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                <div className="p-8">
                  <div className="flex items-start space-x-6 mb-6">
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                          <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                        {title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {desc}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {features.map((feature) => (
                          <span
                            key={feature}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Link
                    href={getSolutionLink(key)}
                    className="inline-flex items-center text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                  >
                    Learn More
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section id="about" className={`py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50 transition-all duration-1500 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Meet Our Leadership Team
            </h2>
            <p className="text-xl text-gray-600">
              Experienced leaders driving innovation and excellence in business technology.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {FOUNDERS.map(({ name, role, description }, index) => (
              <div
                key={name}
                className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${900 + index * 200}ms` }}
              >
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {name}
                    </h3>
                    <p className="text-blue-600 font-semibold mb-3">
                      {role}
                    </p>
                    <p className="text-gray-600 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white transition-all duration-1500 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of businesses that trust EZBillify for their critical operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Start Free Trial
            </Link>
            <Link
              href="#contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className={`relative bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white py-20 overflow-hidden transition-all duration-1500 delay-1100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">EZBillify</h3>
                  <p className="text-gray-400 text-sm font-medium">Technologies</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed mb-8 max-w-md text-lg">
                Empowering businesses with intelligent automation solutions and enterprise-grade technology platforms for sustainable growth and operational excellence.
              </p>
              
              {/* Newsletter */}
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
                <h4 className="text-lg font-semibold mb-3 text-white">Stay Updated</h4>
                <p className="text-gray-300 text-sm mb-4">Get the latest updates and insights delivered to your inbox.</p>
                <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                  <div className="flex space-x-3">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email" 
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                      required
                    />
                    <button 
                      type="submit"
                      disabled={subscriptionStatus === "subscribing"}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {subscriptionStatus === "subscribing" ? "..." : "Subscribe"}
                    </button>
                  </div>
                  {subscriptionStatus === "success" && (
                    <p className="text-green-400 text-sm">Successfully subscribed!</p>
                  )}
                  {subscriptionStatus === "error" && (
                    <p className="text-red-400 text-sm">Something went wrong. Please try again.</p>
                  )}
                </form>
              </div>
            </div>
            
            {/* Solutions */}
            <div>
              <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Solutions</h4>
              <ul className="space-y-4">
                <li><Link href="/login" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors"></div>
                  <span>EZBillify Platform</span>
                </Link></li>
                <li><a href="#solutions" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
                  <span>SaaS Applications</span>
                </a></li>
                <li><a href="#solutions" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-pink-500 rounded-full group-hover:bg-pink-400 transition-colors"></div>
                  <span>Professional Websites</span>
                </a></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Company</h4>
              <ul className="space-y-4">
                <li><a href="#about" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-green-500 rounded-full group-hover:bg-green-400 transition-colors"></div>
                  <span>About Us</span>
                </a></li>
                <li><Link href="/register" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full group-hover:bg-yellow-400 transition-colors"></div>
                  <span>Get Started</span>
                </Link></li>
                <li><Link href="/login" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-orange-500 rounded-full group-hover:bg-orange-400 transition-colors"></div>
                  <span>Support</span>
                </Link></li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Section */}
          <div className="border-t border-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
                <p className="text-gray-400 text-center md:text-left">
                  © {new Date().getFullYear()} EZBillify Technologies. All rights reserved.
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>All systems operational</span>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-end space-x-6">
                <a href="#" className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium">
                  Privacy 
                </a>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-medium">
                  Terms of Service
                </a>
                <Link href="/login" className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
