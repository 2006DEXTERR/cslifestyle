import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from './product-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, productJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getProduct, listProductSlugs, listProductsByCategory, recommendRelatedProducts } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Product Not Found' };
  return buildMetadata({
    title: product.seoTitle || product.name,
    description: product.metaDescription || product.shortDescription || product.description,
    path: `/products/${product.slug}`,
    image: product.image,
    type: 'website',
  });
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  // DB-backed recommendations (Phase 11), with a category fallback so the section
  // never empties if the recommender returns nothing.
  let related = await recommendRelatedProducts(product.id, 4);
  if (related.length === 0) {
    related = (await listProductsByCategory(product.categorySlug, 5)).filter((p) => p.id !== product.id).slice(0, 4);
  }

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Categories', path: '/categories' },
            { name: product.category, path: `/categories/${product.categorySlug}` },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductDetail product={product} relatedProducts={related} />
    </>
  );
}
