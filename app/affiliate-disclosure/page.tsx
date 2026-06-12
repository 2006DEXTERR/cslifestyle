'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Link2, ChevronRight, Shield, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AffiliateDisclosurePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Affiliate Disclosure</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Affiliate Disclosure</h1>
          <p className="text-muted-foreground mt-2">
            Transparency about how we earn money
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-brand-pink/5 border border-brand-pink/20 mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gradient flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Our Commitment to Transparency</h2>
                <p className="text-sm text-muted-foreground">
                  At CSLifestyle, we believe you deserve to know how we operate. This disclosure explains how we earn money and assures you that our reviews and recommendations are never influenced by payment.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">What Are Affiliate Links?</h2>
              <p className="text-muted-foreground">
                Affiliate links are special URLs that track referrals from our website to online retailers. When you click an affiliate link on CSLifestyle and make a purchase within a certain timeframe, we may receive a small commission from the retailer at no additional cost to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Our Affiliate Partnerships</h2>
              <p className="text-muted-foreground mb-4">
                CSLifestyle participates in the following affiliate programs:
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Amazon Associates Program</h3>
                    <p className="text-sm text-muted-foreground">One of the world's largest affiliate programs</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Flipkart Affiliate Program</h3>
                    <p className="text-sm text-muted-foreground">India's leading e-commerce platform</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Other Affiliate Networks</h3>
                    <p className="text-sm text-muted-foreground">Including CJ, ShareASale, and direct partnerships</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">How We Maintain Editorial Independence</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-green-500/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>We never accept payment for reviews.</strong> All product reviews are based on our honest assessment and testing.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-green-500/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>Commission rates don't affect our recommendations.</strong> We recommend products based on merit, not earning potential.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-green-500/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>We review and update content regularly</strong> to ensure accuracy, even if it means changing previous recommendations.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl border bg-green-500/5">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>Our editorial team operates independently</strong> from our business partnerships.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">What This Means for You</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>No additional cost:</strong> You pay the same price whether you use our links or go directly to the retailer.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>Supporting our work:</strong> Your purchases through our links help us maintain and improve CSLifestyle.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-pink flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    <strong>Honest reviews:</strong> You can trust that our reviews are genuine, unbiased, and based on real experiences.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Identifying Affiliate Links</h2>
              <p className="text-muted-foreground">
                Most links on CSLifestyle that direct to product pages on external retailer websites are affiliate links. These links typically contain tracking parameters or redirect through affiliate networks. You can identify them by:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-4">
                <li>Links with "go.cslifestyle.in" in the URL</li>
                <li>Links to Amazon.in, Flipkart.com, or similar retailers</li>
                <li>Buttons labeled "Check Price on Amazon" or "Buy Now"</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-muted-foreground">
                If you have any questions about our affiliate partnerships or how we maintain editorial integrity, please contact us at <a href="mailto:disclosure@cslifestyle.in" className="text-brand-pink hover:underline">disclosure@cslifestyle.in</a>.
              </p>
            </section>

            <div className="border-t pt-6 text-sm text-muted-foreground">
              <p>
                Last updated: January 2024. This disclosure complies with the Federal Trade Commission's guidelines on endorsements and testimonials and India's Advertising Standards Council guidelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
