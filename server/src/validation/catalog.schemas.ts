import { z } from 'zod';

/** Catalog validation (Phase 2). Bodies are validated by `validateBody`; list
 *  query strings are parsed in-controller via the `*ListQuerySchema` parsers. */

const AVAILABILITY = ['In Stock', 'Limited Stock', 'Out of Stock', 'Pre-order'] as const;

const optionalString = z.string().trim().max(20000).optional();

/** Query-string boolean: only "true"/"1" are truthy ("false"/"0"/absent → false). */
const queryBool = z
  .preprocess((v) => v === 'true' || v === '1' || v === true, z.boolean())
  .optional();
const stringArray = z.array(z.string().trim().min(1).max(2000));
const faqArray = z.array(
  z.object({
    question: z.string().trim().min(1).max(2000),
    answer: z.string().trim().min(1).max(20000),
  }),
);

// ───────────────────────── Products ─────────────────────────

const productBase = {
  asin: z.string().trim().min(1, 'ASIN is required').max(20),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(300),
  slug: z.string().trim().min(1).max(160).optional(),
  categoryId: z.string().trim().min(1, 'A category is required'),
  brandId: z.string().trim().min(1).nullable().optional(),
  shortDescription: optionalString,
  description: optionalString,
  image: z.string().trim().max(2000).optional(),
  gallery: stringArray.max(20).optional(),
  specifications: z.record(z.any()).optional(),
  highlights: stringArray.max(30).optional(),
  features: z.record(z.any()).optional(),
  pros: stringArray.max(30).optional(),
  cons: stringArray.max(30).optional(),
  faqs: faqArray.max(50).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewCount: z.coerce.number().int().min(0).optional(),
  currentPrice: z.coerce.number().min(0).max(99999999).optional(),
  originalPrice: z.coerce.number().min(0).max(99999999).optional(),
  discountPercent: z.coerce.number().int().min(0).max(100).optional(),
  currency: z.string().trim().length(3).optional(),
  availability: z.enum(AVAILABILITY).optional(),
  affiliateUrl: z.string().trim().max(2000).optional(),
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  isPublished: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isEditorsPick: z.boolean().optional(),
  dealExpiresIn: z.string().trim().max(60).nullable().optional(),
  dealSavings: z.coerce.number().int().min(0).nullable().optional(),
};

export const createProductSchema = z.object(productBase);
export const updateProductSchema = createProductSchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

export const bulkProductSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'delete']),
  ids: z.array(z.string().trim().min(1)).min(1, 'Select at least one product').max(500),
});

// ───────────────────────── Categories ─────────────────────────

const categoryBase = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
  description: optionalString,
  image: z.string().trim().max(2000).optional(),
  icon: z.string().trim().max(60).optional(),
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  subcategories: stringArray.max(50).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
};

export const createCategorySchema = z.object(categoryBase);
export const updateCategorySchema = createCategorySchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ───────────────────────── Brands ─────────────────────────

const brandBase = {
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
  slug: z.string().trim().min(1).max(160).optional(),
  logo: z.string().trim().max(2000).optional(),
  description: optionalString,
  website: z.string().trim().max(2000).optional(),
  seoTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(500).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  isActive: z.boolean().optional(),
};

export const createBrandSchema = z.object(brandBase);
export const updateBrandSchema = createBrandSchema
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });

// ───────────────────────── List / search query parsers ─────────────────────────

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(12),
  sort: z.enum(['popularity', 'price-low', 'price-high', 'rating', 'newest']).optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  q: z.string().trim().max(200).optional(),
  trending: queryBool,
  deals: queryBool,
  editorsPick: queryBool,
  status: z.enum(['published', 'all', 'draft']).default('published'),
});

export const categoryListQuerySchema = z.object({
  status: z.enum(['active', 'all']).default('active'),
  parent: z.enum(['root', 'all']).default('root'),
  q: z.string().trim().max(200).optional(),
});

export const brandListQuerySchema = z.object({
  status: z.enum(['active', 'all']).default('active'),
  q: z.string().trim().max(200).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'A search term is required').max(200),
  type: z.enum(['all', 'products', 'categories', 'brands']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;
export type BrandListQuery = z.infer<typeof brandListQuerySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type CreateProductBody = z.infer<typeof createProductSchema>;
export type UpdateProductBody = z.infer<typeof updateProductSchema>;
export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type CreateBrandBody = z.infer<typeof createBrandSchema>;
