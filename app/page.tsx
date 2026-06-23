'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Search,
  TrendingUp,
  Award,
  Clock,
  Percent,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  GitCompare,
  Building2,
  Shield,
  Users,
  Star,
  Mail,
  RefreshCw,
  CheckCircle,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/products/ProductCard';
import { CategoryCard } from '@/components/categories/CategoryCard';
import { GuideCard } from '@/components/guides/GuideCard';
import { ComparisonCard } from '@/components/comparisons/ComparisonCard';
import { catalogApi, type CatalogProduct, type CatalogCategory, type CatalogBrand } from '@/lib/api/catalog';
import { contentApi, type ContentGuide, type ContentComparison } from '@/lib/api/content';
import { subscribeNewsletter } from '@/lib/api/marketing';
import { formatNumber } from '@/lib/format';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function Home() {
  // Live data (Phase 13) — same shapes/sections as before, sourced from the API.
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [trendingProducts, setTrendingProducts] = React.useState<CatalogProduct[]>([]);
  const [editorsPicks, setEditorsPicks] = React.useState<CatalogProduct[]>([]);
  const [deals, setDeals] = React.useState<CatalogProduct[]>([]);
  const [buyingGuides, setBuyingGuides] = React.useState<ContentGuide[]>([]);
  const [comparisons, setComparisons] = React.useState<ContentComparison[]>([]);
  const [brands, setBrands] = React.useState<CatalogBrand[]>([]);

  // Hero search → navigate to the results page (which reads ?q=).
  const router = useRouter();
  const [heroSearch, setHeroSearch] = React.useState('');
  const submitHeroSearch = () => {
    const q = heroSearch.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  React.useEffect(() => {
    let active = true;
    (async () => {
      const [cats, prods, trending, picks, dealList, guides, comps, brandList] = await Promise.all([
        catalogApi.listCategories().catch(() => [] as CatalogCategory[]),
        catalogApi.listProducts({ perPage: 8, sort: 'newest' }).then((r) => r.items).catch(() => [] as CatalogProduct[]),
        catalogApi.listProducts({ trending: true, perPage: 4 }).then((r) => r.items).catch(() => [] as CatalogProduct[]),
        catalogApi.listProducts({ editorsPick: true, perPage: 3 }).then((r) => r.items).catch(() => [] as CatalogProduct[]),
        catalogApi.listProducts({ deals: true, perPage: 4 }).then((r) => r.items).catch(() => [] as CatalogProduct[]),
        contentApi.listGuides({ perPage: 3 }).then((r) => r.items).catch(() => [] as ContentGuide[]),
        contentApi.listComparisons({ perPage: 3 }).then((r) => r.items).catch(() => [] as ContentComparison[]),
        catalogApi.listBrands().catch(() => [] as CatalogBrand[]),
      ]);
      if (!active) return;
      setCategories(cats);
      setProducts(prods);
      setTrendingProducts(trending.length ? trending : prods);
      setEditorsPicks(picks.length ? picks : prods);
      setDeals(dealList.length ? dealList : prods);
      setBuyingGuides(guides);
      setComparisons(comps);
      setBrands(brandList);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Newsletter signup (client-side; posts to the live /api/newsletter/subscribe).
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [newsletterState, setNewsletterState] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = React.useState('');

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // keep the SPA — no full page reload
    const email = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterState('error');
      setNewsletterMessage('Please enter a valid email address.');
      return;
    }
    setNewsletterState('submitting');
    setNewsletterMessage('');
    try {
      const status = await subscribeNewsletter(email, 'homepage');
      setNewsletterState('success');
      setNewsletterMessage(
        status === 'already_subscribed'
          ? "You're already subscribed — thanks!"
          : status === 'active'
            ? "You're subscribed! Check your inbox for the best deals."
            : 'Almost there — check your inbox to confirm your subscription.',
      );
      setNewsletterEmail('');
    } catch {
      setNewsletterState('error');
      setNewsletterMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-pink/5 via-transparent to-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(233, 30, 143, 0.03), transparent)' }} />
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted mb-6"
            >
              <Sparkles className="w-4 h-4" style={{ color: '#E91E8F' }} />
              <span className="text-sm font-medium">Trusted by 10 million+ users</span>
            </motion.div>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Find The Best Products{' '}
              <span className="brand-gradient-text">Before You Buy</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
              Expert reviews, detailed comparisons, and comprehensive buying guides for smartphones, laptops, earbuds, and more.
            </p>

            {/* Search Bar */}
            <div className="w-full max-w-2xl mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products, brands, guides..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitHeroSearch(); }}
                  className="pl-12 pr-4 h-14 text-lg rounded-xl"
                />
                <Button
                  onClick={submitHeroSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-gradient hover:opacity-90"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Category Shortcuts */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="px-4 py-2 rounded-full bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Trending Products</h2>
                <p className="text-sm text-muted-foreground">
                  Most viewed products this week
                </p>
              </div>
            </div>
            <Link
              href="/trending"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {trendingProducts.slice(0, 4).map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Browse by Category
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore our comprehensive guides and reviews organized by product categories
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
            {categories.slice(0, 10).map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <CategoryCard category={category} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Buying Guides */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: 'rgba(233, 30, 143, 0.1)' }}>
                <BookOpen className="w-5 h-5" style={{ color: '#E91E8F' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Popular Buying Guides</h2>
                <p className="text-sm text-muted-foreground">
                  Expert advice to help you choose
                </p>
              </div>
            </div>
            <Link
              href="/guides"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              All Guides <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buyingGuides.slice(0, 3).map((guide, index) => (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GuideCard guide={guide} variant="feature" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Comparisons */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(233, 30, 143, 0.1), rgba(255, 122, 0, 0.1))' }}>
                <GitCompare className="w-5 h-5" style={{ color: '#FF7A00' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Popular Comparisons</h2>
                <p className="text-sm text-muted-foreground">
                  Side-by-side product showdowns
                </p>
              </div>
            </div>
            <Link
              href="/comparisons"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              All Comparisons <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {comparisons.map((comparison, index) => (
              <motion.div
                key={comparison.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ComparisonCard comparison={comparison} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Best Deals */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10">
                <Clock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Best Deals</h2>
                <p className="text-sm text-muted-foreground">
                  Limited time offers on top products
                </p>
              </div>
            </div>
            <Link
              href="/deals"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              All Deals <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {deals.slice(0, 4).map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <ProductCard product={product} showDeal />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editor's Picks */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gradient text-white text-sm font-medium mb-4">
              <Award className="w-4 h-4" />
              Premium Selection
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Editor's Picks
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our expert editors' top recommendations across categories
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {editorsPicks.slice(0, 3).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ProductCard product={product} variant="feature" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Brands */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Top Brands</h2>
                <p className="text-sm text-muted-foreground">
                  Explore products from trusted brands
                </p>
              </div>
            </div>
            <Link
              href="/brands"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              All Brands <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {brands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/brands/${brand.slug}`}>
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                      <span className="text-lg font-bold">{brand.name[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-center">{brand.name}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold brand-gradient-text">10M+</div>
              <p className="text-sm text-muted-foreground mt-1">Monthly Users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold brand-gradient-text">500K+</div>
              <p className="text-sm text-muted-foreground mt-1">Products Reviewed</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold brand-gradient-text">2,000+</div>
              <p className="text-sm text-muted-foreground mt-1">Buying Guides</p>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold brand-gradient-text">50+</div>
              <p className="text-sm text-muted-foreground mt-1">Expert Authors</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Trust Us */}
      <section className="py-12 lg:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Trust CSLifestyle?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We provide unbiased, comprehensive reviews to help you make informed decisions
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Unbiased Reviews',
                description: 'Our reviews are independent. We never accept payment for positive coverage.',
              },
              {
                icon: Users,
                title: 'Expert Team',
                description: 'Our team has 50+ years combined experience in consumer technology.',
              },
              {
                icon: Star,
                title: 'Community Driven',
                description: 'Millions of users trust our recommendations for their purchases.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-6 rounded-2xl border bg-card"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-gradient mb-4">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Updated Reviews */}
      <section className="py-12 lg:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/10">
                <RefreshCw className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Recently Updated Reviews</h2>
                <p className="text-sm text-muted-foreground">
                  Fresh insights and latest information
                </p>
              </div>
            </div>
            <Link
              href="/reviews"
              className="hidden md:flex items-center gap-2 text-sm font-medium hover:underline"
            >
              All Reviews <ArrowRight className="w-4 w-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.slice(0, 4).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col p-4 rounded-xl border bg-card hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                    <RefreshCw className="w-3 h-3" /> Updated Today
                  </span>
                </div>
                <div className="aspect-square rounded-lg bg-muted mb-3 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{product.rating}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">({product.reviewCount} reviews)</span>
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-foreground">₹{formatNumber(product.currentPrice)}</span>
                    {product.originalPrice && (
                      <span className="ml-2 text-sm text-muted-foreground line-through">
                        ₹{formatNumber(product.originalPrice)}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white hover:opacity-90"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-brand-gradient p-8 md:p-12 lg:p-16"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10 max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-6">
                <Bell className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Get the Best Deals in Your Inbox
              </h2>
              <p className="text-white/80 text-lg mb-8">
                Subscribe to our newsletter and never miss out on exclusive deals, new product launches, and expert buying guides.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleNewsletterSubmit}>
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={newsletterState === 'submitting'}
                  className="h-12 px-8 rounded-xl bg-white text-brand-pink font-bold shadow-lg hover:bg-white/90 transition-colors disabled:opacity-70"
                  style={{ backgroundColor: 'white', color: '#E91E8F' }}
                >
                  {newsletterState === 'submitting' ? 'Subscribing…' : 'Subscribe'}
                </button>
              </form>
              {newsletterMessage && (
                <p className={`mt-4 text-sm ${newsletterState === 'error' ? 'text-white' : 'text-white/90'}`}>
                  {newsletterMessage}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> No spam, ever
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Unsubscribe anytime
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> 50,000+ subscribers
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
