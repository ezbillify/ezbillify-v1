import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

// Enhanced Chart component - FULLY VISIBLE
const AdvancedChart = () => {
  const data = [
    { value: 35, label: "Mon", tooltip: "₹2.4L", trend: "+2.4%" },
    { value: 60, label: "Tue", tooltip: "₹4.2L", trend: "+5.2%" },
    { value: 45, label: "Wed", tooltip: "₹3.1L", trend: "-1.8%" },
    { value: 80, label: "Thu", tooltip: "₹5.6L", trend: "+8.1%" },
    { value: 55, label: "Fri", tooltip: "₹3.8L", trend: "+3.2%" },
    { value: 90, label: "Sat", tooltip: "₹6.3L", trend: "+9.4%" },
    { value: 70, label: "Sun", tooltip: "₹4.9L", trend: "+6.1%" }
  ];

  return (
    <div className="w-full">
      <div className="h-80 flex items-end justify-between gap-3 px-2 py-8 bg-gradient-to-b from-slate-50 to-white rounded-2xl">
        {data.map((item, i) => (
          <motion.div
            key={i}
            className="flex-1 flex flex-col items-center relative group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              whileHover={{ opacity: 1, y: -45 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full mb-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap pointer-events-none z-20 shadow-xl"
            >
              {item.tooltip}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-2 h-2 bg-slate-900 rotate-45"></div>
            </motion.div>

            {/* Bar */}
            <div className="relative w-full h-60 bg-gradient-to-t from-slate-200/60 to-slate-100/40 rounded-t-2xl overflow-hidden hover:from-slate-300/60 transition-all duration-300 shadow-sm">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${item.value}%` }}
                transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
                className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 rounded-t-2xl shadow-lg shadow-blue-600/60 hover:shadow-blue-600/80 transition-all"
              />
              
              {/* Shine */}
              <motion.div
                className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/60 to-transparent rounded-t-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: i * 0.08 + 0.4, duration: 0.6 }}
              />

              {/* Animated pulse */}
              <motion.div
                className="absolute bottom-0 left-0 w-full bg-blue-400/30 rounded-t-2xl"
                initial={{ height: 0, opacity: 1 }}
                animate={{ 
                  height: [`${item.value}%`, `${item.value}%`, `${item.value}%`],
                  opacity: [0.3, 0.1, 0.3]
                }}
                transition={{ duration: 3, delay: i * 0.08 + 0.6, repeat: Infinity }}
              />
            </div>

            {/* Value display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.6 }}
              className="mt-4 text-center"
            >
              <div className="text-sm font-bold text-slate-900">{item.label}</div>
              <div className="text-xs text-green-600 font-semibold mt-1">{item.trend}</div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// DATA
const SOLUTIONS = [
  {
    key: "ezbillify",
    title: "EZBillify Platform",
    desc: "Automated GST invoicing, inventory, real-time syncing, and enterprise-grade analytics for fast-growing Indian businesses.",
    img: "/logo.png",
    features: ["GST Compliance", "Inventory", "Real-time Sync"],
  },
  {
    key: "ezhydrakan",
    title: "EZHydakan Water",
    desc: "IoT-based water management with automated meter readings, leak detection, and city-scale analytics.",
    img: "/EZHydakan.png",
    features: ["IoT Sensors", "Leak Alerts", "Smart Metering"],
  },
  {
    key: "hallodore",
    title: "Hallodore Mobility",
    desc: "Electric mobility platform for urban logistics and last-mile delivery optimization.",
    img: "/hallodore.png",
    features: ["Zero Emission", "Fleet Ready", "Urban Logistics"],
  },
  {
    key: "saas-apps",
    title: "Custom SaaS Solutions",
    desc: "Fully tailored SaaS products engineered for automation, intelligence, and scalable growth.",
    img: "/saas-icon.png",
    features: ["Custom", "Scalable", "Cloud-native"],
  },
];

const FOUNDERS = [
  {
    name: "Nehal Shenoy",
    role: "Co-Founder & CEO",
    img: "/founders/nehal.jpg",
    description: "Leads business strategy, partnerships, and growth initiatives across India.",
  },
  {
    name: "Darshan Murthy K",
    role: "Co-Founder & CTO",
    img: "/founders/darshan.jpg",
    description: "Architect of EZBillify's core technology, platforms, and product engineering.",
  },
];

// MAIN PAGE
export default function HomePage() {
  const { isAuthenticated, hasCompany, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState("");
  const [hoveredSolution, setHoveredSolution] = useState(null);

  // AUTH Redirect
  useEffect(() => {
    if (!loading && isAuthenticated) {
      hasCompany ? router.push("/dashboard") : router.push("/setup");
    }
  }, [isAuthenticated, hasCompany, loading, router]);

  // Newsletter
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubscriptionStatus("subscribing");
    setTimeout(() => {
      setSubscriptionStatus("success");
      setEmail("");
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ===== NAVBAR ===== */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 w-full h-20 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <img src="/logomain.png" className="w-10 h-10 rounded-lg" />
            <div>
              <h1 className="font-bold text-lg">EZBillify</h1>
              <p className="text-[10px] uppercase text-slate-500 font-semibold">Technologies</p>
            </div>
          </motion.div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {[
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
                  className="text-slate-600 hover:text-blue-600 transition-all duration-300 relative group"
                >
                  {item.label}
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300"></div>
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
              className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
            >
              Access Portal
            </Link>
          </motion.div>
        </div>
      </motion.nav>

      {/* ===== HERO ===== */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-1000 h-600 bg-gradient-to-b from-blue-400/20 to-transparent blur-3xl rounded-full -z-10"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* LEFT */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block"
            >
              <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-full text-xs font-bold text-blue-700 shadow-sm">
                Modern Billing, Made Simple
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-6xl lg:text-7xl font-bold leading-tight tracking-tight"
            >
              Smart, Fast &
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">GST-Compliant Billing.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg text-slate-600 max-w-lg leading-relaxed font-light"
            >
              Trusted by 1,000+ Indian businesses for faster invoicing, real-time syncing, advanced GST features, and accurate revenue insights.
            </motion.p>

            {/* STATS */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-6 pt-8"
            >
              {[
                { num: "1K+", label: "Active users" },
                { num: "50+", label: "Enterprises" },
                { num: "99.9%", label: "Uptime SLA" }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    {stat.num}
                  </div>
                  <p className="text-xs uppercase text-slate-500 font-semibold mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex gap-4 pt-4"
            >
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(37, 99, 235, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all"
                >
                  Get Started
                </motion.button>
              </Link>
              <Link href="/services">
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: "rgba(15, 23, 42, 0.1)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border-2 border-slate-300 text-slate-900 rounded-xl font-semibold hover:border-blue-600 transition-all"
                >
                  Explore Features
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* RIGHT - DASHBOARD */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <motion.div
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-full max-w-lg mx-auto"
            >
              {/* CARD */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden backdrop-blur-xl">
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full shadow-md"></div>
                    <div className="w-3 h-3 bg-amber-400 rounded-full shadow-md"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full shadow-md"></div>
                  </div>
                  <span className="text-[10px] font-mono bg-white border border-slate-200 px-3 py-1 rounded-md text-slate-500 font-semibold">
                    app.ezbillify.com
                  </span>
                </div>

                {/* KPI CARDS */}
                <div className="px-6 py-8 bg-white grid grid-cols-3 gap-4">
                  {[
                    { label: "Revenue", value: "₹10.8L", trend: "+12.4%", color: "from-emerald-500 to-green-600" },
                    { label: "Invoices", value: "1,408", trend: "+89", color: "from-blue-500 to-cyan-600" },
                    { label: "Customers", value: "85", trend: "+6", color: "from-violet-500 to-purple-600" }
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-lg cursor-pointer transition-all`}
                    >
                      <div className="text-xs opacity-90 font-medium">{card.label}</div>
                      <div className="text-2xl font-bold mt-2">{card.value}</div>
                      <div className="text-xs opacity-75 font-semibold mt-2">{card.trend}</div>
                    </motion.div>
                  ))}
                </div>

                {/* CHART SECTION */}
                <div className="px-6 py-8 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 mb-6">Weekly Revenue Trend</h3>
                  <AdvancedChart />
                </div>

                {/* INVOICE LIST */}
                <div className="px-6 py-6 bg-white border-t border-slate-100 rounded-b-3xl">
                  <h4 className="text-sm font-bold text-slate-900 mb-4">Recent Invoices</h4>
                  <div className="space-y-3">
                    {[
                      { id: "INV-1021", name: "Goyal Traders", amount: "₹4,920" },
                      { id: "INV-1018", name: "Metro Mart", amount: "₹12,300" },
                      { id: "INV-1017", name: "Sri Enterprises", amount: "₹2,880" },
                    ].map((inv, idx) => (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + idx * 0.08 }}
                        whileHover={{ x: 5, backgroundColor: "rgba(15, 23, 42, 0.05)" }}
                        className="flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">{inv.id}</div>
                          <div className="text-xs text-slate-500">{inv.name}</div>
                        </div>
                        <div className="text-sm font-bold text-slate-900">{inv.amount}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GLOW */}
              <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gradient-to-tl from-blue-500/20 via-purple-500/10 to-transparent blur-3xl rounded-full -z-10"></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== SOLUTIONS ===== */}
      <section className="py-32 px-6 bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold mb-4">Our Solutions</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Billing, mobility, IoT — a complete suite powering modern Indian enterprises.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {SOLUTIONS.map(({ key, title, desc, img, features }, idx) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px rgba(37, 99, 235, 0.2)" }}
                className="group p-8 bg-white rounded-3xl border border-slate-200 hover:border-blue-400 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredSolution(idx)}
                onMouseLeave={() => setHoveredSolution(null)}
              >
                <motion.div
                  animate={{ scale: hoveredSolution === idx ? 1.1 : 1 }}
                  className="mb-6"
                >
                  <img src={img} className="w-14 h-14" />
                </motion.div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">{desc}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {features.map((f) => (
                    <span key={f} className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full font-semibold border border-blue-100">
                      {f}
                    </span>
                  ))}
                </div>

                <Link href={getSolutionLink(key)}>
                  <motion.a
                    whileHover={{ x: 5 }}
                    className="text-blue-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all"
                  >
                    Learn More <span>→</span>
                  </motion.a>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LEADERSHIP ===== */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <h2 className="text-5xl font-bold mb-4">Meet Our Leadership</h2>
            <p className="text-lg text-slate-600">Visionaries building India's modern digital infrastructure.</p>
          </motion.div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            {FOUNDERS.map(({ name, role, img, description }, idx) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.2 }}
                whileHover={{ y: -5 }}
                className="flex items-center gap-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-8 hover:from-blue-50 hover:to-slate-100 transition-all border border-slate-200"
              >
                <img src={img} className="w-28 h-28 rounded-2xl object-cover shadow-lg" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{name}</h3>
                  <p className="text-blue-600 font-semibold text-sm mt-1">{role}</p>
                  <p className="text-slate-600 text-sm mt-4 leading-relaxed">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-28 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto"
        >
          <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-20 overflow-hidden border border-slate-700/50 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 rounded-3xl"></div>
            <div className="absolute top-20 right-0 w-80 h-80 bg-blue-600/20 blur-3xl rounded-full -z-0"></div>

            <div className="relative z-10 text-center text-white">
              <h2 className="text-4xl font-bold mb-6">Ready to scale your operations?</h2>
              <p className="text-slate-300 text-lg max-w-xl mx-auto mb-10">
                Join the growing businesses automating and accelerating their workflow with EZBillify.
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4 justify-center"
              >
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 bg-white text-slate-900 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all"
                  >
                    Get Started
                  </motion.button>
                </Link>
                <Link href="/contact">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 border-2 border-white text-white rounded-full font-semibold transition-all"
                  >
                    Contact Sales
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
              Modern billing, automation, and enterprise-grade software for India's fastest-growing businesses.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4">Solutions</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/login" className="hover:text-blue-600 transition">Billing Platform</Link></li>
              <li><Link href="/ezhydrakan" className="hover:text-blue-600 transition">Water IoT</Link></li>
              <li><Link href="/hallodore" className="hover:text-blue-600 transition">Electric Mobility</Link></li>
              <li><Link href="/services" className="hover:text-blue-600 transition">SaaS Development</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-slate-600 text-sm">
              <li><Link href="/about" className="hover:text-blue-600 transition">About Us</Link></li>
              <li><Link href="/careers" className="hover:text-blue-600 transition">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link></li>
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