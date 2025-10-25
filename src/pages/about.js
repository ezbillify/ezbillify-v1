// src/pages/about.js - EZBillify V1
import { useState, useEffect } from "react";
import Link from "next/link";

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <img
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
              <Link href="/about" className="text-blue-600 font-medium">About</Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Contact</Link>
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
            About EZBillify Technologies
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Transforming Business
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Through Innovation
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto mb-12">
            Founded in 2022, EZBillify Technologies is dedicated to empowering businesses with intelligent automation solutions. 
            We specialize in billing platforms, electric mobility solutions, custom SaaS applications, and professional websites that drive growth and operational excellence.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {COMPANY_STATS.map(({ number, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">{number}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To empower businesses of all sizes with intelligent, user-friendly technology solutions including billing platforms, 
                  electric mobility, custom SaaS applications, and professional websites that streamline operations, ensure compliance, 
                  and drive sustainable growth in an increasingly digital world.
                </p>
              </div>
              
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To become the leading provider of integrated business automation, sustainable mobility solutions, and comprehensive 
                  digital services, enabling enterprises to operate more efficiently while contributing to a more sustainable future.
                </p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl rotate-6 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Goal</h3>
                  <p className="text-gray-600">
                    To make business automation accessible, affordable, and impactful for companies across all industries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {VALUES.map(({ icon, title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Leadership Team</h2>
            <p className="text-xl text-gray-600">Meet the visionaries behind EZBillify Technologies</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TEAM_MEMBERS.map(({ name, role, img, description, linkedin, email }) => (
              <div
                key={name}
                className="group bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105"
              >
                <div className="flex items-start space-x-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <img
                        src={img}
                        alt={name}
                        width={120}
                        height={120}
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
                    <p className="text-blue-600 font-semibold mb-3">{role}</p>
                    <p className="text-gray-600 leading-relaxed mb-4">{description}</p>
                    
                    <div className="flex space-x-4">
                      <a href={`mailto:${email}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                      </a>
                      <a href={linkedin} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Join Our Journey</h2>
          <p className="text-xl mb-8 text-blue-100">
            Ready to transform your business operations with EZBillify? Let's build the future together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Get in Touch
            </Link>
            <Link
              href="/careers"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Join Our Team
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}