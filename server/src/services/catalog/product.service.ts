import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../lib/http';
import type { Pagination } from '../../lib/http';
import { uniqueSlug } from '../../lib/slug';
import { presentProduct, type PresentedProduct } from './presenters';
import type {
  ProductListQuery,
  CreateProductBody,
  UpdateProductBody,
} from '../../validation/catalog.schemas';

const PRODUCT_INCLUDE = { category: true, brand: true, images: true } as const;

function buildWhere(q: ProductListQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  if (q.status === 'published') and.push({ isPublished: true });
  else if (q.status === 'draft') and.push({ isPublished: false });

  if (q.category) and.push({ OR: [{ categoryId: q.category }, { category: { slug: q.category } }] });
  if (q.brand) and.push({ OR: [{ brandId: q.brand }, { brand: { slug: q.brand } }] });
  if (q.minPrice !== undefined) and.push({ currentPrice: { gte: q.minPrice } });
  if (q.maxPrice !== undefined) and.push({ currentPrice: { lte: q.maxPrice } });
  if (q.minRating !== undefined) and.push({ rating: { gte: q.minRating } });
  if (q.trending) and.push({ isTrending: true });
  if (q.editorsPick) and.push({ isEditorsPick: true });
  if (q.deals) and.push({ NOT: { dealExpiresIn: null } });
  if (q.q) {
    and.push({
      OR: [
        { title: { contains: q.q, mode: 'insensitive' } },
        { shortDescription: { contains: q.q, mode: 'insensitive' } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

function buildOrderBy(sort?: ProductListQuery['sort']): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'popularity':
      return { reviewCount: 'desc' };
    case 'price-low':
      return { currentPrice: 'asc' };
    case 'price-high':
      return { currentPrice: 'desc' };
    case 'rating':
      return { rating: 'desc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

export async function listProducts(
  query: ProductListQuery,
  canSeeUnpublished: boolean,
): Promise<{ items: PresentedProduct[]; pagination: Pagination }> {
  // Non-privileged callers may never see drafts regardless of the requested status.
  const status = canSeeUnpublished ? query.status : 'published';
  const where = buildWhere({ ...query, status });
  const skip = (query.page - 1) * query.perPage;

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(presentProduct),
    pagination: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.perPage)),
    },
  };
}

export async function getProductBySlug(
  slug: string,
  canSeeUnpublished: boolean,
): Promise<PresentedProduct> {
  const row = await prisma.product.findUnique({ where: { slug }, include: PRODUCT_INCLUDE });
  if (!row || (!canSeeUnpublished && !row.isPublished)) {
    throw ApiError.notFound('Product not found');
  }
  return presentProduct(row);
}

function productExistsBySlug(slug: string): Promise<string | null> {
  return prisma.product.findUnique({ where: { slug }, select: { id: true } }).then((r) => r?.id ?? null);
}

/** Scalar (non-relation) columns shared by create/update. */
function scalarData(body: Partial<CreateProductBody>): Prisma.ProductUncheckedUpdateInput {
  const d: Prisma.ProductUncheckedUpdateInput = {};
  if (body.asin !== undefined) d.asin = body.asin;
  if (body.title !== undefined) d.title = body.title;
  if (body.categoryId !== undefined) d.categoryId = body.categoryId;
  if (body.brandId !== undefined) d.brandId = body.brandId;
  if (body.shortDescription !== undefined) d.shortDescription = body.shortDescription;
  if (body.description !== undefined) d.description = body.description;
  if (body.image !== undefined) d.image = body.image;
  if (body.gallery !== undefined) d.gallery = body.gallery;
  if (body.specifications !== undefined) d.specifications = body.specifications as Prisma.InputJsonValue;
  if (body.highlights !== undefined) d.highlights = body.highlights;
  if (body.features !== undefined) d.features = body.features as Prisma.InputJsonValue;
  if (body.pros !== undefined) d.pros = body.pros;
  if (body.cons !== undefined) d.cons = body.cons;
  if (body.faqs !== undefined) d.faqs = body.faqs;
  if (body.rating !== undefined) d.rating = body.rating;
  if (body.reviewCount !== undefined) d.reviewCount = body.reviewCount;
  if (body.currentPrice !== undefined) d.currentPrice = body.currentPrice;
  if (body.originalPrice !== undefined) d.originalPrice = body.originalPrice;
  if (body.discountPercent !== undefined) d.discountPercent = body.discountPercent;
  if (body.currency !== undefined) d.currency = body.currency;
  if (body.availability !== undefined) d.availability = body.availability;
  if (body.affiliateUrl !== undefined) d.affiliateUrl = body.affiliateUrl;
  if (body.seoTitle !== undefined) d.seoTitle = body.seoTitle;
  if (body.metaDescription !== undefined) d.metaDescription = body.metaDescription;
  if (body.isPublished !== undefined) d.isPublished = body.isPublished;
  if (body.isTrending !== undefined) d.isTrending = body.isTrending;
  if (body.isEditorsPick !== undefined) d.isEditorsPick = body.isEditorsPick;
  if (body.dealExpiresIn !== undefined) d.dealExpiresIn = body.dealExpiresIn;
  if (body.dealSavings !== undefined) d.dealSavings = body.dealSavings;
  return d;
}

async function assertReferences(categoryId?: string, brandId?: string | null): Promise<void> {
  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
    if (!cat) throw ApiError.badRequest('Invalid category', { categoryId: ['Category not found'] });
  }
  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) throw ApiError.badRequest('Invalid brand', { brandId: ['Brand not found'] });
  }
}

