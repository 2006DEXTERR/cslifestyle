'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/products/ProductCard';
import type { CatalogProduct } from '@/lib/api/catalog';

/**
 * Premium "Featured Products" carousel shown directly below the hero search box.
 * Reuses the existing ProductCard (no card redesign) and Embla (already a dependency)
 * for native touch/drag/swipe + keyboard. Auto-advances every 3s, pauses on hover,
 * loops infinitely. Data is supplied by the homepage from already-fetched products
 * (featured → trending → latest), so this adds no network requests.
 */

const AUTOPLAY_MS = 3000;

export function FeaturedProductsCarousel({ products }: { products: CatalogProduct[] }) {
  // Repeat gracefully so the loop + multi-card viewport stay full even with few products.
  const slides = React.useMemo(() => {
    if (!products.length) return [];
    const out = [...products];
    while (out.length < 8) out.push(...products);
    return out;
  }, [products]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start', dragFree: false });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [snaps, setSnaps] = React.useState<number[]>([]);
  const hoverRef = React.useRef(false);

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = React.useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const onSelect = React.useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-advance every 3s; pause while hovered or the tab is hidden.
  React.useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => {
      if (!hoverRef.current && !document.hidden) emblaApi.scrollNext();
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [emblaApi]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); scrollNext(); }
  };

  if (!products.length) return null;

  return (
    <section
      aria-label="Featured products"
      className="w-full mb-8 text-left"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      {/* Glass / gradient container — matches the site's theme tokens, no new colors. */}
      <div className="relative rounded-2xl border bg-card/70 backdrop-blur-sm shadow-xl p-5 sm:p-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-pink/5 via-transparent to-transparent" />

        {/* Header */}
        <div className="relative flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
              <Sparkles className="h-5 w-5 brand-gradient-text" />
              Featured Products
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Trending picks curated by CSLifestyle</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={scrollPrev}
              aria-label="Previous products"
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              aria-label="Next products"
              className="flex h-9 w-9 items-center justify-center rounded-full border bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div
          className="relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
          ref={emblaRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured products carousel"
          tabIndex={0}
          onKeyDown={onKeyDown}
        >
          <div className="flex -ml-4">
            {slides.map((product, i) => (
              <div
                key={`${product.id}-${i}`}
                role="group"
                aria-roledescription="slide"
                className="min-w-0 pl-4 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] xl:flex-[0_0_20%]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        {snaps.length > 1 && (
          <div className="relative mt-5 flex items-center justify-center gap-2">
            {snaps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === selectedIndex}
                className={cn(
                  'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === selectedIndex ? 'w-6 bg-brand-gradient' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
