// src/pages/index.js - EZBILLIFY V1
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/router'
import { useAuth } from '../context/AuthContext'

const SOLUTIONS = [
  {
    key: "ezbillify",
    title: "EZBillify Billing Platform",
    desc: "Comprehensive invoicing solution featuring automated GST compliance, real-time inventory management, and multi-device accessibility. Streamline your billing process with professional invoice generation and tracking capabilities.",
    img: "/logo.png",
    features: ["GST Compliance", "Real-time Tracking", "Multi-device Access"]
  },
  {
    key: "ezhydrakan",
    title: "EZHydakan Water Management",
    desc: "IoT-based water sensor and monitoring system that integrates with utility services for automated meter reading, leak detection, and smart water management. Transform your water infrastructure with intelligent monitoring.",
    img: "/EZHydakan.png",
    features: ["IoT Sensors", "Automated Reading", "Leak Detection"]
  },
  {
    key: "hallodore",
    title: "Hallodore Electric Mobility",
    desc: "Advanced electric delivery vehicle technology engineered for urban logistics. Our proprietary scooter platform delivers superior efficiency, zero-emission transportation, and optimized last-mile delivery performance.",
    img: "/hallodore.png",
    features: ["Zero Emission", "Urban Logistics", "Last-mile Delivery"]
  },
  {
    key: "saas-apps",
    title: "Custom SaaS Applications",
    desc: "Tailored software-as-a-service solutions designed for your specific business needs. From workflow automation to data analytics, we build scalable cloud applications that grow with your business.",
    img: "/saas-icon.png",
    features: ["Cloud-based", "Scalable Architecture", "Custom Features"]
  },
  {
    key: "websites",
    title: "Professional Websites",
    desc: "Modern, responsive websites and web applications built with cutting-edge technologies. From corporate websites to e-commerce platforms, we create digital experiences that drive results.",
    img: "/web-icon.png",
    features: ["Responsive Design", "SEO Optimized", "Fast Performance"]
  }
];

const FOUNDERS = [
  {
    name: "Nehal Shenoy",
    role: "Co-Founder & Chief Executive Officer",
    img: "/founders/nehal.jpg",
    description: "Strategic leadership in business development and operations"
  },
  {
    name: "Darshan Murthy K",
    role: "Co-Founder & Chief Technology Officer", 
    img: "/founders/darshan.jpg",
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
      case "ezhydrakan":
        return "/ezhydrakan";
      case "hallodore":
        return "/hallodore";
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
                <img
                  src="/logomain.png"
                  alt="EZBillify"
                  width="42"
                  height="42"
                  className="rounded-xl shadow-md"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">EZBillify</h1>
                <p className="text-xs text-gray-500">Technologies</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/services" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Services</Link>
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
                  href="/login"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
                >
                  Get Started
                </Link>
                <Link
                  href="#demo"
                  className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-blue-500 hover:text-blue-600 transition-all duration-300 text-center"
                >
                  Watch Demo
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
            {SOLUTIONS.map(({ key, title, desc, features, img }, index) => (
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
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden">
                          <div className="relative w-full h-full flex items-center justify-center">
                            {key === "hallodore" ? (
                              <div className="relative">
                                {/* Scooter container with better styling */}
                                <div className="relative transform hover:scale-110 transition-transform duration-300">
                                  <img
                                    src={img}
                                    alt={title}
                                    className="object-contain w-16 h-16 drop-shadow-lg"
                                  />
                                  {/* Add visual enhancements for the scooter */}
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-indigo-600/20 blur-sm animate-pulse"></div>
                                </div>
                                {/* Speed lines effect */}
                                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
                                  <div className="flex space-x-1">
                                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse delay-100"></div>
                                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse delay-200"></div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={img}
                                alt={title}
                                className="object-contain w-12 h-12"
                              />
                            )}
                          </div>
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
            {FOUNDERS.map(({ name, role, description, img }, index) => (
              <div
                key={name}
                className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: `${900 + index * 200}ms` }}
              >
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <img
                        src={img}
                        alt={name}
                        width="120"
                        height="120"
                        className="rounded-2xl shadow-lg object-cover"
                      />
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
            Join the growing community of businesses that trust EZBillify for their operations.
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

      {/* Footer */}
      <footer id="contact" className={`relative bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white py-20 overflow-hidden transition-all duration-1500 delay-1100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <img
                    src="/logomain.png"
                    alt="EZBillify"
                    width="48"
                    height="48"
                    className="rounded-xl"
                  />
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
              
              {/* Social Media */}
              <div className="flex space-x-4 mb-8">
                <a href="https://www.instagram.com/ezbillify?igsh=MTFra2t3bnU3Nzdvbw==" target="_blank" rel="noopener noreferrer" className="group w-12 h-12 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl flex items-center justify-center hover:from-pink-500 hover:to-purple-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-pink-500/25 hover:scale-110">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.057-1.644.07-4.849.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.689-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.689-.072 4.948-.072zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="group w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center hover:from-green-500 hover:to-emerald-500 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-green-500/25 hover:scale-110">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </a>
              </div>
              
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
                    <p className="text-green-400 text-sm">✅ Successfully subscribed!</p>
                  )}
                  {subscriptionStatus === "error" && (
                    <p className="text-red-400 text-sm">❌ Something went wrong. Please try again.</p>
                  )}
                </form>
              </div>
            </div>
            
            {/* Solutions */}
            <div>
              <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Solutions</h4>
              <ul className="space-y-4">
                <li><Link href="/services" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors"></div>
                  <span>EZBillify Platform</span>
                </Link></li>
                <li><Link href="/ezhydrakan" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full group-hover:bg-cyan-400 transition-colors"></div>
                  <span>EZHydakan Water</span>
                </Link></li>
                <li><Link href="/hallodore" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-green-500 rounded-full group-hover:bg-green-400 transition-colors"></div>
                  <span>Hallodore Mobility</span>
                </Link></li>
                <li><Link href="/services" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors"></div>
                  <span>SaaS Applications</span>
                </Link></li>
                <li><Link href="/services" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-pink-500 rounded-full group-hover:bg-pink-400 transition-colors"></div>
                  <span>Professional Websites</span>
                </Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="text-xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-green-500 rounded-full group-hover:bg-green-400 transition-colors"></div>
                  <span>About Us</span>
                </Link></li>
                <li><Link href="/careers" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full group-hover:bg-yellow-400 transition-colors"></div>
                  <span>Careers</span>
                </Link></li>
                <li><Link href="/contact" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div className="w-2 h-2 bg-red-500 rounded-full group-hover:bg-red-400 transition-colors"></div>
                  <span>Contact</span>
                </Link></li>
                <li><Link href="/support" className="group flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
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
                <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors text-sm font-medium">
                  Privacy 
                </Link>
                <Link href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-medium">
                  Terms of Service
                </Link>
                <Link href="/support" className="text-gray-400 hover:text-green-400 transition-colors text-sm font-medium">
                  Support
                </Link>
                <Link href="/careers" className="text-gray-400 hover:text-yellow-400 transition-colors text-sm font-medium">
                  Careers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}