async function syncImages(
  tx: Prisma.TransactionClient,
  productId: string,
  gallery: string[] | undefined,
): Promise<void> {
  if (gallery === undefined) return;
  await tx.productImage.deleteMany({ where: { productId } });
  if (gallery.length > 0) {
    await tx.productImage.createMany({
      data: gallery.map((imageUrl, i) => ({ productId, imageUrl, sortOrder: i })),
    });
  }
}

export async function createProduct(body: CreateProductBody): Promise<PresentedProduct> {
  await assertReferences(body.categoryId, body.brandId ?? undefined);

  const existingAsin = await prisma.product.findUnique({ where: { asin: body.asin }, select: { id: true } });
  if (existingAsin) throw new ApiError(409, 'A product with this ASIN already exists', { asin: ['Duplicate ASIN'] });

  const slug = await uniqueSlug(body.slug ?? body.title, productExistsBySlug);

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...(scalarData(body) as Prisma.ProductUncheckedCreateInput), slug },
    });
    await syncImages(tx, product.id, body.gallery);
    if (body.currentPrice !== undefined) {
      await tx.productPriceHistory.create({
        data: {
          productId: product.id,
          price: body.currentPrice,
          originalPrice: body.originalPrice ?? null,
        },
      });
    }
    return product;
  });

  return getProductById(created.id, true);
}

export async function updateProduct(id: string, body: UpdateProductBody): Promise<PresentedProduct> {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Product not found');

  await assertReferences(body.categoryId, body.brandId ?? undefined);

  if (body.asin && body.asin !== existing.asin) {
    const dupe = await prisma.product.findUnique({ where: { asin: body.asin }, select: { id: true } });
    if (dupe && dupe.id !== id) throw new ApiError(409, 'A product with this ASIN already exists', { asin: ['Duplicate ASIN'] });
  }

  const data = scalarData(body);
  if (body.slug) data.slug = await uniqueSlug(body.slug, productExistsBySlug, id);

  const priceChanged =
    body.currentPrice !== undefined && Number(existing.currentPrice ?? NaN) !== body.currentPrice;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data });
    await syncImages(tx, id, body.gallery);
    if (priceChanged) {
      await tx.productPriceHistory.create({
        data: {
          productId: id,
          price: body.currentPrice as number,
          originalPrice: body.originalPrice ?? existing.originalPrice ?? null,
        },
      });
    }
  });

  return getProductById(id, true);
}

export async function deleteProduct(id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw ApiError.notFound('Product not found');
  await prisma.product.delete({ where: { id } }); // cascades images + price history
}

export async function bulkProducts(
  action: 'publish' | 'unpublish' | 'delete',
  ids: string[],
): Promise<{ affected: number }> {
  if (action === 'delete') {
    const res = await prisma.product.deleteMany({ where: { id: { in: ids } } });
    return { affected: res.count };
  }
  const res = await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { isPublished: action === 'publish' },
  });
  return { affected: res.count };
}

async function getProductById(id: string, canSeeUnpublished: boolean): Promise<PresentedProduct> {
  const row = await prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  if (!row || (!canSeeUnpublished && !row.isPublished)) throw ApiError.notFound('Product not found');
  return presentProduct(row);
}
