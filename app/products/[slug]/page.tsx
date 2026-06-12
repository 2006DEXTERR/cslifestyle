'use client';

import * as React from 'react';
import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Star,
  Check,
  X,
  ChevronRight,
  ExternalLink,
  Share2,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Plus,
  HelpCircle,
  Shield,
  Truck,
  Award,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { products, categories } from '@/lib/data';

export default function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const product = products.find((p) => p.slug === slug);
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [isZoomed, setIsZoomed] = React.useState(false);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
      </div>
    );
  }

  const category = categories.find((c) => c.slug === product.categorySlug);
  const relatedProducts = products
    .filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id)
    .slice(0, 4);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'features', label: 'Key Features' },
    { id: 'specs', label: 'Specifications' },
    { id: 'pros-cons', label: 'Pros & Cons' },
    { id: 'faqs', label: 'FAQs' },
  ];

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <a href="/categories" className="hover:text-foreground">Categories</a>
            <ChevronRight className="w-4 h-4" />
            <a href={`/categories/${product.categorySlug}`} className="hover:text-foreground">
              {product.category}
            </a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Product Hero */}
      <section className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Gallery */}
            <div>
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-4">
                <img
                  src={product.images[selectedImage] || product.image}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-300 ${
                    isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
                {product.discount && (
                  <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-semibold">
                    {product.discount}% OFF
                  </div>
                )}
                {product.editorsPick && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gradient text-white text-xs font-semibold">
                    <Award className="w-3.5 h-3.5" />
                    Editor's Pick
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === index ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              {/* Brand */}
              <Link
                href={`/brands/${product.brandSlug}`}
                className="text-sm text-muted-foreground hover:text-foreground mb-2"
              >
                {product.brand}
              </Link>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(product.rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">{product.rating}</span>
                <span className="text-muted-foreground">
                  ({product.reviewCount.toLocaleString()} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-3xl md:text-4xl font-bold">
                  {formatPrice(product.currentPrice)}
                </span>
                {product.originalPrice && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="px-2 py-1 rounded bg-green-500/10 text-green-600 text-sm font-semibold">
                      Save {formatPrice(product.originalPrice - product.currentPrice)}
                    </span>
                  </>
                )}
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2 mb-6">
                <div
                  className={`w-2 h-2 rounded-full ${
                    product.availability === 'In Stock'
                      ? 'bg-green-500'
                      : product.availability === 'Limited Stock'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    product.availability === 'In Stock'
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                >
                  {product.availability}
                </span>
              </div>

              {/* Highlights */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Key Highlights</h3>
                <div className="space-y-2">
                  {product.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-auto space-y-3">
                <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full h-14 text-lg bg-brand-gradient hover:opacity-90">
                    Check Price on Amazon
                    <ExternalLink className="w-5 h-5 ml-2" />
                  </Button>
                </a>
                <div className="flex gap-2">
                  <Button variant="outline" size="lg" className="flex-1">
                    <Heart className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="lg" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t">
                <div className="flex flex-col items-center text-center">
                  <Shield className="w-6 h-6 mb-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Genuine Reviews</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Truck className="w-6 h-6 mb-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Trusted Seller</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Award className="w-6 h-6 mb-2 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Best Price</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted mb-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose max-w-none"
            >
              <h2 className="text-2xl font-bold mb-4">Product Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Key Features</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(product.features).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between p-4 rounded-xl bg-muted/50 border"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'specs' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Full Specifications</h2>
              <div className="space-y-6">
                {Object.entries(product.specifications).map(([category, specs]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="space-y-2">
                      {Object.entries(specs).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between py-2 border-b last:border-0"
                        >
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'pros-cons' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-2 gap-8"
            >
              <div className="p-6 rounded-xl bg-green-500/5 border border-green-500/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-green-500" />
                  Pros
                </h3>
                <ul className="space-y-3">
                  {product.pros.map((pro, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/20">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ThumbsDown className="w-5 h-5 text-red-500" />
                  Cons
                </h3>
                <ul className="space-y-3">
                  {product.cons.map((con, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span>{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'faqs' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {product.faqs.map((faq, index) => (
                  <div key={index} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium mb-2">{faq.question}</h3>
                        <p className="text-muted-foreground text-sm">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Affiliate Disclosure */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Affiliate Disclosure:</strong> We may earn a commission when you click links on our site and make a purchase. This helps us maintain our site and continue providing valuable content. Our reviews and recommendations are always unbiased and based on genuine product testing.
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Similar Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
