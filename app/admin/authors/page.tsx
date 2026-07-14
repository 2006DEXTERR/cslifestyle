'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Edit, Trash2, BookOpen, GitCompare, Twitter, Linkedin, Globe, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { contentApi, ContentApiError, type ContentAuthor } from '@/lib/api/content';

export default function AuthorsAdminPage() {
  const [authors, setAuthors] = React.useState<ContentAuthor[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingAuthor, setEditingAuthor] = React.useState<ContentAuthor | null>(null);
  const [selectedAuthor, setSelectedAuthor] = React.useState<ContentAuthor | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const { items } = await contentApi.listAuthors({ status: 'all', perPage: 200 });
    setAuthors(items);
    setLoadError(null);
  }, []);

  React.useEffect(() => {
    void refresh().catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load authors.'));
  }, [refresh]);

  // Open the profile drawer with the list row immediately, then upgrade it with the
  // full author record (getAuthor populates `guides`, which the list endpoint omits)
  // so the "Published" count reflects live data instead of always showing 0.
  const openAuthor = React.useCallback((author: ContentAuthor) => {
    setSelectedAuthor(author);
    contentApi
      .getAuthor(author.slug)
      .then((full) => setSelectedAuthor((cur) => (cur && cur.id === full.id ? full : cur)))
      .catch(() => undefined);
  }, []);

  const handleDelete = async (author: ContentAuthor) => {
    if (!window.confirm(`Delete author "${author.name}"? Their guides are kept but unlinked.`)) return;
    try {
      await contentApi.deleteAuthor(author.id);
      await refresh();
    } catch (err) {
      window.alert(err instanceof ContentApiError ? err.message : 'Failed to delete author.');
    }
  };

  const filteredAuthors = authors.filter(
    (author) =>
      author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.expertise.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authors</h1>
          <p className="text-muted-foreground">Manage content authors and their profiles</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingAuthor(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Author
        </Button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">{loadError}</div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search authors..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Authors Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAuthors.map((author, index) => (
          <motion.div
            key={author.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={author.avatar} alt={author.name} className="w-12 h-12 rounded-full" />
                <div>
                  <h3 className="font-semibold">{author.name}</h3>
                  <p className="text-xs text-muted-foreground">@{author.slug}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  author.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'
                }`}
              >
                {author.isActive ? 'active' : 'inactive'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {author.expertise.slice(0, 3).map((exp) => (
                <span key={exp} className="px-2 py-0.5 rounded-full bg-muted text-xs">
                  {exp}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <BookOpen className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-bold">{author.articlesCount}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <GitCompare className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-bold">{author.guides.length}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Tag className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-bold">{author.expertise.length}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => openAuthor(author)}>
                View Profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingAuthor(author);
                  setIsEditorOpen(true);
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(author)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredAuthors.length === 0 && (
          <p className="col-span-full p-6 text-center text-sm text-muted-foreground">No authors found.</p>
        )}
      </div>

      {/* Author Profile Drawer */}
      <AnimatePresence>
        {selectedAuthor && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setSelectedAuthor(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">Author Profile</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedAuthor(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <img src={selectedAuthor.avatar} alt="" className="w-16 h-16 rounded-full" />
                  <div>
                    <h3 className="text-xl font-bold">{selectedAuthor.name}</h3>
                    <p className="text-sm text-muted-foreground">@{selectedAuthor.slug}</p>
                  </div>
                </div>

                {selectedAuthor.bio && <p className="text-sm text-muted-foreground mb-6">{selectedAuthor.bio}</p>}

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-2xl font-bold brand-gradient-text">{selectedAuthor.articlesCount}</p>
                    <p className="text-xs text-muted-foreground">Guides</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-2xl font-bold brand-gradient-text">{selectedAuthor.guides.length}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-2xl font-bold brand-gradient-text">{selectedAuthor.expertise.length}</p>
                    <p className="text-xs text-muted-foreground">Topics</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAuthor.expertise.map((exp) => (
                      <span key={exp} className="px-3 py-1 rounded-full bg-muted">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h3 className="font-semibold">Social Links</h3>
                  <div className="flex gap-4">
                    {selectedAuthor.social.twitter && (
                      <a
                        href={`https://twitter.com/${selectedAuthor.social.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                    )}
                    {selectedAuthor.social.linkedin && (
                      <a
                        href={`https://linkedin.com/in/${selectedAuthor.social.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                    )}
                    {selectedAuthor.social.website && (
                      <a href={selectedAuthor.social.website} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>

                <a href={`/authors/${selectedAuthor.slug}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full mt-6">
                    <Globe className="w-4 h-4 mr-2" />
                    View Public Page
                  </Button>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Author Editor */}
      <AuthorEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingAuthor(null);
        }}
        author={editingAuthor}
        onSaved={async () => {
          setIsEditorOpen(false);
          setEditingAuthor(null);
          await refresh();
        }}
      />
    </div>
  );
}

