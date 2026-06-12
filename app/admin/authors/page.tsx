'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  GitCompare,
  Twitter,
  Linkedin,
  Globe,
  X,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockAuthors = [
  {
    id: '1',
    name: 'Priya Sharma',
    slug: 'priya-sharma',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=100',
    expertise: ['Smartphones', 'Smartwatches', 'Wearables'],
    guidesCount: 45,
    comparisonsCount: 12,
    avgRating: 4.7,
    status: 'active',
  },
  {
    id: '2',
    name: 'Rahul Verma',
    slug: 'rahul-verma',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=100',
    expertise: ['Headphones', 'Earbuds', 'Audio'],
    guidesCount: 32,
    comparisonsCount: 8,
    avgRating: 4.6,
    status: 'active',
  },
  {
    id: '3',
    name: 'Ananya Patel',
    slug: 'ananya-patel',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100',
    expertise: ['Laptops', 'Desktops', 'Monitors'],
    guidesCount: 28,
    comparisonsCount: 15,
    avgRating: 4.5,
    status: 'active',
  },
  {
    id: '4',
    name: 'Vikram Singh',
    slug: 'vikram-singh',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=100',
    expertise: ['Home Appliances', 'Air Conditioners'],
    guidesCount: 18,
    comparisonsCount: 5,
    avgRating: 4.4,
    status: 'inactive',
  },
];

export default function AuthorsAdminPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingAuthor, setEditingAuthor] = React.useState<typeof mockAuthors[0] | null>(null);
  const [selectedAuthor, setSelectedAuthor] = React.useState<typeof mockAuthors[0] | null>(null);

  const filteredAuthors = mockAuthors.filter(
    (author) =>
      author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.expertise.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))
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
                  author.status === 'active'
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-gray-500/10 text-gray-600'
                }`}
              >
                {author.status}
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
                <p className="text-sm font-bold">{author.guidesCount}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <GitCompare className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-bold">{author.comparisonsCount}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted/50">
                <Star className="w-4 h-4 mx-auto mb-1 fill-yellow-400 text-yellow-400" />
                <p className="text-sm font-bold">{author.avgRating}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setSelectedAuthor(author)}
              >
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
            </div>
          </motion.div>
        ))}
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

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-2xl font-bold brand-gradient-text">{selectedAuthor.guidesCount}</p>
                    <p className="text-xs text-muted-foreground">Guides</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <p className="text-2xl font-bold brand-gradient-text">{selectedAuthor.comparisonsCount}</p>
                    <p className="text-xs text-muted-foreground">Comparisons</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-muted">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-bold brand-gradient-text">{selectedAuthor.avgRating}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Rating</p>
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
                    <a href="#" className="p-2 rounded-lg hover:bg-muted"><Twitter className="w-5 h-5" /></a>
                    <a href="#" className="p-2 rounded-lg hover:bg-muted"><Linkedin className="w-5 h-5" /></a>
                    <a href="#" className="p-2 rounded-lg hover:bg-muted"><Globe className="w-5 h-5" /></a>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Author Editor */}
      <AnimatePresence>
        {isEditorOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setIsEditorOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 z-50 h-screen w-full max-w-lg bg-background border-l overflow-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                <h2 className="text-lg font-semibold">
                  {editingAuthor ? 'Edit Author' : 'Add Author'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setIsEditorOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-center">
                  <img
                    src={editingAuthor?.avatar || 'https://via.placeholder.com/100'}
                    alt=""
                    className="w-20 h-20 rounded-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input defaultValue={editingAuthor?.name} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input defaultValue={editingAuthor?.slug} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Expertise (comma-separated)</label>
                  <Input defaultValue={editingAuthor?.expertise.join(', ')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Twitter</label>
                    <Input placeholder="@username" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn</label>
                    <Input placeholder="linkedin.com/in/..." />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-brand-gradient">Save Author</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
