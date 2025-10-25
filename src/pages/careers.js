// src/pages/careers.js - EZBillify V1
import { useState, useEffect } from "react";
import Link from "next/link";

const OPEN_POSITIONS = [
  {
    id: 1,
    title: "Senior Full Stack Developer",
    department: "Engineering",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "3-5 years",
    description: "Join our engineering team to build scalable web applications using React, Node.js, and cloud technologies.",
    requirements: ["React.js, Node.js", "AWS/Cloud platforms", "Database design", "RESTful APIs"],
    salary: "₹7-18 LPA"
  },
  {
    id: 2,
    title: "Product Manager",
    department: "Product",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "2-4 years",
    description: "Drive product strategy and roadmap for our billing and mobility solutions. Work closely with engineering and design teams.",
    requirements: ["Product strategy", "User research", "Analytics", "Cross-functional collaboration"],
    salary: "₹10-18 LPA"
  },
  {
    id: 3,
    title: "UI/UX Designer",
    department: "Design",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "2-4 years",
    description: "Create intuitive and beautiful user experiences for our business automation platforms.",
    requirements: ["Figma/Sketch", "User research", "Prototyping", "Design systems"],
    salary: "₹6-12 LPA"
  },
  {
    id: 4,
    title: "Business Development Executive",
    department: "Sales",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "1-3 years",
    description: "Identify and develop new business opportunities, build client relationships, and drive revenue growth.",
    requirements: ["Sales experience", "B2B communication", "CRM tools", "Market research"],
    salary: "₹4-8 LPA + Incentives"
  },
  {
    id: 5,
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "2-4 years",
    description: "Manage cloud infrastructure, CI/CD pipelines, and ensure reliable, scalable deployment processes.",
    requirements: ["AWS/Azure", "Docker/Kubernetes", "CI/CD pipelines", "Infrastructure as Code"],
    salary: "₹7-14 LPA"
  },
  {
    id: 6,
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Bengaluru, Karnataka",
    type: "Full-time",
    experience: "1-3 years",
    description: "Ensure customer satisfaction, drive adoption, and help clients achieve success with our solutions.",
    requirements: ["Customer relationship management", "Problem-solving", "Communication", "SaaS experience"],
    salary: "₹5-10 LPA"
  }
];

const BENEFITS = [
  {
    icon: "💰",
    title: "Competitive Salary",
    description: "Market-competitive compensation with performance bonuses and equity options."
  },
  {
    icon: "🏥",
    title: "Health Coverage",
    description: "Comprehensive health insurance for you and your family members."
  },
  {
    icon: "🏖️",
    title: "Flexible Time Off",
    description: "Generous vacation policy and flexible working hours to maintain work-life balance."
  },
  {
    icon: "📚",
    title: "Learning & Development",
    description: "Annual learning budget, conference attendance, and skill development programs."
  },
  {
    icon: "🏠",
    title: "Remote Work",
    description: "Hybrid and remote work options with modern office facilities in Bengaluru."
  },
  {
    icon: "🚀",
    title: "Career Growth",
    description: "Clear career progression paths with mentorship and leadership opportunities."
  }
];

const COMPANY_VALUES = [
  {
    title: "Innovation First",
    description: "We encourage creative thinking and bold ideas that push the boundaries of technology."
  },
  {
    title: "Collaborative Culture",
    description: "We believe in teamwork, open communication, and supporting each other's growth."
  },
  {
    title: "Customer Obsession",
    description: "Our customers' success drives everything we do, from product development to support."
  },
  {
    title: "Continuous Learning",
    description: "We invest in our team's growth and encourage continuous skill development."
  }
];

