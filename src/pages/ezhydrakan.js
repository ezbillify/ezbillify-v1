import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Camera,
  Smartphone,
  Wifi,
  Battery,
  Shield,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  Download,
  Play,
  Building2,
  Home,
  Factory,
  Users,
  Menu,
  X,
  ChevronDown,
  MapPin,
  Thermometer,
  Activity,
  BarChart3,
  Settings,
  Bell,
  FileText
} from "lucide-react";

const EZHydakanLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFAQ, setActiveFAQ] = useState(null);
  const { scrollYProgress } = useScroll();
  const heroRef = useRef(null);
  
  const heroY = useTransform(scrollYProgress, [0, 0.3], ["0%", "15%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  const navigation = [
    { name: "Suite", href: "#suite" },
    { name: "ApasCore", href: "#apascore" },
    { name: "HydraCam", href: "#hydracam" },
    { name: "HydakanX", href: "#hydakanx" },
    { name: "Solutions", href: "#solutions" },
    { name: "Pricing", href: "#pricing" }
  ];

  const valueHighlights = [
    {
      icon: <Droplets className="w-6 h-6" />,
      title: "Accurate Tank Levels",
      desc: "Precise percentage readings for overhead and underground tanks"
    },
    {
      icon: <Camera className="w-6 h-6" />,
      title: "Automatic Meter Reading",
      desc: "Camera-based OCR for standard mechanical meters"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Billing-Ready Data",
      desc: "Seamless exports, alerts, and integration with billing systems"
    }
  ];

  const solutions = [
    {
      title: "Apartments & Gated Communities",
      desc: "Fair allocation, leak detection, resident transparency",
      bundle: "ApasCore + HydraCam + HydakanX",
      icon: <Building2 className="w-8 h-8" />,
      cta: "Talk to Sales"
    },
    {
      title: "Commercial Buildings & Campuses",
      desc: "Multi-tank operations, multiple meters, centralized analytics",
      bundle: "Enterprise Suite",
      icon: <Factory className="w-8 h-8" />,
      cta: "Book a Walkthrough"
    },
    {
      title: "Villas & Small Businesses",
      desc: "Simple setup, alerts, monthly trends",
      bundle: "Starter Package",
      icon: <Home className="w-8 h-8" />,
      cta: "Get Started"
    },
    {
      title: "Utilities & Service Providers",
      desc: "Bulk deployments, fleet monitoring, SLAs, APIs",
      bundle: "Partner Program",
      icon: <Users className="w-8 h-8" />,
      cta: "Partner with Us"
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      desc: "For 1–2 devices/site",
      features: ["HydakanX basic analytics", "Email support", "Mobile app access"],
      cta: "Get Started"
    },
    {
      name: "Standard",
      desc: "3–20 devices/site",
      features: ["Advanced alerts and exports", "Priority support", "API access"],
      cta: "See Quote",
      popular: true
    },
    {
      name: "Enterprise",
      desc: "20+ devices, multi-site fleet",
      features: ["SLAs, APIs, custom integrations", "Dedicated success manager", "White-label options"],
      cta: "Talk to Sales"
    }
  ];

  const faqs = [
    {
      question: "Tank accuracy: How is % derived from depth?",
      answer: "ApasCore uses calibrated depth measurements combined with tank geometry profiles to calculate accurate percentage levels. Our 2-5 point calibration system accounts for irregular shapes and temperature variations."
    },
    {
      question: "Irregular tanks: Can you calibrate for non-linear shapes?",
      answer: "Yes, ApasCore supports rectangular, cylindrical (vertical/horizontal), and custom tank shapes. Our calibration process creates precise volume curves for any tank geometry."
    },
    {
      question: "Supported meters: Which meter models work with HydraCam?",
      answer: "HydraCam works with standard mechanical numeric meters featuring 0-9 rollers or dials. We maintain a compatibility list in our spec sheet covering most common meter models."
    },
    {
      question: "OCR reliability: What happens with low-confidence reads?",
      answer: "HydraCam uses confidence scoring and flags uncertain readings for quick human verification. The system includes rollover detection and sanity checks against previous readings."
    },
    {
      question: "Power and connectivity: Battery/AC, Wi-Fi/LTE/LoRa/BLE options?",
      answer: "Both devices offer flexible power options (battery, 12-24V, solar) and multiple connectivity choices (Wi-Fi, LTE, LoRa, BLE) to suit any installation environment."
    },
    {
      question: "Data and privacy: Are images and readings encrypted?",
      answer: "Yes, all data is encrypted end-to-end with per-device keys. Images and readings are transmitted securely and stored with enterprise-grade encryption."
    },
    {
      question: "Billing: How does this connect to Ezbillify?",
      answer: "The EZHydakan suite integrates seamlessly with Ezbillify billing systems through APIs and webhooks, providing automated data flow for accurate billing calculations."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
           <img 
           src="/EZHydakan.png" 
             alt="EZHydakan Logo" 
            className="h-12 w-auto rounded-lg"
              />
             <div>
    <span className="text-xl font-bold text-gray-900">EZHydakan</span>
    <div className="text-xs text-gray-500">by Ezbillify</div>
  </div>
</div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium"
                >
                  {item.name}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                See Pricing
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                <Play className="w-4 h-4" />
                Get a Demo
              </button>

              {/* Mobile menu button */}
              <button
                className="md:hidden"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 bg-white"
            >
              <div className="px-4 py-4 space-y-3">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block py-2 text-gray-600 hover:text-blue-600"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-200 rounded-full opacity-20 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-200 rounded-full opacity-20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-gray-900">Measure.</span>{" "}
                  <span className="text-blue-600">See.</span>{" "}
                  <span className="text-gray-900">Bill.</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                  EZHydakan by Ezbillify delivers precise tank-level sensing and automatic meter reading—streamlined in the HydakanX app.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  <Play className="w-5 h-5" />
                  Get a Demo
                </button>
                <button className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-colors">
                  See Pricing
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Made in India
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  Encrypted end-to-end
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Zap className="w-4 h-4 text-blue-500" />
                  OTA updates
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Smartphone className="w-4 h-4 text-purple-500" />
                  iOS + Android
                </div>
              </div>
            </motion.div>

            {/* Product Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-8">
                <div className="grid grid-cols-3 gap-6">
                  {/* ApasCore */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Droplets className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">ApasCore</div>
                      <div className="text-xs text-gray-600">Tank Sensor</div>
                    </div>
                  </div>
                  
                  {/* HydraCam */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">HydraCam</div>
                      <div className="text-xs text-gray-600">Meter Reader</div>
                    </div>
                  </div>
                  
                  {/* HydakanX */}
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Smartphone className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">HydakanX</div>
                      <div className="text-xs text-gray-600">Mobile App</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Value Highlights */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8">
            {valueHighlights.map((highlight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-600 mb-4">
                  {highlight.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {highlight.title}
                </h3>
                <p className="text-gray-600">
                  {highlight.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EZHydakan Suite Overview */}
      <section id="suite" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              EZHydakan Suite
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              The EZHydakan suite unifies the ApasCore water-level sensor and HydraCam meter reader 
              under the HydakanX app—so every drop is tracked, verified, and bill-ready.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* ApasCore */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">ApasCore</h3>
              </div>
              <p className="text-gray-600 mb-4">Tank-level percentage, alerts, time-to-empty/fill</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Percentage-accurate levels</li>
                <li>• Multiple tank profiles</li>
                <li>• Temperature compensation</li>
              </ul>
            </motion.div>

            {/* HydraCam */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">HydraCam</h3>
              </div>
              <p className="text-gray-600 mb-4">Image-backed OCR of standard mechanical meters</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• OCR for mechanical counters</li>
                <li>• Confidence scoring</li>
                <li>• Audit trail images</li>
              </ul>
            </motion.div>

            {/* HydakanX */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold">HydakanX</h3>
              </div>
              <p className="text-gray-600 mb-4">Live dashboards, alerts, exports, roles/permissions</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Live dashboards</li>
                <li>• Advanced alerts</li>
                <li>• API integrations</li>
              </ul>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="px-6 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
              Explore ApasCore
            </button>
            <button className="px-6 py-3 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium transition-colors">
              Explore HydraCam
            </button>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Get HydakanX
            </button>
          </div>
        </div>
      </section>

      {/* ApasCore Section */}
      <section id="apascore" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Droplets className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">ApasCore</h2>
                  <p className="text-blue-600 font-medium">Water Level Sensor</p>
                </div>
              </div>
              <p className="text-xl text-gray-600 mb-8">Precision Tank-Level Sensing</p>

              <div className="space-y-4 mb-8">
                {[
                  "Percentage-accurate levels for overhead and underground tanks",
                  "Profiles for rectangular, cylindrical (vertical/horizontal), and custom shapes",
                  "2–5 point calibration with temperature compensation",
                  "Splash/noise filtering and drift detection for stable readings",
                  "Low/high threshold alerts, time-to-empty/fill estimates",
                  "Seamless pairing with HydakanX and Ezbillify billing"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  Download Spec Sheet
                </button>
                <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors">
                  Request Install Guide
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8"
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">Sensor Type</div>
                    <div className="text-gray-600">Ultrasonic/Pressure/ToF</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Accuracy</div>
                    <div className="text-gray-600">±1–2% after calibration</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Range</div>
                    <div className="text-gray-600">0.2–4m (model-dependent)</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Ingress Rating</div>
                    <div className="text-gray-600">IP65/IP67 options</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Power</div>
                    <div className="text-gray-600">Battery/12–24V/solar</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Connectivity</div>
                    <div className="text-gray-600">Wi-Fi/LTE/LoRa/BLE</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Operating Temp</div>
                    <div className="text-gray-600">-10–55°C</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Mounting</div>
                    <div className="text-gray-600">Overhead/stilling tube</div>
                  </div>
                </div>
              </div>

              {/* Tank visualization */}
              <div className="bg-white rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-blue-600">73%</div>
                  <div className="text-sm text-gray-600">Current Level</div>
                </div>
                <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 transition-all duration-1000"
                    style={{ height: '73%' }}
                  />
                  <div className="absolute top-2 left-2 right-2 flex justify-between text-xs text-gray-600">
                    <span>Empty</span>
                    <span>Full</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HydraCam Section */}
      <section id="hydracam" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">Camera</div>
                      <div className="text-gray-600">High-res sensor, wide FOV</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Illumination</div>
                      <div className="text-gray-600">IR/LED lighting</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Supported Meters</div>
                      <div className="text-gray-600">Mechanical numeric meters</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Power</div>
                      <div className="text-gray-600">AC/battery options</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Connectivity</div>
                      <div className="text-gray-600">Wi-Fi/LTE/BLE</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Enclosure</div>
                      <div className="text-gray-600">IP-rated variants</div>
                    </div>
                  </div>
                </div>

                {/* Meter reading visualization */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-xl font-mono font-bold text-indigo-600">1247.89</div>
                    <div className="text-sm text-gray-600">Latest Reading</div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <span className="text-gray-700">High Confidence (98.5%)</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">HydraCam</h2>
                  <p className="text-indigo-600 font-medium">Camera-Based Meter Reader</p>
                </div>
              </div>
              <p className="text-xl text-gray-600 mb-8">Automatic Meter Reads, Zero Manual Errors</p>

              <div className="space-y-4 mb-8">
                {[
                  "OCR for standard mechanical counters (0–9 rollers/dials)",
                  "De-skew, glare reduction, low-light illumination",
                  "Confidence scoring with quick human confirm when needed",
                  "Rollover detection and sanity checks against prior reads",
                  "Timestamped images for audit trails; online/offline sync",
                  "Integrates directly with HydakanX and billing exports"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 hover:border-gray-400 rounded-lg text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  Download Spec Sheet
                </button>
                <button className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors">
                  Book a Demo
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* HydakanX Section */}
      <section id="hydakanx" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">HydakanX</h2>
                  <p className="text-purple-600 font-medium">Mobile App</p>
                </div>
              </div>
              <p className="text-xl text-gray-600 mb-8">One App for Sensors and Reads</p>

              <div className="space-y-4 mb-8">
                {[
                  "Live tank percentages with trends and time-to-empty",
                  "Image-backed meter readings with confidence flags",
                  "Alerts: low level, overflow risk, leaks, missed reads",
                  "QR onboarding, site/device management, roles/permissions",
                  "Offline caching, auto-sync; CSV/PDF exports",
                  "API/webhook integration with Ezbillify billing"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                  <Download className="w-5 h-5" />
                  Get the App (iOS | Android)
                </button>
                <button className="px-6 py-3 border border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors">
                  See a Live Demo
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* App mockup */}
              <div className="relative max-w-sm mx-auto">
                <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
                  <div className="bg-white rounded-2xl p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Dashboard</h3>
                      <Bell className="w-5 h-5 text-gray-400" />
                    </div>

                    {/* Tank Status */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Main Tank</span>
                        <span className="text-xs text-gray-500">2 min ago</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">73%</div>
                      <div className="text-xs text-gray-600">Time to empty: 2.3 days</div>
                    </div>

                    {/* Meter Reading */}
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Meter Reading</span>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>
                      <div className="text-lg font-mono font-semibold text-indigo-600 mb-1">1247.89</div>
                      <div className="text-xs text-gray-600">Confidence: 98.5%</div>
                    </div>

                    {/* Recent Alerts */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Recent Alerts</div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span className="text-gray-600">Low level warning</span>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-around pt-4 border-t border-gray-200">
                      <Activity className="w-5 h-5 text-purple-600" />
                      <BarChart3 className="w-5 h-5 text-gray-400" />
                      <Settings className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Solutions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Tailored water management solutions for every use case
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {solutions.map((solution, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-blue-600 mb-4">
                  {solution.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {solution.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {solution.desc}
                </p>
                <div className="mb-6">
                  <div className="text-sm font-medium text-gray-700 mb-1">Recommended bundle:</div>
                  <div className="text-sm text-blue-600">{solution.bundle}</div>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  {solution.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Pricing</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Bundle hardware once, subscribe to software monthly or annually. Contact sales for tailored deployments.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`bg-white rounded-xl p-8 shadow-sm border-2 ${
                  tier.popular ? 'border-blue-500' : 'border-gray-200'
                } relative`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-6">{tier.desc}</p>
                
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                  tier.popular 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'border border-gray-300 hover:border-gray-400 text-gray-700'
                }`}>
                  {tier.cta}
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-gray-600">
              Extended warranty, installation service, and API access available as add-ons.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">FAQs</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg border border-gray-200"
              >
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${
                    activeFAQ === index ? 'rotate-180' : ''
                  }`} />
                </button>
                <AnimatePresence>
                  {activeFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-gray-600">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Trust & Security</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Encryption",
                desc: "Device-to-cloud encryption, per-device keys"
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Updates",
                desc: "Signed firmware, OTA updates"
              },
              {
                icon: <Camera className="w-6 h-6" />,
                title: "Audit",
                desc: "Image-backed reads, edit logs"
              },
              {
                icon: <CheckCircle className="w-6 h-6" />,
                title: "Compliance",
                desc: "Privacy policy, data retention controls"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-100 text-green-600 mb-4">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to measure every drop?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Transform your water management with precision sensing and intelligent automation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-semibold transition-colors">
                <Play className="w-5 h-5" />
                Get a Demo
              </button>
              <button className="px-8 py-4 border border-blue-400 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors">
                Contact Sales
              </button>
              <button className="px-8 py-4 border border-blue-400 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors">
                <Download className="w-5 h-5 inline mr-2" />
                Download Spec Sheets
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
                 <img 
                    src="/EZHydakan.png" 
                  alt="EZHydakan Logo" 
                  className="h-12 w-auto rounded-lg"
                 />
            <div>
                 <span className="text-xl font-bold">EZHydakan</span>
                 <div className="text-sm text-gray-400">by Ezbillify</div>
                </div>
                </div>
              <p className="text-gray-400 max-w-md">
                Precision tank-level sensing and automatic meter reading—streamlined 
                in one powerful platform.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Partners</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Resources</h5>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog/Updates</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400">
                © 2024 Ezbillify Technologies. All rights reserved.
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Smartphone className="w-4 h-4" />
                  iOS + Android
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" />
                  Made in India
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Shield className="w-4 h-4" />
                  Encrypted
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EZHydakanLanding;