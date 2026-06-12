'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Users, Award, Star, ChevronRight, Target, Heart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '10M+', label: 'Monthly Users' },
  { value: '500K+', label: 'Products Reviewed' },
  { value: '2,000+', label: 'Buying Guides' },
  { value: '50+', label: 'Expert Authors' },
];

const values = [
  {
    icon: Shield,
    title: 'Unbiased Reviews',
    description: 'We never accept payment for positive coverage. Our reviews are 100% independent and honest.',
  },
  {
    icon: Target,
    title: 'Consumer First',
    description: 'Every recommendation is made with the consumer\'s best interest in mind, not brand partnerships.',
  },
  {
    icon: Heart,
    title: 'Passion for Tech',
    description: 'Our team genuinely loves technology and testing products. We put that passion into every review.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'We listen to our readers and continuously improve based on feedback from millions of users.',
  },
];

const team = [
  {
    name: 'Priya Sharma',
    role: 'Editor in Chief',
    expertise: 'Smartphones, Wearables',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    name: 'Rahul Verma',
    role: 'Senior Editor',
    expertise: 'Audio, Home Electronics',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    name: 'Vikram Singh',
    role: 'Tech Editor',
    expertise: 'Laptops, Computers',
    image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
  {
    name: 'Anjali Patel',
    role: 'Reviews Editor',
    expertise: 'Cameras, Photography',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-muted/50 to-muted/30 border-b">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
              <a href="/" className="hover:text-foreground">Home</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground">About Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="brand-gradient-text">CSLifestyle</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              India's most trusted product discovery and review platform. Since 2018, we've helped millions of consumers make informed purchasing decisions through comprehensive reviews, buying guides, and honest recommendations.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold brand-gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Before CSLifestyle, Indian consumers had limited access to unbiased, comprehensive product information. We created this platform to bridge that gap and empower consumers with the knowledge they need to make smart purchasing decisions.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We believe everyone deserves access to honest, detailed product information without having to navigate through sponsored content or biased reviews. Our commitment to transparency and integrity has made us India's go-to destination for product research.
              </p>
              <div className="p-4 rounded-xl bg-muted/50 border">
                <p className="text-sm font-medium italic">
                  "Our goal is simple: help every Indian consumer find the perfect product for their needs and budget, with zero bias or hidden agendas."
                </p>
                <p className="text-sm text-muted-foreground mt-2">— Priya Sharma, Founder & Editor in Chief</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-brand-pink/20 to-brand-orange/20 flex items-center justify-center">
                <Sparkles className="w-32 h-32 text-brand-pink/50" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at CSLifestyle
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl border bg-card"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gradient mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The passionate experts behind CSLifestyle's reviews and guides
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/authors/${member.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all">
                    <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold group-hover:text-brand-pink transition-colors">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                      <p className="text-xs text-muted-foreground mt-1">{member.expertise}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Policy */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Editorial Integrity</h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                At CSLifestyle, editorial integrity is the foundation of everything we do. Our editorial team operates independently from any business or commercial interests. Here's how we maintain our integrity:
              </p>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <span>We never accept payment to write or modify a review, nor do we accept gifts from manufacturers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <span>Our reviews are based on hands-on testing, real-world usage, and thorough research.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <span>All affiliate partnerships are disclosed clearly to maintain transparency with our readers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <span>We update our content regularly to reflect new products, prices, and market changes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
