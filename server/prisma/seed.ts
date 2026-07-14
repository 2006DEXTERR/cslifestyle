import { PrismaClient, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { COMPARISON_RICH } from './comparison-rich';
import { PRODUCT_IMAGES } from './product-images';
import { GUIDE_IMAGES } from './guide-images';
import { CANONICAL_PRODUCTS } from './canonical-products';
import { deriveComparisonTitle, replaceProductNames } from '../src/lib/comparison-canonical';
import bcrypt from 'bcrypt';
import {
  PERMISSIONS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type RoleName,
} from '../src/config/permissions';
import { ENFORCE_2FA_ROLES_KEY } from '../src/services/settings.service';
import { resolveAffiliateUrl } from '../src/lib/affiliate';
// Reuse the existing frontend mock as the catalog seed source so the wired
// storefront renders identically on day one (06-database-design.md §5).
import {
  categories as mockCategories,
  brands as mockBrands,
  products as mockProducts,
  authors as mockAuthors,
  buyingGuides as mockGuides,
  comparisons as mockComparisons,
} from '../../lib/data';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@cslifestyle.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'CSLifestyle Admin';

async function main(): Promise<void> {
  console.log('🌱 Seeding RBAC catalog…');

  // 1. Permissions (idempotent upserts).
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { module: p.module, description: p.description },
      create: { name: p.name, module: p.module, description: p.description },
    });
  }
  console.log(`   ✓ ${PERMISSIONS.length} permissions`);

  // 2. Roles + role→permission mapping.
  for (const roleName of Object.values(ROLES) as RoleName[]) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
    });

    const permNames = ROLE_PERMISSIONS[roleName];
    const perms = await prisma.permission.findMany({
      where: { name: { in: permNames } },
      select: { id: true },
    });

    // Reset and re-map (keeps role permissions in sync with the catalog).
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (perms.length > 0) {
      await prisma.rolePermission.createMany({
        data: perms.map((perm) => ({ roleId: role.id, permissionId: perm.id })),
        skipDuplicates: true,
      });
    }
    console.log(`   ✓ role "${roleName}" → ${perms.length} permissions`);
  }

  // 3. Default admin user.
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLES.ADMIN } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { roleId: adminRole.id, isActive: true, emailVerified: true },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`   ✓ admin user: ${ADMIN_EMAIL}`);

  // 4. Default settings — 2FA enforcement policy (admin-configurable).
  await prisma.setting.upsert({
    where: { key: ENFORCE_2FA_ROLES_KEY },
    update: {}, // preserve any admin-set value
    create: {
      key: ENFORCE_2FA_ROLES_KEY,
      value: JSON.stringify(['admin']),
      type: 'json',
      group: 'security',
    },
  });
  console.log('   ✓ default 2FA enforcement policy');

  // 5. Catalog (categories → brands → products), ported from the frontend mock.
  await seedCatalog();

  // 6. Content (authors → guides → comparisons), ported from the frontend mock.
  await seedContent();

  // 7. Affiliate settings + campaigns + sample clicks + revenue (so the dashboard shows real data).
  await seedAffiliate();

  console.log('✅ Seed complete.');
}

/** Deterministic 0..1 pseudo-random (no Math.random → reproducible seed). */
function pseudo(n: number): number {
  return ((n * 9301 + 49297) % 233280) / 233280;
}

/** SHA-256 hex (sample privacy-safe hash for seeded clicks). */
function createHashHex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const DAY_MS = 86_400_000;

