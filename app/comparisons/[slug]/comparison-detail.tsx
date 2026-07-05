'use client';

import * as React from 'react';
import { Trophy, ChevronRight, Check, X, ExternalLink, Star, ThumbsUp, ThumbsDown, Share2, GitCompare, CalendarClock, Award, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { ComparisonTable } from '@/components/comparisons/ComparisonTable';
import { ProductCard } from '@/components/products/ProductCard';
import { productImageClass } from '@/lib/image';
import type { ContentComparison } from '@/lib/api/content';
import { formatNumber, formatDate } from '@/lib/format';
import { AnalyticsBeacon } from '@/components/analytics/AnalyticsBeacon';

const shortName = (name: string) => name.split(' ').slice(0, 3).join(' ');

export function ComparisonDetail({
  comparison,
  relatedComparisons,
}: {
  comparison: ContentComparison;
  relatedComparisons: ContentComparison[];
}) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const { insights } = comparison;
  const category = comparison.productA.category || comparison.productB.category;
  const [shared, setShared] = React.useState(false);

  // Sticky CTA bar — opt-in per comparison (`stickyCta`). Appears after the hero scrolls
  // out of view and can be dismissed. Reuses the existing brand-gradient button styling.
  const [ctaVisible, setCtaVisible] = React.useState(false);
  const [ctaDismissed, setCtaDismissed] = React.useState(false);
  React.useEffect(() => {
    if (!comparison.stickyCta) return;
    const onScroll = () => setCtaVisible(window.scrollY > 640);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [comparison.stickyCta]);
  const showStickyCta = comparison.stickyCta && ctaVisible && !ctaDismissed;
  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: comparison.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2000); }
    } catch { /* user dismissed */ }
  };

  // Smart insight chips — derived from real fields only (null values are simply omitted).
  const winnerLabel = comparison.winner === 'A' ? shortName(comparison.productA.name)
    : comparison.winner === 'B' ? shortName(comparison.productB.name) : null;
  const sideName = (s: 'A' | 'B') => shortName(s === 'A' ? comparison.productA.name : comparison.productB.name);

  return (
    <div className={`min-h-screen ${showStickyCta ? 'pb-24 md:pb-20' : ''}`}>
      <AnalyticsBeacon type="comparison_view" entityType="comparison" entityId={comparison.id} />
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/comparisons" className="hover:text-foreground">Comparisons</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{comparison.productA.name} vs {comparison.productB.name}</span>
          </div>
        </div>
      </div>

      {/* Hero Comparison */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-4">
            {comparison.title}
          </h1>

          {/* Hero meta row — category, last updated, share, compare another */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8 text-sm">
            {category && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground">
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                {category}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
              Updated {formatDate(comparison.updatedAt)}
            </span>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Share this comparison"
            >
              <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
              {shared ? 'Link copied' : 'Share'}
            </button>
            <a
              href="/comparisons"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border hover:bg-muted transition-colors"
            >
              <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
              Compare another
            </a>
          </div>

          {/* Product Cards */}
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-0 items-start">
            {/* Product A */}
            <div className={`relative rounded-2xl border bg-card overflow-hidden ${comparison.winner === 'A' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}>
              {comparison.winner === 'A' && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  Winner
                </div>
              )}
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={comparison.productA.image}
                  alt={comparison.productA.name}
                  className={productImageClass}
                />
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-1">{comparison.productA.brand}</p>
                <h2 className="text-xl font-bold mb-3">{comparison.productA.name}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{comparison.productA.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({formatNumber(comparison.productA.reviewCount)} reviews)
                  </span>
                </div>
                {typeof comparison.comparisonScoreA === 'number' && (
                  <p className="text-sm mb-4">
                    <span className="font-semibold text-green-600">{comparison.comparisonScoreA}</span>
                    <span className="text-muted-foreground">/100 CSLifestyle score</span>
                  </p>
                )}
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(comparison.productA.currentPrice)}
                </p>
                <a href={`/go/${comparison.productA.asin}?src=comparison`} target="_blank" rel="noopener noreferrer nofollow sponsored">
                  <Button className="w-full bg-brand-gradient hover:opacity-90">
                    Check Price on Amazon
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>

            {/* VS Divider */}
            <div className="hidden md:flex items-center justify-center w-16">
              <div className="flex flex-col items-center">
                <div className="w-px h-20 bg-border" />
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                  VS
                </div>
                <div className="w-px h-20 bg-border" />
              </div>
            </div>

            {/* VS Divider (Mobile) */}
            <div className="md:hidden flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-px bg-border" />
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                  VS
                </div>
                <div className="w-16 h-px bg-border" />
              </div>
            </div>

            {/* Product B */}
            <div className={`relative rounded-2xl border bg-card overflow-hidden ${comparison.winner === 'B' ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}>
              {comparison.winner === 'B' && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-semibold">
                  <Trophy className="w-3.5 h-3.5" />
                  Winner
                </div>
              )}
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={comparison.productB.image}
                  alt={comparison.productB.name}
                  className={productImageClass}
                />
              </div>
              <div className="p-6">
                <p className="text-sm text-muted-foreground mb-1">{comparison.productB.brand}</p>
                <h2 className="text-xl font-bold mb-3">{comparison.productB.name}</h2>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{comparison.productB.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({formatNumber(comparison.productB.reviewCount)} reviews)
                  </span>
                </div>
                {typeof comparison.comparisonScoreB === 'number' && (
                  <p className="text-sm mb-4">
                    <span className="font-semibold text-green-600">{comparison.comparisonScoreB}</span>
                    <span className="text-muted-foreground">/100 CSLifestyle score</span>
                  </p>
                )}
                <p className="text-2xl font-bold mb-4">
                  {formatPrice(comparison.productB.currentPrice)}
                </p>
                <a href={`/go/${comparison.productB.asin}?src=comparison`} target="_blank" rel="noopener noreferrer nofollow sponsored">
                  <Button className="w-full bg-brand-gradient hover:opacity-90">
                    Check Price on Amazon
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Summary Card — prefers the richer editorial summary when present */}
          {(comparison.editorSummary || comparison.summary) && (
            <div className="mt-8 p-6 rounded-xl bg-muted/50 border text-center">
              <p className="text-lg text-muted-foreground">{comparison.editorSummary || comparison.summary}</p>
            </div>
          )}
        </div>
      </section>

      {/* Smart insights — derived only from real DB fields */}
      {(winnerLabel || comparison.bestFor || insights.bestPrice || insights.higherRated || insights.specWins.a + insights.specWins.b > 0) && (
        <section className="py-6 border-t">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-3">
              {winnerLabel && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-sm font-medium">
                  <Trophy className="w-4 h-4" aria-hidden="true" />
                  Best Overall: {winnerLabel}
                </span>
              )}
              {comparison.bestFor && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                  <Award className="w-4 h-4" aria-hidden="true" />
                  Best for: {comparison.bestFor}
                </span>
              )}
              {insights.bestPrice && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 text-sm font-medium">
                  <IndianRupee className="w-4 h-4" aria-hidden="true" />
                  Best Price: {sideName(insights.bestPrice)}
                </span>
              )}
              {insights.higherRated && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-600 text-sm font-medium">
                  <Star className="w-4 h-4" aria-hidden="true" />
                  Higher Rated: {sideName(insights.higherRated)}
                </span>
              )}
              {insights.specWins.a + insights.specWins.b > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  Spec wins: {sideName('A')} {insights.specWins.a} · {sideName('B')} {insights.specWins.b}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Comparison Table */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Detailed Comparison</h2>
          <ComparisonTable
            rows={comparison.categories}
            labelA={shortName(comparison.productA.name)}
            labelB={shortName(comparison.productB.name)}
            brandA={comparison.productA.brand}
            brandB={comparison.productB.brand}
          />
        </div>
      </section>

      {/* Pros & Cons Comparison */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Pros & Cons</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Product A */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{comparison.productA.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productA.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productA.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Product B */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{comparison.productB.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Pros
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productB.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4" />
                    Cons
                  </h4>
                  <ul className="space-y-2">
                    {comparison.prosCons.productB.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Final Verdict</h2>
            <p className="text-lg text-muted-foreground mb-8">{comparison.verdict}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={comparison.productA.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
                  {comparison.productA.name.split(' ').slice(0, 2).join(' ')} on Amazon
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
              <a href={comparison.productB.affiliateUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-brand-gradient hover:opacity-90">
                  {comparison.productB.name.split(' ').slice(0, 2).join(' ')} on Amazon
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Who should buy — rendered only when editorially populated (never invented) */}
      {(comparison.whoShouldBuyA || comparison.whoShouldBuyB) && (
        <section className="py-8 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Who should buy which?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {comparison.whoShouldBuyA && (
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-2">{comparison.productA.name}</h3>
                  <p className="text-muted-foreground">{comparison.whoShouldBuyA}</p>
                </div>
              )}
              {comparison.whoShouldBuyB && (
                <div className="p-6 rounded-xl border bg-card">
                  <h3 className="text-lg font-semibold mb-2">{comparison.productB.name}</h3>
                  <p className="text-muted-foreground">{comparison.whoShouldBuyB}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FAQ — only when the comparison has editorial FAQ entries */}
      {comparison.faq.length > 0 && (
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {comparison.faq.map((item, i) => (
                <details key={i} className="group rounded-xl border bg-card p-4">
                  <summary className="cursor-pointer font-medium list-none flex items-center justify-between gap-2">
                    {item.question}
                    <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommended Alternatives — resolved, published products only (never fabricated) */}
      {comparison.bestAlternatives.length > 0 && (
        <section className="py-8 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-2">Recommended Alternatives</h2>
            <p className="text-muted-foreground mb-6">Other options worth considering before you decide.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {comparison.bestAlternatives.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Comparisons */}
      {relatedComparisons.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">More Comparisons</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedComparisons.map((c) => (
                <ComparisonCard key={c.id} comparison={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky CTA bar — opt-in, dismissible; both affiliate CTAs always reachable */}
      {showStickyCta && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <p className="hidden sm:block flex-1 text-sm font-medium truncate">
              {shortName(comparison.productA.name)} vs {shortName(comparison.productB.name)}
            </p>
            <div className="flex flex-1 sm:flex-initial items-center gap-2">
              <a
                href={`/go/${comparison.productA.asin}?src=comparison_sticky`}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="flex-1 sm:flex-initial"
              >
                <Button size="sm" className="w-full bg-brand-gradient hover:opacity-90">
                  {shortName(comparison.productA.name)}
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
              <a
                href={`/go/${comparison.productB.asin}?src=comparison_sticky`}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="flex-1 sm:flex-initial"
              >
                <Button size="sm" className="w-full bg-brand-gradient hover:opacity-90">
                  {shortName(comparison.productB.name)}
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </a>
            </div>
            <button
              type="button"
              onClick={() => setCtaDismissed(true)}
              aria-label="Dismiss"
              className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
