import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import Head from "next/head";

const FEATURES = [
  {
    title: "Smart Delivery Interface",
    desc: "Revolutionary 7-inch touchscreen with AI-powered route optimization and real-time delivery tracking for maximum efficiency.",
    icon: "🚀",
    stats: "Coming Q2 2026",
    status: "In Development"
  },
  {
    title: "Industry-Leading Range",
    desc: "Advanced lithium-ion technology delivering up to 320km on a single charge, setting new standards for commercial EVs.",
    icon: "⚡",
    stats: "320km Range",
    status: "Testing Phase"
  },
  {
    title: "Fleet Command Center",
    desc: "Centralized dashboard for fleet operators with predictive maintenance, analytics, and remote diagnostics.",
    icon: "🎯",
    stats: "Real-time Control",
    status: "Beta Testing"
  },
  {
    title: "Rapid Charging Technology",
    desc: "Next-generation fast charging system designed for commercial operations with minimal downtime.",
    icon: "⚡",
    stats: "45min 0-80%",
    status: "Prototype Ready"
  },
  {
    title: "Commercial-Grade Build",
    desc: "Engineered for durability with reinforced chassis, weatherproof design, and enhanced payload capacity.",
    icon: "🛡️",
    stats: "150kg Capacity",
    status: "Design Complete"
  },
  {
    title: "Cost Optimization",
    desc: "Intelligent systems designed to deliver the lowest total cost of ownership in the commercial EV segment.",
    icon: "💎",
    stats: "60% Savings",
    status: "Analysis Complete"
  }
];

const DEVELOPMENT_PHASES = [
  {
    phase: "Research & Design",
    status: "Completed",
    progress: 65,
    description: "Advanced engineering and design optimization"
  },
  {
    phase: "Prototype Development",
    status: "In Progress",
    progress: 45,
    description: "Building and testing core systems"
  },
  {
    phase: "Testing & Validation",
    status: "Starting Soon",
    progress: 35,
    description: "Comprehensive performance and safety testing"
  },
  {
    phase: "Production Setup",
    status: "Planning",
    progress: 15,
    description: "Manufacturing facility and supply chain"
  },
  {
    phase: "Market Launch",
    status: "Q4 2026",
    progress: 5,
    description: "Commercial availability and fleet partnerships"
  }
];