/** Seeds the affiliate system with realistic sample data (idempotent). */
async function seedAffiliate(): Promise<void> {
  console.log('🌱 Seeding affiliate + revenue…');

  // Settings (singleton). Disclosure text set so the compliance checklist passes.
  await prisma.affiliateSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      amazonAssociateTag: 'cslifestyle-21',
      amazonDomain: 'amazon.in',
      linkCode: 'ogi',
      disclosureText:
        'CSLifestyle is a participant in the Amazon Associates Program. We may earn a commission on qualifying purchases made through our links.',
      trackingEnabled: true,
    },
  });

  // Campaigns.
  for (const c of [
    { name: 'Summer Sale 2026', slug: 'summer-sale', affiliateTag: 'cslifestyle-summer-21' },
    { name: 'Festive Deals', slug: 'festive-deals', affiliateTag: null },
  ]) {
    await prisma.affiliateCampaign.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, affiliateTag: c.affiliateTag, isActive: true },
    });
  }
  console.log('   ✓ settings + 2 campaigns');

  const products = await prisma.product.findMany({
    select: { id: true, asin: true, currentPrice: true, category: { select: { name: true } } },
  });

  const DEVICES = ['mobile', 'desktop', 'tablet'] as const;
  const SOURCES = ['product', 'search', 'guide', 'comparison', 'deals'] as const;

  // Sample clicks across products over the last 30 days (privacy-safe hashes).
  if ((await prisma.affiliateClick.count()) === 0) {
    const clickData: {
      asin: string;
      productId: string;
      sourceType: (typeof SOURCES)[number];
      deviceType: (typeof DEVICES)[number];
      ipHash: string;
      userAgentHash: string;
      country: string;
      clickedAt: Date;
    }[] = [];
    for (let pi = 0; pi < products.length; pi++) {
      const p = products[pi];
      for (let day = 0; day < 30; day++) {
        const count = Math.floor(pseudo(pi * 31 + day) * 4); // 0..3
        for (let k = 0; k < count; k++) {
          const r = pseudo(pi * 131 + day * 7 + k);
          clickData.push({
            asin: p.asin,
            productId: p.id,
            sourceType: SOURCES[Math.floor(r * SOURCES.length)],
            deviceType: DEVICES[Math.floor(pseudo(pi + day + k) * DEVICES.length)],
            ipHash: createHashHex(`ip-${pi}-${day}-${k}`),
            userAgentHash: createHashHex(`ua-${pi}-${day}-${k}`),
            country: 'IN',
            clickedAt: new Date(Date.now() - day * DAY_MS - Math.floor(r * DAY_MS)),
          });
        }
      }
    }
    if (clickData.length > 0) await prisma.affiliateClick.createMany({ data: clickData });
    console.log(`   ✓ ${clickData.length} sample clicks`);
  }

  // Estimated revenue per product per day (idempotent).
  if ((await prisma.revenueReport.count()) === 0) {
    const reports: {
      date: Date;
      asin: string;
      productId: string;
      category: string | null;
      actualRevenue: number;
      orders: number;
      clicks: number;
      source: 'estimated';
    }[] = [];
    for (let pi = 0; pi < products.length; pi++) {
      const p = products[pi];
      const price = Number(p.currentPrice ?? 0);
      for (let day = 0; day < 30; day++) {
        const clicks = Math.floor(pseudo(pi * 31 + day) * 4);
        if (clicks === 0) continue;
        const orders = Math.max(0, Math.round(clicks * 0.04));
        const revenue = Number((orders * price * 0.04).toFixed(2)); // ~4% commission
        reports.push({
          date: new Date(new Date(Date.now() - day * DAY_MS).toISOString().slice(0, 10)),
          asin: p.asin,
          productId: p.id,
          category: p.category?.name ?? null,
          actualRevenue: revenue,
          orders,
          clicks,
          source: 'estimated',
        });
      }
    }
    if (reports.length > 0) await prisma.revenueReport.createMany({ data: reports });
    console.log(`   ✓ ${reports.length} estimated revenue rows`);
  }

  // A sample Amazon CSV import record (so the imports list is populated).
  if ((await prisma.revenueImport.count()) === 0) {
    const total = await prisma.revenueReport.aggregate({ _sum: { actualRevenue: true } });
    await prisma.revenueImport.create({
      data: {
        fileName: 'amazon-associates-sample.csv',
        source: 'amazon_csv',
        status: 'completed',
        rowCount: 0,
        totalRevenue: Number(total._sum.actualRevenue ?? 0),
        periodStart: new Date(Date.now() - 30 * DAY_MS),
        periodEnd: new Date(),
      },
    });
    console.log('   ✓ sample revenue import record');
  }
}

