'use client';

import * as React from 'react';
import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  ChevronRight,
  Clock as ClockIcon,
  BookOpen,
  Share2,
  Heart,
  ExternalLink,
  Award,
  Star,
  List,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { GuideCard } from '@/components/guides/GuideCard';
import { buyingGuides, products } from '@/lib/data';

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const guide = buyingGuides.find((g) => g.slug === slug);
  const [activeSection, setActiveSection] = React.useState(0);
  const [isTocOpen, setIsTocOpen] = React.useState(false);

  if (!guide) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
        <p className="text-muted-foreground">The guide you're looking for doesn't exist.</p>
      </div>
    );
  }

  const relatedGuides = buyingGuides.filter((g) => g.categorySlug === guide.categorySlug && g.id !== guide.id).slice(0, 3);

  const articleContent = `
    <p>Finding the perfect product can be overwhelming with so many options in the market. In this comprehensive guide, we'll help you navigate through the choices and find the best option for your needs and budget.</p>

    <h2>What to Look For</h2>
    <p>When choosing a product in this category, there are several key factors to consider:</p>

    <h3>Performance</h3>
    <p>Performance is often the most important factor. Look for products that offer reliable and consistent performance for your specific use case. Consider benchmark scores and real-world testing results.</p>

    <h3>Build Quality</h3>
    <p>A well-built product will last longer and provide better value over time. Check materials used, warranty terms, and customer reviews about durability.</p>

    <h3>Value for Money</h3>
    <p>Sometimes a more expensive product isn't necessarily better. Consider the features that matter to you and find the best balance between price and performance.</p>

    <h2>Our Top Picks</h2>
    <p>After extensive testing and research, here are our top recommendations:</p>

    <h3><span class="brand-text">Best Overall</span></h3>
    <p>The ${guide.productRecommendations.find(r => r.isTopPick)?.product.name || guide.productRecommendations[0]?.product.name || 'Product'} stands out as our top pick due to its excellent combination of performance, features, and value.</p>

    <h2>Things to Avoid</h2>
    <p>Be cautious of products that:</p>
    <ul>
      <li>Have poor customer support</li>
      <li>Lack warranty coverage</li>
      <li>Have known reliability issues</li>
    </ul>

    <h2>Final Thoughts</h2>
    <p>Choosing the right product requires careful consideration of your specific needs. We hope this guide has helped you make an informed decision. Feel free to reach out if you have any questions!</p>
  `;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
          <img
            src={guide.coverImage}
            alt={guide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8">
          <div className="container mx-auto">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 text-sm text-white/80 mb-3">
                <a href="/" className="hover:text-white">Home</a>
                <ChevronRight className="w-4 h-4" />
                <a href="/guides" className="hover:text-white">Guides</a>
                <ChevronRight className="w-4 h-4" />
                <a href={`/categories/${guide.categorySlug}`} className="hover:text-white">{guide.category}</a>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-white text-sm font-medium">
                  {guide.category}
                </span>
                <span className="text-white/80 text-sm">{guide.readingTime} min read</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                {guide.title}
              </h1>

              <div className="flex items-center gap-4">
                <Link href={`/authors/${guide.author.slug}`} className="flex items-center gap-3 group">
                  <img
                    src={guide.author.avatar}
                    alt={guide.author.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="text-white">
                    <p className="font-medium group-hover:underline">{guide.author.name}</p>
                    <p className="text-sm text-white/70">Last updated {guide.lastUpdated}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Table of Contents */}
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <List className="w-4 h-4" />
                  Table of Contents
                </h3>
                <nav className="space-y-1">
                  {guide.tableOfContents.map((item, index) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === index
                          ? 'bg-muted font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                      onClick={() => setActiveSection(index)}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Author Card */}
              <div className="p-4 rounded-xl border bg-card">
                <h3 className="font-semibold mb-4">About the Author</h3>
                <div className="flex items-center gap-3">
                  <img
                    src={guide.author.avatar}
                    alt={guide.author.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{guide.author.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {guide.author.articlesCount} articles
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">{guide.author.bio}</p>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View Profile
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            {/* Share & Save */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <Button variant="outline" size="sm">
                <ClockIcon className="w-4 h-4 mr-2" />
                {guide.readingTime} min read
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Heart className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile TOC */}
            <div className="lg:hidden mb-8 p-4 rounded-xl border bg-card">
              <h3 className="font-semibold mb-3">Table of Contents</h3>
              <nav className="flex flex-wrap gap-2">
                {guide.tableOfContents.map((item, index) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80"
                    onClick={() => setActiveSection(index)}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>

            {/* Article Content */}
            <article className="prose prose-neutral dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: articleContent }}
                className="text-muted-foreground leading-relaxed"
                style={{
                  '--tw-prose-headings-color': 'var(--foreground)',
                  '--tw-prose-links-color': '#E91E8F',
                } as React.CSSProperties}
              />
            </article>

            {/* Product Recommendations */}
            <section className="mt-12 pt-12 border-t">
              <h2 className="text-2xl font-bold mb-6">Our Recommendations</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {guide.productRecommendations.map((rec, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      {rec.isTopPick && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-gradient text-white text-xs font-medium">
                          <Award className="w-3 h-3" />
                          Top Pick
                        </span>
                      )}
                    </div>
                    <ProductCard product={rec.product} variant="compact" />
                    <p className="text-sm text-muted-foreground mt-3">{rec.reason}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Callout */}
            <div className="mt-8 p-6 rounded-xl bg-muted/50 border">
              <div className="flex items-start gap-4">
                <Lightbulb className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">Pro Tip</h3>
                  <p className="text-sm text-muted-foreground">
                    Always check the latest prices before making a purchase. Our links redirect to the official product page where you can check current pricing and availability.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Related Guides */}
      {relatedGuides.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Related Guides</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedGuides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
