'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronRight, Mail, Lock, Eye, Database, Users, Bell, FileText } from 'lucide-react';

const sections = [
  { id: 'collection', title: 'Information We Collect', icon: Database },
  { id: 'usage', title: 'How We Use Your Information', icon: Eye },
  { id: 'sharing', title: 'Information Sharing', icon: Users },
  { id: 'security', title: 'Data Security', icon: Lock },
  { id: 'cookies', title: 'Cookies & Tracking', icon: FileText },
  { id: 'rights', title: 'Your Rights', icon: Shield },
  { id: 'contact', title: 'Contact Us', icon: Mail },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Privacy Policy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: January 2024
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Table of Contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 p-4 rounded-xl border bg-card">
              <h3 className="font-semibold mb-4">Contents</h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <section.icon className="w-4 h-4" />
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="prose prose-neutral dark:prose-invert max-w-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
              <p className="text-muted-foreground leading-relaxed">
                At CSLifestyle ("we," "us," or "our"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website www.cslifestyle.in ("Site") or use our services.
              </p>
            </motion.div>

            <section id="collection" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-brand-pink" />
                Information We Collect
              </h2>
              <h3 className="text-lg font-semibold mt-4 mb-2">Personal Information</h3>
              <p className="text-muted-foreground">
                When you subscribe to our newsletter, contact us, or create an account, we may collect:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Name and email address</li>
                <li>Contact information</li>
                <li>Account credentials (username, password)</li>
                <li>Communications with our team</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">Automatically Collected Information</h3>
              <p className="text-muted-foreground">
                When you visit our Site, we automatically collect:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and location data</li>
                <li>Pages visited and time spent</li>
                <li>Referring website addresses</li>
                <li>Interaction data (clicks, searches)</li>
              </ul>
            </section>

            <section id="usage" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-brand-pink" />
                How We Use Your Information
              </h2>
              <p className="text-muted-foreground">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Send newsletters and promotional communications</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect and prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section id="sharing" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-brand-pink" />
                Information Sharing
              </h2>
              <p className="text-muted-foreground">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>With service providers who process data on our behalf (email services, analytics)</li>
                <li>With affiliate partners through affiliate links (you will be redirected to their sites)</li>
                <li>To comply with legal requests or respond to lawful demands</li>
                <li>To protect our rights, privacy, safety, or property</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                <strong>We do not sell your personal information to third parties.</strong>
              </p>
            </section>

            <section id="security" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-brand-pink" />
                Data Security
              </h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section id="cookies" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-brand-pink" />
                Cookies & Tracking Technologies
              </h2>
              <p className="text-muted-foreground">
                We use cookies and similar tracking technologies to collect and track information and to improve our Site. These include:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li><strong>Essential cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics cookies:</strong> Help us understand how visitors interact with our site</li>
                <li><strong>Marketing cookies:</strong> Used to deliver relevant advertisements</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                You can control cookies through your browser settings. Disabling certain cookies may affect website functionality.
              </p>
            </section>

            <section id="rights" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-brand-pink" />
                Your Rights
              </h2>
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your personal information</li>
                <li>Object to processing of your data</li>
                <li>Withdraw consent at any time</li>
                <li>Lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                To exercise these rights, please contact us at privacy@cslifestyle.in.
              </p>
            </section>

            <section id="contact" className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-brand-pink" />
                Contact Us
              </h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-muted/50 rounded-xl p-4 mt-4">
                <p><strong>Email:</strong> privacy@cslifestyle.in</p>
                <p><strong>Address:</strong> CSLifestyle, Bangalore, Karnataka, India</p>
              </div>
            </section>

            <div className="border-t pt-6 text-sm text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
