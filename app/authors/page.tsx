'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen } from 'lucide-react';
import { contentApi, type ContentAuthor } from '@/lib/api/content';

export default function AuthorsPage() {
  const [authors, setAuthors] = React.useState<ContentAuthor[]>([]);

  React.useEffect(() => {
    let active = true;
    contentApi
      .listAuthors({ perPage: 100 })
      .then((r) => {
        if (active) setAuthors(r.items);
      })
      .catch(() => {
        if (active) setAuthors([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span>Authors</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">Our Expert Authors</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Meet the team of experts behind our in-depth reviews and buying guides.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {authors.map((author, index) => (
            <motion.div
              key={author.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/authors/${author.slug}`}>
                <div className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all">
                  <div className="flex items-start gap-4">
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {author.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {author.bio}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {author.expertise.slice(0, 3).map((exp) => (
                      <span
                        key={exp}
                        className="px-2 py-0.5 rounded-full bg-muted text-xs"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <BookOpen className="w-4 h-4" />
                    {author.articlesCount} articles
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
