import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrandDetail } from './brand-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getBrand, listBrandSlugs, listProductsByBrand } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listBrandSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const brand = await getBrand(params.slug);
  if (!brand) return { title: 'Brand Not Found' };
  return buildMetadata({
    title: brand.seoTitle || `${brand.name} Products — Reviews & Prices`,
    description: brand.metaDescription || brand.description,
    path: `/brands/${brand.slug}`,
    image: brand.logo || undefined,
    type: 'website',
  });
}

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const brand = await getBrand(params.slug);
  if (!brand) notFound();

  const products = await listProductsByBrand(brand.slug, 100);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Brands', path: '/brands' },
          { name: brand.name, path: `/brands/${brand.slug}` },
        ])}
      />
      <BrandDetail brand={brand} brandProducts={products} />
    </>
  );
}
