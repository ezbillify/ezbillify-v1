// src/pages/services.js - EZBillify V1
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedService, setSelectedService] = useState("ezbillify");

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const currentService = SERVICES.find(service => service.id === selectedService);

  // Function to handle service navigation
  const handleServiceClick = (serviceId) => {
    if (serviceId === "ezhydrakan") {
      window.location.href = "/ezhydrakan";
    } else if (serviceId === "hallodore") {
      window.location.href = "/hallodore";
    } else {
      setSelectedService(serviceId);
    }
  };

  // Function to get service button label
  const getServiceButtonLabel = (service) => {
    if (service.id === "our-clients") return "Our Clients";
    if (service.id === "ezhydrakan") return "EZHydakan";
    if (service.id === "hallodore") return "Hallodore";
    if (service.id === "custom") return "Custom";
    if (service.id === "professional") return "Professional";
    return service.title.split(' ')[0];
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
              <Link href="/services" className="text-blue-600 font-medium">Services</Link>
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
      <section className={`pt-32 pb-20 px-6 transition-all duration-1500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
            Our Services & Solutions
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Complete Technology
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Solutions for Business
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            From billing platforms to smart water management, electric mobility, SaaS applications to professional websites - 
            we provide comprehensive technology solutions that transform how businesses operate.
          </p>
        </div>
      </section>

      {/* Service Navigation */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            {SERVICES.map((service) => (
              <button
                key={service.id}
                onClick={() => handleServiceClick(service.id)}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  selectedService === service.id && service.id !== "ezhydrakan" && service.id !== "hallodore"
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                }`}
              >
                {getServiceButtonLabel(service)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Selected Service Details */}
      {currentService && currentService.id !== "our-clients" && currentService.id !== "ezhydrakan" && currentService.id !== "hallodore" && (
        <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div>
                  <h2 className="text-4xl font-bold text-gray-900 mb-4">{currentService.title}</h2>
                  <p className="text-xl text-gray-600 leading-relaxed mb-6">{currentService.fullDesc}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    {currentService.technologies.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="text-2xl font-bold text-blue-600 mb-6">{currentService.pricing}</div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/contact"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-center"
                    >
                      {currentService.cta}
                    </Link>
                    <Link
                      href="/contact"
                      className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:border-blue-500 hover:text-blue-600 transition-all duration-300 text-center"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl rotate-6 opacity-20"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                  <div className="text-center mb-6">
                    <Image
                      src={currentService.img}
                      alt={currentService.title}
                      width={120}
                      height={120}
                      className="rounded-2xl shadow-lg mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold text-gray-900">Key Benefits</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {currentService.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Our Clients Section */}
      {currentService && currentService.id === "our-clients" && (
        <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Valued Clients</h2>
              <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
                We're proud to work with forward-thinking companies that trust us with their digital transformation journey.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Grocerywave Card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🛒</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Grocerywave Pvt Ltd</h3>
                  <p className="text-blue-600 font-medium">E-commerce Platform</p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Multi-vendor Marketplace</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Real-time Inventory</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Mobile App Integration</span>
                  </div>
                </div>

                <a
                  href="https://www.grocerywave.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                >
                  Visit Grocerywave
                </a>
              </div>

              {/* Mills Mitra Card */}
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🌾</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mills Mitra</h3>
                  <p className="text-green-600 font-medium">Millet Health Drinks</p>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Nutritious Products</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Health & Wellness Platform</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Brand Management</span>
                  </div>
                </div>

                <a
                  href="https://www.millsmitra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-semibold text-center hover:shadow-lg transition-all"
                >
                  Visit Mills Mitra
                </a>
              </div>
            </div>

            <div className="text-center mt-16">
              <Link
                href="/contact"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-block"
              >
                Become a Client
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Let's discuss how our solutions can help you achieve your business goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Schedule Consultation
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}