export default function HallodoreEV() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [dashboardState, setDashboardState] = useState(0);
  const [email, setEmail] = useState("");

  useEffect(() => {
    setIsLoaded(true);
    
    // Defer animations to improve initial load
    const timeoutId = setTimeout(() => {
      const featureInterval = setInterval(() => {
        setActiveFeature((prev) => (prev + 1) % FEATURES.length);
      }, 4000);
      
      const dashboardInterval = setInterval(() => {
        setDashboardState((prev) => (prev + 1) % 3);
      }, 2500);
      
      return () => {
        clearInterval(featureInterval);
        clearInterval(dashboardInterval);
      };
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleWaitlistSubmit = (e) => {
    e.preventDefault();
    // Handle waitlist submission
    console.log("Waitlist signup:", email);
    setEmail("");
  };

  return (
    <>
      <Head>
        <title>Hallodore - Future of Smart Delivery | Electric Mobility</title>
        <meta name="description" content="India's most advanced commercial electric scooter platform. 320km range, 45min fast charging, AI-powered fleet management. Coming Q4 2026." />
        <link rel="preload" href="/hallodore.png" as="image" />
      </Head>
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background Elements - Optimized with will-change */}
      <div className="fixed inset-0 z-0" style={{ willChange: 'transform' }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse delay-1000" style={{ willChange: 'opacity' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-green-500/5 to-emerald-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800/50 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Image
                  src="/hallodore.png"
                  alt="Hallodore"
                  width={48}
                  height={48}
                  className="rounded-xl"
                  priority
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Hallodore</h1>
                <p className="text-xs text-gray-400">Electric Mobility</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-green-400 font-medium transition-colors">Technology</a>
              <a href="#development" className="text-gray-300 hover:text-green-400 font-medium transition-colors">Development</a>
              <a href="#waitlist" className="text-gray-300 hover:text-green-400 font-medium transition-colors">Updates</a>
            </div>
            
            <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-full font-semibold hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 transition-all duration-300">
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative pt-24 pb-20 px-6 min-h-screen flex items-center transition-all duration-2000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-sm font-medium backdrop-blur-sm">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-3 animate-pulse"></div>
                  Product Under Development • Coming 2026
                </div>
                
                <h1 className="text-6xl lg:text-8xl font-bold leading-tight">
                  <span className="block text-white">The Future</span>
                  <span className="block text-white">of</span>
                  <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                    Smart Delivery
                  </span>
                </h1>
                
                <p className="text-2xl text-gray-300 leading-relaxed max-w-2xl">
                  India's most advanced commercial electric scooter is being engineered to revolutionize 
                  last-mile delivery with cutting-edge technology and unmatched performance.
                </p>
              </div>
              
              {/* Key Stats Preview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">320</div>
                  <div className="text-sm text-gray-400 mt-1">km Range</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">45</div>
                  <div className="text-sm text-gray-400 mt-1">min Charge</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">7"</div>
                  <div className="text-sm text-gray-400 mt-1">Smart Display</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">150</div>
                  <div className="text-sm text-gray-400 mt-1">kg Payload</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-green-500/25 hover:scale-105 transition-all duration-300">
                  Reserve Your Spot
                </button>
                <button className="border-2 border-green-500/50 text-green-400 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-green-500/10 hover:border-green-400 transition-all duration-300 backdrop-blur-sm">
                  Watch Development
                </button>
              </div>
            </div>
            
            {/* Right - Futuristic Scooter Visualization */}
            <div className="relative">
              {/* Main Container */}
              <div className="relative bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-3xl border border-gray-700/50 backdrop-blur-xl p-12 min-h-[700px]">
                {/* Development Badge */}
                <div className="absolute top-6 right-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-4 py-2 text-sm font-medium text-orange-300 backdrop-blur-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <span>In Development</span>
                  </div>
                </div>

                {/* Scooter Visualization */}
                <div className="relative flex items-center justify-center h-full">
                  <div className="relative" style={{width: '450px', height: '300px'}}>
                    {/* Holographic Grid Background */}
                    <div className="absolute inset-0 opacity-20">
                      <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
                        {Array.from({length: 96}).map((_, i) => (
                          <div key={i} className="border border-green-400/20"></div>
                        ))}
                      </div>
                    </div>

                    {/* Main Scooter Body */}
                    <div className="absolute top-20 left-12 w-96 h-24 bg-gradient-to-r from-slate-700 to-slate-600 rounded-3xl shadow-2xl border border-green-500/30">
                      {/* Advanced Seat Design */}
                      <div className="absolute -top-6 left-16 w-40 h-16 bg-gradient-to-r from-gray-700 to-gray-600 rounded-2xl border border-blue-500/30"></div>
                      
                      {/* Futuristic Handlebar */}
                      <div className="absolute -top-12 left-12 w-8 h-24 bg-gradient-to-b from-gray-600 to-gray-700 rounded-t-xl"></div>
                      <div className="absolute -top-16 left-8 w-16 h-6 bg-gradient-to-r from-gray-600 to-gray-700 rounded-xl border border-purple-500/30"></div>
                      
                      {/* Smart Display Mount */}
                      <div className="absolute -top-14 left-12 w-16 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl border-2 border-cyan-400/50 shadow-lg">
                        <div className="absolute inset-1 bg-black/80 rounded-xl flex items-center justify-center">
                          <div className="text-xs text-cyan-300 font-bold">OS</div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                      </div>
                      
                      {/* Cargo Compartment */}
                      <div className="absolute top-3 right-6 w-28 h-18 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl border-2 border-green-400/50">
                        <div className="absolute inset-1 bg-black/30 rounded-lg"></div>
                        <div className="absolute top-2 left-2 text-xs text-green-200 font-bold">CARGO</div>
                        <div className="absolute bottom-1 right-1 text-xs text-green-300">150kg</div>
                      </div>
                      
                      {/* Battery Pack Visualization */}
                      <div className="absolute bottom-3 left-20 w-32 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl border border-green-400/50">
                        <div className="absolute inset-0.5 bg-black/40 rounded-xl flex items-center justify-center">
                          <div className="text-xs text-green-300 font-bold">BATTERY PACK</div>
                        </div>
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    
                    {/* Front Wheel - Enhanced */}
                    <div className="absolute bottom-6 left-6 w-24 h-24 bg-gradient-to-br from-gray-800 to-black rounded-full border-4 border-gray-600 shadow-2xl">
                      <div className="absolute inset-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border border-green-500/30">
                        <div className="absolute inset-4 bg-green-500/20 rounded-full animate-spin" style={{animationDuration: '4s'}}></div>
                        <div className="absolute inset-6 bg-gradient-to-r from-green-400/50 to-emerald-500/50 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Rear Wheel - Enhanced */}
                    <div className="absolute bottom-6 right-12 w-24 h-24 bg-gradient-to-br from-gray-800 to-black rounded-full border-4 border-gray-600 shadow-2xl">
                      <div className="absolute inset-3 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full border border-blue-500/30">
                        <div className="absolute inset-4 bg-blue-500/20 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
                        <div className="absolute inset-6 bg-gradient-to-r from-blue-400/50 to-cyan-500/50 rounded-full"></div>
                      </div>
                    </div>
                    
                    {/* Floating Holographic Data Points */}
                    <div className="absolute -top-8 -left-8 bg-black/90 backdrop-blur-sm border border-green-500/50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-green-400">320km</div>
                      <div className="text-xs text-gray-400">Max Range</div>
                      <div className="absolute top-0 right-0 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </div>
                    
                    <div className="absolute -top-8 -right-8 bg-black/90 backdrop-blur-sm border border-blue-500/50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-blue-400">85%</div>
                      <div className="text-xs text-gray-400">Complete</div>
                      <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    </div>
                    
                    <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-sm border border-purple-500/50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-purple-400">Q4 2026</div>
                      <div className="text-xs text-gray-400">Launch Target</div>
                      <div className="absolute top-0 right-0 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Preview - Floating */}
              <div className="absolute -bottom-8 -right-8 w-80 h-72 bg-gradient-to-br from-gray-900/95 to-black/95 rounded-3xl border border-gray-700/50 backdrop-blur-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">HallodoreOS</h3>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-700"></div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {dashboardState === 0 && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">Route Optimization</div>
                        <div className="text-sm text-gray-400">AI-Powered Navigation</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <div className="text-green-400 font-bold">12</div>
                          <div className="text-gray-400">Deliveries</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <div className="text-blue-400 font-bold">8.5km</div>
                          <div className="text-gray-400">Total Distance</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2 text-center">
                          <div className="text-purple-400 font-bold">98%</div>
                          <div className="text-gray-400">Efficiency</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {dashboardState === 1 && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">89%</div>
                        <div className="text-sm text-gray-400">Battery Level</div>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div className="bg-gradient-to-r from-blue-400 to-cyan-500 h-3 rounded-full" style={{width: '89%'}}></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800 rounded-lg p-2">
                          <div className="text-green-400 font-bold">285km</div>
                          <div className="text-gray-400">Range Left</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2">
                          <div className="text-orange-400 font-bold">32°C</div>
                          <div className="text-gray-400">Temperature</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {dashboardState === 2 && (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">Fleet Connected</div>
                        <div className="text-sm text-gray-400">Real-time Monitoring</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-800 rounded-lg p-2">
                          <div className="text-green-400 font-bold">Online</div>
                          <div className="text-gray-400">Status</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-2">
                          <div className="text-blue-400 font-bold">DL-07</div>
                          <div className="text-gray-400">Vehicle ID</div>
                        </div>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <div className="text-orange-400 font-bold text-center">Next Service: 2,450km</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-sm font-medium backdrop-blur-sm mb-8">
              <div className="w-2 h-2 bg-orange-400 rounded-full mr-3 animate-pulse"></div>
              Engineering the Future of Delivery
            </div>
            
            <h2 className="text-5xl lg:text-7xl font-bold mb-8 leading-tight">
              <span className="text-white">Revolutionary Technology</span>
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                In Development
              </span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Every component is being meticulously engineered to deliver unprecedented performance, 
              efficiency, and intelligence for commercial electric mobility.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-3xl border backdrop-blur-xl p-8 hover:scale-105 transition-all duration-500 ${
                  feature.status === "Completed" ? "border-green-500/50" :
                  feature.status === "In Development" ? "border-blue-500/50" :
                  feature.status === "Testing Phase" ? "border-purple-500/50" :
                  feature.status === "Prototype Ready" ? "border-orange-500/50" :
                  feature.status === "Design Complete" ? "border-cyan-500/50" :
                  "border-gray-700/50"
                }`}
              >
                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${
                  feature.status === "Completed" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  feature.status === "In Development" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                  feature.status === "Testing Phase" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                  feature.status === "Prototype Ready" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                  feature.status === "Design Complete" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                  "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}>
                  {feature.status}
                </div>
                
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300 mb-6 leading-relaxed">{feature.desc}</p>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  feature.status === "Completed" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  feature.status === "In Development" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                  "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-3 animate-pulse ${
                    feature.status === "Completed" ? "bg-green-400" :
                    feature.status === "In Development" ? "bg-blue-400" :
                    "bg-orange-400"
                  }`}></div>
                  {feature.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Development Timeline */}
      <section id="development" className="py-32 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-6">
              Development Timeline
            </h2>
            <p className="text-xl text-gray-300">Track our progress as we build the future of delivery</p>
          </div>

          <div className="space-y-8">
            {DEVELOPMENT_PHASES.map((phase, index) => (
              <div key={index} className="relative bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-2xl border border-gray-700/50 backdrop-blur-xl p-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{phase.phase}</h3>
                    <p className="text-gray-300">{phase.description}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                    phase.status === "Completed" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                    phase.status === "In Progress" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                    "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                  }`}>
                    {phase.status}
                  </div>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                  <div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      phase.progress === 100 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                      phase.progress > 50 ? "bg-gradient-to-r from-blue-400 to-cyan-500" :
                      "bg-gradient-to-r from-orange-400 to-red-500"
                    }`}
                    style={{width: `${phase.progress}%`}}
                  ></div>
                </div>
                <div className="text-right text-sm text-gray-400">{phase.progress}% Complete</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Section */}
      <section id="waitlist" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-700/20"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-sm font-medium backdrop-blur-sm mb-8">
            <div className="w-2 h-2 bg-orange-400 rounded-full mr-3 animate-pulse"></div>
            Be Among the First to Experience the Future
          </div>
          
          <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8">
            Join the Revolution
          </h2>
          <p className="text-xl text-gray-300 mb-12 leading-relaxed">
            Get exclusive updates on development progress, early access to test rides, 
            and priority booking when Hallodore launches in Q4 2026.
          </p>
          
          <form onSubmit={handleWaitlistSubmit} className="max-w-md mx-auto mb-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-6 py-4 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-green-500/50 backdrop-blur-sm"
                required
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl hover:shadow-green-500/25 hover:scale-105 transition-all duration-300"
              >
                Join Waitlist
              </button>
            </div>
          </form>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-700/50 backdrop-blur-xl p-8 text-center">
              <div className="text-4xl mb-4">🔬</div>
              <h3 className="text-xl font-bold text-white mb-3">Exclusive Updates</h3>
              <p className="text-gray-300">Get behind-the-scenes development insights and progress reports</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-700/50 backdrop-blur-xl p-8 text-center">
              <div className="text-4xl mb-4">🏁</div>
              <h3 className="text-xl font-bold text-white mb-3">Early Access</h3>
              <p className="text-gray-300">Priority booking and test ride opportunities before public launch</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-700/50 backdrop-blur-xl p-8 text-center">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold text-white mb-3">Special Pricing</h3>
              <p className="text-gray-300">Exclusive launch discounts and fleet partnership benefits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <Image
                    src="/hallodore.png"
                    alt="Hallodore"
                    width={48}
                    height={48}
                    className="rounded-xl"
                    loading="lazy"
                  />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Hallodore</h3>
                  <p className="text-gray-400 text-sm">Electric Mobility</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6 max-w-md">
                India's most advanced commercial electric scooter platform, currently in development 
                to revolutionize last-mile delivery operations.
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-sm font-medium text-orange-300">
                <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
                Coming Q4 2026
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6 text-green-400">Development</h4>
              <ul className="space-y-3">
                <li><span className="text-gray-300">Technology Updates</span></li>
                <li><span className="text-gray-300">Progress Reports</span></li>
                <li><span className="text-gray-300">Testing Updates</span></li>
                <li><span className="text-gray-300">Launch Timeline</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-bold mb-6 text-green-400">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-green-400 transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-green-400 transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-green-400 transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-300 hover:text-green-400 transition-colors">EZBillify Technologies</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} Hallodore Electric Mobility by EZBillify Technologies. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors text-sm">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors text-sm">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-green-400 transition-colors text-sm">Development Blog</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}