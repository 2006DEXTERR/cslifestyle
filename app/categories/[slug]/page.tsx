import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryDetail } from './category-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getCategory, listCategorySlugs, listProductsByCategory, listGuidesByCategory } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listCategorySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const category = await getCategory(params.slug);
  if (!category) return { title: 'Category Not Found' };
  return buildMetadata({
    title: category.seoTitle || `${category.name} — Reviews & Buying Guides`,
    description: category.metaDescription || category.description,
    path: `/categories/${category.slug}`,
    image: category.image,
    type: 'website',
  });
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const category = await getCategory(params.slug);
  if (!category) notFound();

  const [products, guides] = await Promise.all([
    listProductsByCategory(category.slug, 100),
    listGuidesByCategory(category.slug, 6),
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Categories', path: '/categories' },
          { name: category.name, path: `/categories/${category.slug}` },
        ])}
      />
      <CategoryDetail category={category} categoryProducts={products} categoryGuides={guides} />
    </>
  );
}
