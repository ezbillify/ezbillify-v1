// src/pages/services.js - EZBillify Premium Services
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const SERVICES = [
  {
    id: "ezbillify",
    title: "EZBillify Billing Platform",
    shortDesc: "Comprehensive invoicing solution with automated GST compliance",
    fullDesc: "EZBillify is our flagship billing and invoicing platform designed for modern businesses. It features automated GST compliance, real-time inventory management, and multi-device accessibility. Whether you're a small startup or a large enterprise, EZBillify streamlines your billing process with professional invoice generation, automated tax calculations, and comprehensive tracking capabilities.",
    img: "/logo.png",
    features: [
      "Automated GST Compliance & Filing",
      "Real-time Inventory Management", 
      "Multi-device Accessibility",
      "Professional Invoice Templates",
      "Payment Gateway Integration",
      "Customer Relationship Management",
      "Advanced Reporting & Analytics",
      "Multi-location Support",
      "Barcode & QR Code Generation",
      "Automated Backup & Sync"
    ],
    benefits: [
      "Reduce manual errors by 95%",
      "Save 10+ hours per week",
      "Ensure 100% GST compliance",
      "Improve cash flow management"
    ],
    pricing: "Starting at ₹99/month",
    cta: "Get Started",
    technologies: ["Next.js", "Supabase", "Secured Servers"]
  },
  {
    id: "ezhydrakan",
    title: "EZHydakan Smart Water Management",
    shortDesc: "IoT-based water sensors and automated utility integration"
  },
  {
    id: "hallodore",
    title: "Hallodore Electric Mobility",
    shortDesc: "Advanced electric delivery vehicle technology for urban logistics"
  },
  {
    id: "our-clients",
    title: "Our Clients",
    shortDesc: "Trusted partnerships with innovative businesses across industries"
  },
  {
    id: "custom",
    title: "Custom SaaS Applications",
    shortDesc: "Tailored software solutions for your unique business needs",
    fullDesc: "We design and develop custom SaaS applications that solve your specific business challenges. Our team specializes in building scalable, cloud-based solutions that integrate seamlessly with your existing systems. From workflow automation to data analytics platforms, we create software that grows with your business.",
    img: "/saas-icon.png",
    features: [
      "Custom Software Development",
      "Cloud Architecture Design",
      "API Development & Integration",
      "Database Design & Optimization",
      "UI/UX Design",
      "Mobile App Development",
      "Workflow Automation",
      "Analytics & Reporting",
      "Security & Compliance",
      "Ongoing Maintenance & Support"
    ],
    benefits: [
      "Tailored to your exact needs",
      "Scalable as you grow",
      "Expert technical support",
      "Competitive pricing"
    ],
    pricing: "Starting at ₹50,000",
    cta: "Request Quote",
    technologies: ["React", "Node.js", "AWS", "MongoDB", "Microservices"]
  },
  {
    id: "professional",
    title: "Professional Websites",
    shortDesc: "Modern, responsive websites that drive business results",
    fullDesc: "We create stunning, high-performance websites that make lasting impressions. Our web development services cover everything from corporate websites to e-commerce platforms. Each project is built with modern technologies, optimized for search engines, and designed to convert visitors into customers.",
    img: "/web-icon.png",
    features: [
      "Custom Web Design",
      "Responsive Development",
      "E-commerce Integration",
      "Content Management Systems",
      "SEO Optimization",
      "Performance Optimization",
      "Security Implementation",
      "Analytics Integration",
      "Maintenance & Updates",
      "Domain & Hosting Setup"
    ],
    benefits: [
      "Professional online presence",
      "Mobile-friendly design",
      "Fast loading times",
      "Search engine optimized"
    ],
    pricing: "Starting at ₹25,000",
    cta: "Get Started",
    technologies: ["Next.js", "React", "Tailwind CSS", "Vercel", "WordPress"]
  }
];

