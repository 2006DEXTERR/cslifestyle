'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Twitter, Linkedin, Globe, ChevronRight, BookOpen, GitCompare, Heart } from 'lucide-react';
import { GuideCard } from '@/components/guides/GuideCard';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import type { ContentAuthor, ContentComparison } from '@/lib/api/content';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';

export function AuthorDetail({
  author,
  authorComparisons,
}: {
  author: ContentAuthor;
  authorComparisons: ContentComparison[];
}) {
  const [activeTab, setActiveTab] = React.useState<'guides' | 'comparisons' | 'activity'>('guides');

  const authorGuides = author.guides;
  // Deterministic placeholder until the analytics phase wires real view counts
  // (derived from a stable property so SSR and client render identically).
  const totalViews = author.articlesCount * 8400 + 100000;

  return (
    <div className="min-h-screen">
      <AnalyticsBeacon type="author_view" entityType="author" entityId={author.id} />
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span>{author.name}</span>
          </div>
        </div>
      </div>

      {/* Author Hero */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative">
              <img
                src={author.avatar}
                alt={author.name}
                className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{author.name}</h1>
              <p className="text-muted-foreground max-w-2xl mb-4">{author.bio}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {author.expertise.map((exp) => (
                  <span
                    key={exp}
                    className="px-3 py-1 rounded-full bg-muted text-sm"
                  >
                    {exp}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4">
                {author.social.twitter && (
                  <a
                    href={`https://twitter.com/${author.social.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {author.social.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${author.social.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {author.social.website && (
                  <a
                    href={author.social.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-3 gap-6 mt-6 p-4 rounded-xl bg-muted/50">
                <div className="text-center">
                  <div className="text-2xl font-bold brand-gradient-text">{author.articlesCount}</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold brand-gradient-text">{(totalViews / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-muted-foreground">Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold brand-gradient-text">{author.expertise.length}</div>
                  <div className="text-sm text-muted-foreground">Topics</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 mb-8 p-1 rounded-lg bg-muted overflow-x-auto">
            {[
              { id: 'guides', label: 'Buying Guides', icon: BookOpen },
              { id: 'comparisons', label: 'Comparisons', icon: GitCompare },
              { id: 'activity', label: 'Activity', icon: Heart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'guides' | 'comparisons' | 'activity')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'guides' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {authorGuides.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {authorGuides.map((guide) => (
                    <GuideCard key={guide.id} guide={guide} variant="feature" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No buying guides from this author yet.
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'comparisons' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authorComparisons.map((comparison) => (
                  <ComparisonCard key={comparison.id} comparison={comparison} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="space-y-4">
                {authorGuides.slice(0, 5).map((guide) => (
                  <div
                    key={guide.id}
                    className="flex items-center gap-4 p-4 rounded-xl border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={guide.coverImage}
                        alt={guide.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{guide.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Published {guide.lastUpdated}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {guide.readingTime} min read
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