export default function Careers() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedPosition, setSelectedPosition] = useState(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const departments = ["All", ...new Set(OPEN_POSITIONS.map(pos => pos.department))];
  
  const filteredPositions = selectedDepartment === "All" 
    ? OPEN_POSITIONS 
    : OPEN_POSITIONS.filter(pos => pos.department === selectedDepartment);

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
              <Link href="/about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About</Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Contact</Link>
              <Link href="/careers" className="text-blue-600 font-medium">Careers</Link>
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
            Join Our Team
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Build the Future of
            <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Business Automation
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed max-w-4xl mx-auto mb-12">
            We're looking for passionate, talented individuals to join our mission of transforming how businesses operate. 
            If you're ready to make an impact, we'd love to hear from you.
          </p>

          <Link
            href="#openings"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-block"
          >
            View Open Positions
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Join EZBillify?</h2>
            <p className="text-xl text-gray-600">We offer more than just a job – we offer a career</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map(({ icon, title, description }) => (
              <div
                key={title}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl p-8 transition-all duration-700 hover:scale-105"
              >
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-xl text-gray-600">What drives us every day</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {COMPANY_VALUES.map(({ title, description }) => (
              <div
                key={title}
                className="bg-white rounded-2xl shadow-lg p-8"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Open Positions</h2>
            <p className="text-xl text-gray-600 mb-8">Find your perfect role</p>
            
            {/* Department Filter */}
            <div className="flex flex-wrap justify-center gap-3">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                    selectedDepartment === dept
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {filteredPositions.map((position) => (
              <div
                key={position.id}
                onClick={() => setSelectedPosition(selectedPosition === position.id ? null : position.id)}
                className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg hover:shadow-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-102"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{position.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {position.department}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {position.type}
                      </span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {position.experience}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{position.salary}</div>
                    <div className="text-sm text-gray-500">{position.location}</div>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">{position.description}</p>

                {selectedPosition === position.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-3">Key Requirements:</h4>
                    <ul className="space-y-2 mb-6">
                      {position.requirements.map((req, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">{req}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`mailto:careers@ezbillify.com?subject=Application for ${position.title}&body=Hi,%0D%0A%0D%0AI am interested in applying for the ${position.title} position.%0D%0A%0D%0APlease find my resume attached.%0D%0A%0D%0ABest regards`}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-center hover:shadow-lg transition-all duration-300"
                      >
                        Apply Now
                      </a>
                      <a
                        href={`https://wa.me/919876543210?text=Hi, I'm interested in the ${position.title} position at EZBillify. Could you please share more details?`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-2 border-green-500 text-green-600 px-6 py-3 rounded-lg font-semibold text-center hover:bg-green-50 transition-all duration-300"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-4 text-blue-600 font-medium">
                  {selectedPosition === position.id ? 'Click to collapse' : 'Click to learn more'}
                </div>
              </div>
            ))}
          </div>

          {filteredPositions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No positions found</h3>
              <p className="text-gray-600">Try selecting a different department or check back later for new openings.</p>
            </div>
          )}
        </div>
      </section>

      {/* Application Process */}
      <section className="py-20 px-6 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Hiring Process</h2>
            <p className="text-xl text-gray-600">Simple, transparent, and efficient</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Apply</h3>
              <p className="text-gray-600 text-sm">Submit your application and resume for the position you're interested in.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Screen</h3>
              <p className="text-gray-600 text-sm">Our team reviews your application and conducts an initial phone/video screening.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Interview</h3>
              <p className="text-gray-600 text-sm">Technical and cultural fit interviews with team members and leadership.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Offer</h3>
              <p className="text-gray-600 text-sm">Reference checks, offer discussion, and welcome to the EZBillify family!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Culture */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Life at EZBillify</h2>
            <p className="text-xl text-gray-600">More than just a workplace</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">🌱 Growth Mindset</h3>
                <p className="text-gray-600">We encourage experimentation, learning from failures, and continuous improvement in everything we do.</p>
              </div>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">🎯 Impact-Driven</h3>
                <p className="text-gray-600">Every team member's work directly contributes to our mission of transforming business operations.</p>
              </div>

              <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3">🤝 Collaborative</h3>
                <p className="text-gray-600">We work together across departments, share knowledge freely, and celebrate each other's successes.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl rotate-6 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="text-center">
                  <div className="text-6xl mb-6">🚀</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Launch Your Career?</h3>
                  <p className="text-gray-600 mb-6">
                    Join a team that values innovation, growth, and making a real difference in the business world.
                  </p>
                  <a
                    href="mailto:careers@ezbillify.com"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
                  >
                    Contact HR Team
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Don't See Your Role?</h2>
          <p className="text-xl mb-8 text-blue-100">
            We're always looking for talented individuals. Send us your resume and tell us how you can contribute to EZBillify's mission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:careers@ezbillify.com?subject=General Application - [Your Name]&body=Hi,%0D%0A%0D%0AI am interested in exploring opportunities at EZBillify Technologies.%0D%0A%0D%0APlease find my resume attached.%0D%0A%0D%0ABest regards"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              Send Your Resume
            </a>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}