/** Seeds the catalog from the existing frontend mock (idempotent upserts). */
async function seedCatalog(): Promise<void> {
  console.log('🌱 Seeding catalog…');

  // Categories.
  for (const [i, c] of mockCategories.entries()) {
    const data = {
      name: c.name,
      description: c.description,
      image: c.image,
      icon: c.icon,
      subcategories: c.subcategories,
      sortOrder: i,
      isActive: true,
    };
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
    });
  }
  console.log(`   ✓ ${mockCategories.length} categories`);

  // Brands.
  for (const b of mockBrands) {
    const data = {
      name: b.name,
      logo: b.logo,
      description: b.description,
      rating: b.rating,
      isActive: true,
    };
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: data,
      create: { slug: b.slug, ...data },
    });
  }
  console.log(`   ✓ ${mockBrands.length} brands`);

  // Resolve slug → id maps.
  const catBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  const brandBySlug = new Map(
    (await prisma.brand.findMany({ select: { id: true, slug: true } })).map((b) => [b.slug, b.id]),
  );

  // Old→canonical name pairs so product prose (descriptions) never restores old names.
  const prodNamePairs = mockProducts
    .map((mp): [string, string] => [mp.name, CANONICAL_PRODUCTS[mp.slug]?.name ?? mp.name])
    .filter(([o, n]) => o !== n);
  const prodSwap = (t: string): string => replaceProductNames(t, prodNamePairs) ?? t;

  // Products.
  for (const p of mockProducts) {
    const categoryId = catBySlug.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`   ! skipping ${p.slug} — unknown category ${p.categorySlug}`);
      continue;
    }
    const brandId = brandBySlug.get(p.brandSlug) ?? null;
    // Canonical owner-maintained data (server/my-products.csv) wins over the lib/data mock
    // so a reseed can NEVER restore old names / ASINs / images / affiliate links. When a
    // slug has no canonical value we fall back to the mock (asin → clearly-marked
    // `B0SEED####` placeholder, flagged by productDataWarnings and yielding no affiliate URL).
    const canon = CANONICAL_PRODUCTS[p.slug];
    const asin = canon?.asin ?? `B0SEED${p.id.padStart(4, '0')}`;
    // Generate the affiliate URL from the ASIN ONLY when it's real; placeholder
    // ASINs → null (never the old `amazon.in/dp/example` stub).
    const affiliateUrl =
      resolveAffiliateUrl(asin, p.affiliateUrl, { tag: 'cslifestyle-21', domain: 'amazon.in' }) || null;

    // Canonical per-product image (verified catalog). Overrides the generic lib/data
    // stock image so EVERY reseed restores the real product photo. Both Product.image and
    // the ProductImage rows below use this same resolved value.
    const primaryImage = canon?.image ?? PRODUCT_IMAGES[p.slug] ?? p.image;
    const imageUrls = primaryImage !== p.image ? [primaryImage] : p.images;
    const title = canon?.name ?? p.name;

    const data = {
      asin,
      categoryId,
      brandId,
      title,
      shortDescription: prodSwap(p.description.slice(0, 280)),
      description: prodSwap(p.description),
      image: primaryImage,
      gallery: imageUrls,
      specifications: p.specifications,
      highlights: p.highlights,
      features: p.features,
      pros: p.pros,
      cons: p.cons,
      faqs: p.faqs,
      rating: p.rating,
      reviewCount: p.reviewCount,
      currentPrice: p.currentPrice,
      originalPrice: p.originalPrice ?? null,
      discountPercent: p.discount ?? null,
      currency: 'INR',
      availability: p.availability,
      affiliateUrl,
      isPublished: true,
      isTrending: p.trending ?? false,
      isEditorsPick: p.editorsPick ?? false,
      dealExpiresIn: p.deal?.expiresIn ?? null,
      dealSavings: p.deal?.savings ?? null,
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    // Resync gallery images (ProductImage normalised table) — same canonical URLs.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    if (imageUrls.length > 0) {
      await prisma.productImage.createMany({
        data: imageUrls.map((imageUrl, idx) => ({ productId: product.id, imageUrl, sortOrder: idx })),
      });
    }

    // Seed one price-history point (only if none yet — keeps the seed idempotent).
    const hasHistory = await prisma.productPriceHistory.count({ where: { productId: product.id } });
    if (hasHistory === 0) {
      await prisma.productPriceHistory.create({
        data: {
          productId: product.id,
          price: p.currentPrice,
          originalPrice: p.originalPrice ?? null,
        },
      });
    }
  }
  console.log(`   ✓ ${mockProducts.length} products (+ images + price history)`);
}

