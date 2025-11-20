// src/pages/about.js - EZBillify Premium About
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const TEAM_MEMBERS = [
  {
    name: "Nehal Shenoy",
    role: "Co-Founder & Chief Executive Officer",
    img: "/founders/nehal.jpg",
    description: "Strategic leadership in business development and operations. With over 8 years of experience in fintech and enterprise solutions, Nehal drives the vision and strategic direction of EZBillify Technologies.",
    linkedin: "#",
    email: "nehal@ezbillify.com"
  },
  {
    name: "Darshan Murthy K",
    role: "Co-Founder & Chief Technology Officer", 
    img: "/founders/darshan.jpg",
    description: "Technical innovation and product development leadership. Darshan brings extensive expertise in software architecture, cloud technologies, and scalable system design to EZBillify's technology stack.",
    linkedin: "#",
    email: "darshan@ezbillify.com"
  }
];

const COMPANY_STATS = [
  { number: "2022", label: "Founded" },
  { number: "1K+", label: "Active Users" },
  { number: "50+", label: "Businesses Served" },
  { number: "99.9%", label: "Uptime" }
];

const VALUES = [
  {
    icon: "🚀",
    title: "Innovation",
    description: "We continuously push the boundaries of technology to deliver cutting-edge solutions that transform business operations."
  },
  {
    icon: "🤝",
    title: "Customer Success",
    description: "Our customers' success is our success. We're committed to providing exceptional service and support at every step."
  },
  {
    icon: "🔒",
    title: "Security & Compliance",
    description: "We prioritize data security and regulatory compliance, ensuring our solutions meet the highest industry standards."
  },
  {
    icon: "🌱",
    title: "Sustainability",
    description: "Through our electric mobility solutions, we're contributing to a more sustainable and environmentally conscious future."
  }
];

export default function About() {
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
                  className={`transition-all duration-300 relative group ${item.label === "About" ? "text-blue-600 font-semibold" : "text-slate-600 hover:text-blue-600"}`}
                >
                  {item.label}
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-300 ${item.label === "About" ? "w-full" : "w-0 group-hover:w-full"}`}></div>
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
              ✨ About EZBillify Technologies
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl lg:text-6xl font-bold leading-tight mb-6"
          >
            Transforming Business
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Through Innovation</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-slate-600 leading-relaxed max-w-4xl mx-auto mb-14 font-light"
          >
            Founded in 2022, EZBillify Technologies is dedicated to empowering businesses with intelligent automation solutions. We specialize in billing platforms, electric mobility solutions, custom SaaS applications, and professional websites that drive growth and operational excellence.
          </motion.p>

          {/* STATS */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {COMPANY_STATS.map(({ number, label }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="text-center group cursor-pointer"
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                  {number}
                </div>
                <div className="text-sm uppercase text-slate-500 font-semibold">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ===== MISSION & VISION ===== */}
      <section className="py-20 px-6 bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT CONTENT */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-10"
            >
              {/* Mission */}
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold text-slate-900 mb-4 flex items-center gap-3"
                >
                  🎯 Our Mission
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-slate-600 leading-relaxed font-light"
                >
                  To empower businesses of all sizes with intelligent, user-friendly technology solutions including billing platforms, electric mobility, custom SaaS applications, and professional websites that streamline operations, ensure compliance, and drive sustainable growth in an increasingly digital world.
                </motion.p>
              </div>
              
              {/* Vision */}
              <div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-bold text-slate-900 mb-4 flex items-center gap-3"
                >
                  🚀 Our Vision
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-slate-600 leading-relaxed font-light"
                >
                  To become the leading provider of integrated business automation, sustainable mobility solutions, and comprehensive digital services, enabling enterprises to operate more efficiently while contributing to a more sustainable future.
                </motion.p>
              </div>
            </motion.div>
            
            {/* RIGHT - GOAL CARD */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <motion.div
                whileHover={{ y: -10 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border border-blue-200 shadow-xl p-12 text-center"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-8xl mb-6"
                >
                  🎯
                </motion.div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Our Goal</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-light">
                  To make business automation accessible, affordable, and impactful for companies across all industries.
                </p>
              </motion.div>

              {/* GLOW */}
              <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-tl from-blue-500/20 via-purple-500/10 to-transparent blur-3xl rounded-full -z-10"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== VALUES ===== */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold text-slate-900 mb-4">Our Values</h2>
            <p className="text-xl text-slate-600 font-light">The principles that guide everything we do</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {VALUES.map(({ icon, title, description }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(37, 99, 235, 0.15)" }}
                className="group bg-white rounded-3xl border border-slate-200 shadow-lg p-8 transition-all cursor-pointer"
              >
                <motion.div
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="text-5xl mb-6 inline-block"
                >
                  {icon}
                </motion.div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
                <p className="text-slate-600 leading-relaxed font-light">{description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LEADERSHIP TEAM ===== */}
      <section className="py-32 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold text-slate-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-slate-600 font-light">Meet the visionaries behind EZBillify Technologies</p>
          </motion.div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {TEAM_MEMBERS.map(({ name, role, img, description, linkedin, email }, idx) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(37, 99, 235, 0.2)" }}
                className="group bg-white rounded-3xl border border-slate-200 shadow-lg hover:border-blue-400 p-8 transition-all"
              >
                <div className="flex flex-col sm:flex-row gap-8">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex-shrink-0"
                  >
                    <div className="relative">
                      <img
                        src={img}
                        alt={name}
                        className="w-32 h-32 rounded-2xl object-cover shadow-lg"
                      />
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="absolute -bottom-3 -right-3 w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                      >
                        <a href={`mailto:${email}`} className="text-white">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                          </svg>
                        </a>
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  <div className="flex-1">
                    <motion.h3 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      transition={{ delay: idx * 0.2 + 0.1 }}
                      className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors"
                    >
                      {name}
                    </motion.h3>
                    <p className="text-blue-600 font-semibold mb-4">{role}</p>
                    <p className="text-slate-600 leading-relaxed mb-6 font-light">{description}</p>
                    
                    <div className="flex gap-4">
                      <motion.a 
                        href={`mailto:${email}`}
                        whileHover={{ scale: 1.2, color: "#2563eb" }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </motion.a>
                      <motion.a 
                        href={linkedin}
                        whileHover={{ scale: 1.2, color: "#2563eb" }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                        </svg>
                      </motion.a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
                Join Our Journey
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 font-light"
              >
                Ready to transform your business operations with EZBillify? Let's build the future together.
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
                    Get in Touch
                  </motion.button>
                </Link>
                <Link href="/careers">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 border-2 border-white text-white rounded-xl font-semibold transition-all text-lg"
                  >
                    Join Our Team
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
            <p className="text-slate-600 text-sm leading-relaxed font-light">
              Transforming business operations through intelligent automation and innovative solutions for India's fastest-growing companies.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Solutions</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/login" className="hover:text-blue-600 transition font-light">Billing</Link></li>
              <li><Link href="/ezhydrakan" className="hover:text-blue-600 transition font-light">Water IoT</Link></li>
              <li><Link href="/hallodore" className="hover:text-blue-600 transition font-light">Mobility</Link></li>
              <li><Link href="/services" className="hover:text-blue-600 transition font-light">Services</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/about" className="hover:text-blue-600 transition font-light">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-blue-600 transition font-light">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition font-light">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 transition font-light">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Status</h4>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-slate-600 text-sm font-light">All systems operational</p>
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