const splitList = (s: string): string[] =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

function AuthorEditor({
  isOpen,
  onClose,
  author,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  author: ContentAuthor | null;
  onSaved: () => void | Promise<void>;
}) {
  const blank = {
    name: '',
    slug: '',
    avatarUrl: '',
    bio: '',
    credentials: '',
    expertise: '',
    isActive: true,
    twitter: '',
    linkedin: '',
    website: '',
    seoTitle: '',
    metaDescription: '',
  };
  const [form, setForm] = React.useState(blank);
  const [activeTab, setActiveTab] = React.useState('general');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setError(null);
    if (author) {
      const s = author.social ?? {};
      setForm({
        name: author.name,
        slug: author.slug,
        avatarUrl: author.avatarUrl ?? author.avatar ?? '',
        bio: author.bio ?? '',
        credentials: author.credentials ?? '',
        expertise: author.expertise.join(', '),
        isActive: author.isActive,
        twitter: s.twitter ?? '',
        linkedin: s.linkedin ?? '',
        website: s.website ?? '',
        seoTitle: author.seoTitle ?? '',
        metaDescription: author.metaDescription ?? '',
      });
    } else {
      setForm(blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, author]);

  const set = (k: keyof typeof blank, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'social', label: 'Social' },
    { id: 'seo', label: 'SEO' },
  ];

  async function handleSave() {
    setError(null);
    if (!form.name.trim()) return setError('Name is required.');
    const socialLinks: Record<string, string> = {};
    if (form.twitter) socialLinks.twitter = form.twitter;
    if (form.linkedin) socialLinks.linkedin = form.linkedin;
    if (form.website) socialLinks.website = form.website;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      avatarUrl: form.avatarUrl || undefined,
      bio: form.bio || undefined,
      credentials: form.credentials || undefined,
      expertise: splitList(form.expertise),
      socialLinks,
      isActive: form.isActive,
      seoTitle: form.seoTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    };

    setSaving(true);
    try {
      if (author) await contentApi.updateAuthor(author.id, payload);
      else await contentApi.createAuthor(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save author.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
              <h2 className="text-lg font-semibold">{author ? 'Edit Author' : 'Add Author'}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex gap-1 p-2 border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {activeTab === 'general' && (
                <>
                  <div className="flex justify-center">
                    <img src={form.avatarUrl || 'https://via.placeholder.com/100'} alt="" className="w-20 h-20 rounded-full object-cover" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avatar URL</label>
                    <Input value={form.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slug</label>
                      <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto from name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      value={form.bio}
                      onChange={(e) => set('bio', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Credentials</label>
                    <Input value={form.credentials} onChange={(e) => set('credentials', e.target.value)} placeholder="e.g. Senior Tech Editor, 8 yrs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expertise (comma-separated)</label>
                    <Input value={form.expertise} onChange={(e) => set('expertise', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      className="w-full h-10 rounded-lg border bg-background px-3"
                      value={form.isActive ? 'Active' : 'Inactive'}
                      onChange={(e) => set('isActive', e.target.value === 'Active')}
                    >
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </div>
                </>
              )}

              {activeTab === 'social' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Twitter handle</label>
                    <Input value={form.twitter} onChange={(e) => set('twitter', e.target.value)} placeholder="username" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn</label>
                    <Input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="in/username" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" />
                  </div>
                </>
              )}

              {activeTab === 'seo' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Title</label>
                    <Input value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Description</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      value={form.metaDescription}
                      onChange={(e) => set('metaDescription', e.target.value)}
                    />
                  </div>
                </>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Author'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
