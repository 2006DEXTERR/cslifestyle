// Centralised SEO: site config, metadata builder (canonical + OpenGraph + Twitter),
// and JSON-LD structured-data builders. Used by the Server Component pages.

import type { Metadata } from 'next';
import type { CatalogProduct } from '@/lib/api/catalog';

export const SITE = {
  name: 'CSLifestyle',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cslifestyle.in').replace(/\/$/, ''),
  description:
    "India's most trusted product discovery platform. Expert buying guides, comparisons, and reviews for smartphones, laptops, earbuds, and more.",
  twitter: '@cslifestyle',
  logo: 'https://bolt.new/static/og_default.png',
  defaultImage: 'https://bolt.new/static/og_default.png',
};

/** Absolute URL from a path (or pass-through if already absolute). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE.url}${path.startsWith('/') ? '' : '/'}${path}`;
}

interface MetaInput {
  title: string;
  description?: string;
  path: string; // site-relative, e.g. /products/iphone-15
  image?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}

/** Build Next Metadata with canonical + OpenGraph + Twitter. */
export function buildMetadata({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex,
  publishedTime,
  modifiedTime,
}: MetaInput): Metadata {
  const url = absoluteUrl(path);
  const img = image || SITE.defaultImage;
  const desc = (description || SITE.description).slice(0, 300);
  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: SITE.name,
      type: type === 'profile' ? 'profile' : type,
      images: [{ url: img }],
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [img],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

// ───────────────────────── JSON-LD builders ─────────────────────────

type Json = Record<string, unknown>;

export function organizationJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    description: SITE.description,
  };
}

export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

const AVAILABILITY_SCHEMA: Record<string, string> = {
  'In Stock': 'https://schema.org/InStock',
  'Limited Stock': 'https://schema.org/LimitedAvailability',
  'Out of Stock': 'https://schema.org/OutOfStock',
  'Pre-order': 'https://schema.org/PreOrder',
};

export function productJsonLd(product: CatalogProduct): Json {
  const ld: Json = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description || product.name,
    image: product.images?.length ? product.images : product.image ? [product.image] : undefined,
    sku: product.asin,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.category ? { category: product.category } : {}),
  };
  if (product.rating > 0 && product.reviewCount > 0) {
    ld.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  if (product.currentPrice > 0) {
    ld.offers = {
      '@type': 'Offer',
      price: product.currentPrice,
      priceCurrency: product.currency || 'INR',
      availability: AVAILABILITY_SCHEMA[product.availability] ?? 'https://schema.org/InStock',
      url: absoluteUrl(`/products/${product.slug}`),
    };
  }
  return ld;
}

interface ArticleInput {
  headline: string;
  description?: string;
  image?: string;
  path: string;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string;
}

export function articleJsonLd({
  headline,
  description,
  image,
  path,
  datePublished,
  dateModified,
  authorName,
}: ArticleInput): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished ? { dateModified: dateModified || datePublished } : {}),
    author: { '@type': authorName ? 'Person' : 'Organization', name: authorName || SITE.name },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: { '@type': 'ImageObject', url: SITE.logo },
    },
  };
}
