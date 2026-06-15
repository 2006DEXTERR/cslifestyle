import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AuthorDetail } from './author-detail';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildMetadata, breadcrumbJsonLd } from '@/lib/seo';
import { getAuthor, listAuthorSlugs, listComparisons } from '@/lib/api/ssr';

export const revalidate = 3600; // ISR

export async function generateStaticParams() {
  return (await listAuthorSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const author = await getAuthor(params.slug);
  if (!author) return { title: 'Author Not Found' };
  return buildMetadata({
    title: author.seoTitle || `${author.name} — Author at CSLifestyle`,
    description: author.metaDescription || author.bio,
    path: `/authors/${author.slug}`,
    image: author.avatarUrl || undefined,
    type: 'profile',
  });
}

export default async function AuthorPage({ params }: { params: { slug: string } }) {
  const author = await getAuthor(params.slug);
  if (!author) notFound();

  const authorComparisons = await listComparisons(3);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Authors', path: '/authors' },
          { name: author.name, path: `/authors/${author.slug}` },
        ])}
      />
      <AuthorDetail author={author} authorComparisons={authorComparisons} />
    </>
  );
}