export default function Services() {
  const [selectedService, setSelectedService] = useState("ezbillify");
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const currentService = SERVICES.find(service => service.id === selectedService);

  const handleServiceClick = (serviceId) => {
    if (serviceId === "ezhydrakan") {
      window.location.href = "/ezhydrakan";
    } else if (serviceId === "hallodore") {
      window.location.href = "/hallodore";
    } else {
      setSelectedService(serviceId);
    }
  };

  const getServiceButtonLabel = (service) => {
    if (service.id === "our-clients") return "Our Clients";
    if (service.id === "ezhydrakan") return "EZHydakan";
    if (service.id === "hallodore") return "Hallodore";
    if (service.id === "custom") return "Custom";
    if (service.id === "professional") return "Professional";
    return service.title.split(' ')[0];
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ===== NAVBAR ===== */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full h-20 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <img src="/logomain.png" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="font-bold text-lg">EZBillify</h1>
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Technologies</p>
              </div>
            </motion.div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {[
              { label: "Home", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" }
            ].map((item, i) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Link 
                  href={item.href}
                  className={`transition-all duration-300 relative group ${item.label === "Services" ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-blue-600"}`}
                >
                  {item.label}
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${item.label === "Services" ? "w-full" : "w-0 group-hover:w-full"}`}></div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/login"
              className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30"
            >
              Access Portal
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* ===== HERO ===== */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-1000 h-600 bg-gradient-to-b from-blue-400/20 to-transparent blur-3xl rounded-full -z-10"></div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto text-center"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block mb-8"
          >
            <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-full text-xs font-bold text-blue-700 shadow-sm">
              ✨ Our Services & Solutions
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            Complete Technology
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Solutions for Business</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto font-light"
          >
            From billing platforms to smart water management, electric mobility, SaaS applications to professional websites — we provide comprehensive technology solutions that transform how businesses operate.
          </motion.p>
        </motion.div>
      </section>

      {/* ===== SERVICE NAVIGATION ===== */}
      <section className="py-12 px-6 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {SERVICES.map((service, idx) => (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleServiceClick(service.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  selectedService === service.id && service.id !== "ezhydrakan" && service.id !== "hallodore"
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 border border-slate-200'
                }`}
              >
                {getServiceButtonLabel(service)}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== SERVICE DETAILS ===== */}
      {currentService && currentService.id !== "our-clients" && currentService.id !== "ezhydrakan" && currentService.id !== "hallodore" && (
        <section className="py-20 px-6 bg-gradient-to-b from-white via-slate-50 to-white">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* LEFT CONTENT */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl font-bold text-slate-900 mb-4"
                  >
                    {currentService.title}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-slate-600 leading-relaxed mb-6 font-light"
                  >
                    {currentService.fullDesc}
                  </motion.p>
                  
                  {/* Technologies */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-2 mb-8"
                  >
                    {currentService.technologies.map((tech) => (
                      <span key={tech} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200">
                        {tech}
                      </span>
                    ))}
                  </motion.div>

                  {/* Pricing */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl font-bold text-blue-600 mb-8"
                  >
                    {currentService.pricing}
                  </motion.div>

                  {/* CTA Buttons */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <Link href="/contact">
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(37, 99, 235, 0.4)" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all text-lg"
                      >
                        {currentService.cta}
                      </motion.button>
                    </Link>
                    <Link href="/contact">
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(15, 23, 42, 0.1)" }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-semibold hover:border-blue-600 transition-all text-lg"
                      >
                        Learn More
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
              
              {/* RIGHT - FEATURES & BENEFITS */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-8"
              >
                {/* Features */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    ⚡ Key Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentService.features.map((feature, idx) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        whileHover={{ x: 5 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredFeature(idx)}
                        onMouseLeave={() => setHoveredFeature(null)}
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <span className="text-slate-600 font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 p-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    💎 Key Benefits
                  </h3>
                  <div className="space-y-4">
                    {currentService.benefits.map((benefit, idx) => (
                      <motion.div
                        key={benefit}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        whileHover={{ x: 10 }}
                        className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="text-2xl">🎯</div>
                        <span className="text-slate-700 font-medium">{benefit}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ===== OUR CLIENTS ===== */}
      {currentService && currentService.id === "our-clients" && (
        <section className="py-20 px-6 bg-gradient-to-b from-white via-slate-50 to-white">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-5xl font-bold text-slate-900 mb-4">Our Valued Clients</h2>
              <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto font-light">
                We're proud to work with forward-thinking companies that trust us with their digital transformation journey.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              {/* Grocerywave */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(37, 99, 235, 0.2)" }}
                className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 transition-all"
              >
                <div className="text-center mb-8">
                  <div className="mb-4 flex justify-center"><img src="/grocerywave-logo.png" alt="Grocerywave" className="h-20 w-auto object-contain rounded-2xl" /></div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Grocerywave Pvt Ltd</h3>
                  <p className="text-blue-600 font-semibold">E-commerce Platform</p>
                </div>
                
                <div className="space-y-3 mb-8">
                  {[
                    "Multi-vendor Marketplace",
                    "Real-time Inventory",
                    "Mobile App Integration"
                  ].map((item, idx) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-slate-600 font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.a
                  href="https://www.grocerywave.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                >
                  Visit Grocerywave →
                </motion.a>
              </motion.div>

              {/* Mills Mitra */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(34, 197, 94, 0.2)" }}
                className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 transition-all"
              >
                <div className="text-center mb-8">
                  <div className="mb-4 flex justify-center"><img src="/millsmitra-logo.png" alt="Mills Mitra" className="h-20 w-auto object-contain rounded-2xl" /></div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Mills Mitra</h3>
                  <p className="text-green-600 font-semibold">Millet Health Drinks</p>
                </div>
                
                <div className="space-y-3 mb-8">
                  {[
                    "Nutritious Products",
                    "Health & Wellness Platform",
                    "Brand Management"
                  ].map((item, idx) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-slate-600 font-medium">{item}</span>
                    </motion.div>
                  ))}
                </div>

                <motion.a
                  href="https://www.millsmitra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                >
                  Visit Mills Mitra →
                </motion.a>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(37, 99, 235, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all text-lg"
                >
                  Become a Client
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </section>
      )}

      {/* ===== FINAL CTA ===== */}
      <section className="py-32 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-16 overflow-hidden border border-slate-700/50 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-3xl"></div>
            <div className="absolute top-20 right-0 w-80 h-80 bg-blue-600/20 blur-3xl rounded-full -z-0"></div>

            <div className="relative z-10 text-center text-white">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold mb-6"
              >
                Ready to Transform Your Business?
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 font-light"
              >
                Let's discuss how our solutions can help you achieve your business goals.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Link href="/contact">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 bg-white text-slate-900 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all text-lg"
                  >
                    Schedule Consultation
                  </motion.button>
                </Link>
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 border-2 border-white text-white rounded-xl font-semibold transition-all text-lg"
                  >
                    Start Free Trial
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ===== FOOTER ===== */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="bg-white border-t border-slate-200 py-16 px-6"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div>
            <img src="/logomain.png" className="h-12 mb-4" />
            <p className="text-slate-600 text-sm leading-relaxed">
              Modern solutions and enterprise-grade software for India's fastest-growing businesses.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Solutions</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/login" className="hover:text-blue-600 transition">Billing</Link></li>
              <li><Link href="/ezhydrakan" className="hover:text-blue-600 transition">Water IoT</Link></li>
              <li><Link href="/hallodore" className="hover:text-blue-600 transition">Mobility</Link></li>
              <li><Link href="/services" className="hover:text-blue-600 transition">Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/about" className="hover:text-blue-600 transition">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-blue-600 transition">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 transition">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Status</h4>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-slate-600 text-sm">All systems operational</p>
            </div>
          </div>
        </div>

        <div className="text-center text-slate-500 text-sm mt-12">
          © {new Date().getFullYear()} EZBillify Technologies. All rights reserved.
        </div>
      </motion.footer>
    </div>
  );
}