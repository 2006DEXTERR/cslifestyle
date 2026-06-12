export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  currentPrice: number;
  originalPrice?: number;
  discount?: number;
  availability: 'In Stock' | 'Limited Stock' | 'Out of Stock' | 'Pre-order';
  highlights: string[];
  pros: string[];
  cons: string[];
  features: Record<string, string>;
  description: string;
  specifications: Record<string, Record<string, string>>;
  faqs: { question: string; answer: string }[];
  affiliateUrl: string;
  trending?: boolean;
  editorsPick?: boolean;
  deal?: {
    expiresIn: string;
    savings: number;
  };
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  icon: string;
  productCount: number;
  subcategories: string[];
}

export interface BuyingGuide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: Author;
  readingTime: number;
  lastUpdated: string;
  category: string;
  categorySlug: string;
  tags: string[];
  productRecommendations: {
    product: Product;
    reason: string;
    isTopPick: boolean;
  }[];
  tableOfContents: { title: string; id: string }[];
}

export interface Comparison {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  productA: Product;
  productB: Product;
  winner: 'A' | 'B' | 'tie';
  summary: string;
  categories: {
    name: string;
    winner: 'A' | 'B' | 'tie';
    details: string;
    productA: string;
    productB: string;
  }[];
  prosCons: {
    productA: { pros: string[]; cons: string[] };
    productB: { pros: string[]; cons: string[] };
  };
  verdict: string;
}

export interface Author {
  id: string;
  slug: string;
  name: string;
  avatar: string;
  bio: string;
  expertise: string[];
  social: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  articlesCount: number;
  guides: BuyingGuide[];
  comparisons: Comparison[];
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logo: string;
  description: string;
  productCount: number;
  rating: number;
}

export interface SearchResult {
  type: 'product' | 'guide' | 'comparison' | 'brand';
  item: Product | BuyingGuide | Comparison | Brand;
  relevance: number;
}

export interface FilterState {
  price: { min: number; max: number };
  rating: number;
  brands: string[];
  discounts: number[];
  sortBy: 'popularity' | 'price-low' | 'price-high' | 'rating';
}