/** Seeds authors, guides and comparisons from the existing frontend mock. */
async function seedContent(): Promise<void> {
  console.log('🌱 Seeding content…');

  // Authors.
  for (const a of mockAuthors) {
    const data = {
      name: a.name,
      avatarUrl: a.avatar,
      bio: a.bio,
      expertise: a.expertise,
      socialLinks: a.social,
      isActive: true,
    };
    await prisma.author.upsert({ where: { slug: a.slug }, update: data, create: { slug: a.slug, ...data } });
  }
  console.log(`   ✓ ${mockAuthors.length} authors`);

  // Resolve slug → id maps.
  const catBySlug = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  const authorBySlug = new Map(
    (await prisma.author.findMany({ select: { id: true, slug: true } })).map((a) => [a.slug, a.id]),
  );
  const prodBySlug = new Map(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  );

  // Guides.
  for (const g of mockGuides) {
    const data = {
      title: g.title,
      excerpt: g.excerpt,
      content: g.content,
      // Canonical guide covers win over the lib/data mock so a reseed never restores
      // the old Pexels stock photos (see prisma/guide-images.ts).
      coverImage: GUIDE_IMAGES[g.slug] ?? g.coverImage,
      categoryId: catBySlug.get(g.categorySlug) ?? null,
      authorId: authorBySlug.get(g.author.slug) ?? null,
      readingTime: g.readingTime,
      tableOfContents: g.tableOfContents,
      tags: g.tags,
      status: 'published' as const,
      publishedAt: new Date(g.lastUpdated),
    };
    const guide = await prisma.guide.upsert({ where: { slug: g.slug }, update: data, create: { slug: g.slug, ...data } });

    await prisma.guideProduct.deleteMany({ where: { guideId: guide.id } });
    const recs = g.productRecommendations
      .map((rec, i) => {
        const productId = prodBySlug.get(rec.product.slug);
        return productId
          ? { guideId: guide.id, productId, position: i, reason: rec.reason, isTopPick: rec.isTopPick }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (recs.length > 0) await prisma.guideProduct.createMany({ data: recs, skipDuplicates: true });
  }
  console.log(`   ✓ ${mockGuides.length} guides (+ product picks)`);

  // Canonical old→new product-name pairs so comparison text never restores old names.
  const namePairs = mockProducts
    .map((p): [string, string] => [p.name, CANONICAL_PRODUCTS[p.slug]?.name ?? p.name])
    .filter(([o, n]) => o !== n);
  const canonName = (slug: string, fallback: string): string => CANONICAL_PRODUCTS[slug]?.name ?? fallback;
  const swap = (t: string | null | undefined): string | null => replaceProductNames(t, namePairs);

  // Comparisons.
  for (const c of mockComparisons) {
    const productAId = prodBySlug.get(c.productA.slug);
    const productBId = prodBySlug.get(c.productB.slug);
    if (!productAId || !productBId) {
      console.warn(`   ! skipping comparison ${c.slug} — missing product`);
      continue;
    }
    // Rich demo overlay (grouped/typed specs + editorial content) for known slugs.
    const rich = COMPARISON_RICH[c.slug];
    // Derive the title from canonical product names + repair prose so a reseed can never
    // restore old names (see src/lib/comparison-canonical.ts).
    const aName = canonName(c.productA.slug, c.productA.name);
    const bName = canonName(c.productB.slug, c.productB.name);
    const data = {
      title: swap(deriveComparisonTitle(c.title, aName, bName)),
      excerpt: swap(c.excerpt),
      summary: swap(c.summary),
      productAId,
      productBId,
      verdict: swap(c.verdict),
      winner: rich?.winner ?? c.winner,
      prosCons: c.prosCons,
      status: 'published' as const,
      publishedAt: new Date('2024-01-15'),
      ...(rich
        ? {
            editorSummary: swap(rich.editorSummary),
            whoShouldBuyA: swap(rich.whoShouldBuyA),
            whoShouldBuyB: swap(rich.whoShouldBuyB),
            bestFor: swap(rich.bestFor),
            faq: (rich.faq ?? []) as unknown as Prisma.InputJsonValue,
            comparisonScoreA: rich.comparisonScoreA ?? null,
            comparisonScoreB: rich.comparisonScoreB ?? null,
            featured: rich.featured ?? false,
            reviewStatus: 'approved' as const,
            lastReviewedBy: rich.lastReviewedBy ?? null,
            bestAlternativeIds: (rich.alternativeSlugs ?? [])
              .map((s) => prodBySlug.get(s))
              .filter((id): id is string => Boolean(id)) as unknown as Prisma.InputJsonValue,
          }
        : {}),
    };
    const comparison = await prisma.comparison.upsert({
      where: { slug: c.slug },
      update: data,
      create: { slug: c.slug, ...data },
    });

    await prisma.comparisonSpec.deleteMany({ where: { comparisonId: comparison.id } });
    if (rich) {
      await prisma.comparisonSpec.createMany({
        data: rich.specs.map((s, i) => ({
          comparisonId: comparison.id,
          specName: s.specName,
          specGroup: s.specGroup,
          displayType: s.displayType,
          valueType: s.valueType,
          winnerMode: s.winnerMode,
          unit: s.unit ?? null,
          productAValue: s.productAValue ?? null,
          productBValue: s.productBValue ?? null,
          numberValueA: s.numberValueA ?? null,
          numberValueB: s.numberValueB ?? null,
          booleanValueA: s.booleanValueA ?? null,
          booleanValueB: s.booleanValueB ?? null,
          winner: s.winner ?? null,
          details: s.details ?? null,
          position: i,
        })),
      });
    } else if (c.categories.length > 0) {
      await prisma.comparisonSpec.createMany({
        data: c.categories.map((s, i) => ({
          comparisonId: comparison.id,
          specName: s.name,
          productAValue: s.productA,
          productBValue: s.productB,
          winner: s.winner,
          details: s.details,
          position: i,
        })),
      });
    }
    await prisma.comparisonProduct.deleteMany({ where: { comparisonId: comparison.id } });
    await prisma.comparisonProduct.createMany({
      data: [
        { comparisonId: comparison.id, productId: productAId, position: 0 },
        { comparisonId: comparison.id, productId: productBId, position: 1 },
      ],
      skipDuplicates: true,
    });
  }
  console.log(`   ✓ ${mockComparisons.length} comparisons (+ specs)`);

  // Build the unified search index so advanced search works on a fresh DB (Phase 11).
  const { rebuildIndex } = await import('../src/services/discovery/index.service');
  const { indexed } = await rebuildIndex();
  console.log(`   ✓ search index built (${indexed} entries)`);
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
