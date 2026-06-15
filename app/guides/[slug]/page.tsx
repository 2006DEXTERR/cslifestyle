import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideDetail } from './guide-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getGuide, listGuideSlugs, listGuidesByCategory, recommendRelatedGuides } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listGuideSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await getGuide(params.slug);
  if (!guide) return { title: 'Guide Not Found' };
  return buildMetadata({
    title: guide.seoTitle || guide.title,
    description: guide.metaDescription || guide.excerpt,
    path: `/guides/${guide.slug}`,
    image: guide.coverImage,
    type: 'article',
    publishedTime: guide.publishedAt || undefined,
    modifiedTime: guide.updatedAt,
  });
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const guide = await getGuide(params.slug);
  if (!guide) notFound();

  // DB-backed recommendations (Phase 11), with a category fallback.
  let related = await recommendRelatedGuides(guide.id, 3);
  if (related.length === 0 && guide.categorySlug) {
    related = (await listGuidesByCategory(guide.categorySlug, 4)).filter((g) => g.id !== guide.id).slice(0, 3);
  }

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Guides', path: '/guides' },
    ...(guide.categorySlug ? [{ name: guide.category, path: `/categories/${guide.categorySlug}` }] : []),
    { name: guide.title, path: `/guides/${guide.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            headline: guide.title,
            description: guide.excerpt,
            image: guide.coverImage,
            path: `/guides/${guide.slug}`,
            datePublished: guide.publishedAt,
            dateModified: guide.updatedAt,
            authorName: guide.author?.name,
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <GuideDetail guide={guide} relatedGuides={related} />
    </>
  );
}
