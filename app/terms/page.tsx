'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { FileText, ChevronRight, Scale, Shield, AlertTriangle, Gavel, RefreshCw } from 'lucide-react';

const sections = [
  { id: 'acceptance', title: 'Acceptance of Terms' },
  { id: 'use', title: 'Use of Our Services' },
  { id: 'content', title: 'Content & Intellectual Property' },
  { id: 'affiliate', title: 'Affiliate Disclosure' },
  { id: 'prohibited', title: 'Prohibited Activities' },
  { id: 'disclaimer', title: 'Disclaimers' },
  { id: 'limitation', title: 'Limitation of Liability' },
  { id: 'changes', title: 'Changes to Terms' },
  { id: 'contact', title: 'Contact Information' },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Terms of Service</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Terms of Service</h1>
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
                    className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
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
                Welcome to CSLifestyle. These Terms of Service ("Terms") govern your access to and use of our website www.cslifestyle.in ("Site") and any related services offered by CSLifestyle ("Services"). Please read these Terms carefully before using our Services.
              </p>
            </motion.div>

            <section id="acceptance" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using our Site or Services, you agree to be bound by these Terms. If you do not agree to these Terms, you must not access or use our Services. These Terms constitute a legally binding agreement between you and CSLifestyle.
              </p>
              <p className="text-muted-foreground mt-4">
                You must be at least 18 years of age, or the age of majority in your jurisdiction, to use our Services. By using our Services, you represent that you meet this requirement.
              </p>
            </section>

            <section id="use" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">2. Use of Our Services</h2>
              <p className="text-muted-foreground">
                You agree to use our Services only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Use our Services in any way that violates applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to any part of our Services</li>
                <li>Interfere with or disrupt the integrity or performance of our Services</li>
                <li>Collect or harvest any information from our Services without authorization</li>
                <li>Use our Services for any commercial purpose without our prior written consent</li>
              </ul>
            </section>

            <section id="content" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">3. Content & Intellectual Property</h2>
              <p className="text-muted-foreground">
                All content on CSLifestyle, including text, graphics, logos, images, and software, is the property of CSLifestyle or its content suppliers and is protected by Indian and international copyright laws. You may not:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Reproduce, distribute, or publicly display any content without prior written permission</li>
                <li>Modify or create derivative works based on our content</li>
                <li>Use our content for commercial purposes without authorization</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                User-generated content (comments, reviews) remains your property, but by submitting content, you grant CSLifestyle a non-exclusive, royalty-free license to use, modify, and display that content on our Site.
              </p>
            </section>

            <section id="affiliate" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">4. Affiliate Disclosure</h2>
              <div className="p-4 rounded-xl bg-brand-pink/5 border border-brand-pink/20 mb-4">
                <p className="text-sm font-medium">
                  CSLifestyle participates in affiliate marketing programs, including but not limited to Amazon Associates, Flipkart Affiliate, and other similar programs.
                </p>
              </div>
              <p className="text-muted-foreground">
                This means that when you click on certain links on our Site and make a purchase, we may receive a commission. This does not affect the price you pay for any products. Our reviews and recommendations are not influenced by affiliate partnerships. We only recommend products that we believe provide value to our readers.
              </p>
              <p className="text-muted-foreground mt-4">
                For more details, please see our Affiliate Disclosure page.
              </p>
            </section>

            <section id="prohibited" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">5. Prohibited Activities</h2>
              <p className="text-muted-foreground">You are prohibited from:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Submitting false, misleading, or spam content</li>
                <li>Impersonating any person or entity</li>
                <li>Using automated systems or bots to access our Services</li>
                <li>Attempting to bypass any security measures</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Violating any applicable local, state, national, or international law</li>
              </ul>
            </section>

            <section id="disclaimer" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">6. Disclaimers</h2>
              <p className="text-muted-foreground">
                Our Site is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the accuracy, reliability, or completeness of any content. Product information, prices, and availability are subject to change without notice.
              </p>
              <p className="text-muted-foreground mt-4">
                We do not guarantee that our Site will be uninterrupted, secure, or error-free. We are not responsible for any errors or omissions in the content.
              </p>
            </section>

            <section id="limitation" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">7. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the fullest extent permitted by law, CSLifestyle shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our Services.
              </p>
              <p className="text-muted-foreground mt-4">
                We are not responsible for any loss of data, profits, or other intangible losses resulting from your use of our Services or any content therein.
              </p>
            </section>

            <section id="changes" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting on our Site. Your continued use of our Services after changes are posted constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.
              </p>
            </section>

            <section id="contact" className="mb-10">
              <h2 className="text-2xl font-bold mb-4">9. Contact Information</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms, please contact us:
              </p>
              <div className="bg-muted/50 rounded-xl p-4 mt-4">
                <p><strong>Email:</strong> legal@cslifestyle.in</p>
                <p><strong>Address:</strong> CSLifestyle, Bangalore, Karnataka, India</p>
              </div>
            </section>

            <div className="border-t pt-6 text-sm text-muted-foreground">
              <p>
                These Terms are governed by the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
