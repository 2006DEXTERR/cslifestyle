'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Clock,
  X,
  Save,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const mockGuides = [
  {
    id: '1',
    title: 'Best Smartphones Under Rs 30,000 in 2024',
    author: { name: 'Priya Sharma', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=50' },
    category: 'Smartphones',
    status: 'Published',
    views: 45230,
    readingTime: 12,
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Best Wireless Earbuds for Every Budget',
    author: { name: 'Rahul Verma', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=50' },
    category: 'Audio',
    status: 'Published',
    views: 32150,
    readingTime: 15,
    updatedAt: '2024-01-20',
  },
  {
    id: '3',
    title: 'Complete Laptop Buying Guide for Students',
    author: { name: 'Ananya Patel', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=50' },
    category: 'Laptops',
    status: 'Draft',
    views: 0,
    readingTime: 18,
    updatedAt: '2024-01-18',
  },
  {
    id: '4',
    title: 'How to Choose the Right Smartwatch',
    author: { name: 'Priya Sharma', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=50' },
    category: 'Smartwatches',
    status: 'Published',
    views: 28450,
    readingTime: 10,
    updatedAt: '2024-01-22',
  },
  {
    id: '5',
    title: 'Complete TV Buying Guide',
    author: { name: 'Vikram Singh', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=50' },
    category: 'Televisions',
    status: 'Archived',
    views: 18900,
    readingTime: 20,
    updatedAt: '2024-01-10',
  },
];

type Guide = typeof mockGuides[0];

export default function GuidesAdminPage() {
  const [statusFilter, setStatusFilter] = React.useState('');
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingGuide, setEditingGuide] = React.useState<Guide | null>(null);

  const filteredGuides = statusFilter
    ? mockGuides.filter((g) => g.status === statusFilter)
    : mockGuides;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Guides</h1>
          <p className="text-muted-foreground">Manage buying guides and articles</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingGuide(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Guide
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search guides..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {['', 'Published', 'Draft', 'Archived'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {/* Guides Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  <input type="checkbox" className="rounded border" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Author</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Views</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Read Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredGuides.map((guide) => (
                <tr key={guide.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md">
                      <p className="font-medium truncate">{guide.title}</p>
                      <p className="text-xs text-muted-foreground">{guide.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={guide.author.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <span className="text-sm">{guide.author.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        guide.status === 'Published'
                          ? 'bg-green-500/10 text-green-600'
                          : guide.status === 'Draft'
                          ? 'bg-yellow-500/10 text-yellow-600'
                          : 'bg-gray-500/10 text-gray-600'
                      }`}
                    >
                      {guide.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{guide.views.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {guide.readingTime} min
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(guide.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guide Editor */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <div className="flex h-full">
              <div className="flex-1 overflow-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>
                      <X className="w-5 h-5 mr-2" />
                      Close
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline">
                      Preview
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                    <Button className="bg-brand-gradient">
                      <Save className="w-4 h-4 mr-2" />
                      Publish
                    </Button>
                  </div>
                </div>

                <div className="max-w-3xl mx-auto py-12 px-6">
                  <div className="space-y-6">
                    <div>
                      <input
                        type="text"
                        placeholder="Guide Title..."
                        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
                        defaultValue={editingGuide?.title}
                      />
                    </div>

                    <div className="flex gap-4">
                      <select className="h-10 rounded-lg border bg-background px-3">
                        <option>Select Author</option>
                        {['Priya Sharma', 'Rahul Verma', 'Ananya Patel'].map((name) => (
                          <option key={name} selected={editingGuide?.author.name === name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <select className="h-10 rounded-lg border bg-background px-3">
                        <option>Select Category</option>
                        {['Smartphones', 'Laptops', 'Audio', 'Smartwatches'].map((cat) => (
                          <option key={cat} selected={editingGuide?.category === cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="min-h-[400px] rounded-xl border bg-muted/30 p-4">
                      <p className="text-muted-foreground">Write your guide content here...</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-80 border-l bg-muted/30 overflow-auto hidden lg:block">
                <div className="p-4 space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">Table of Contents</h3>
                    <div className="space-y-1">
                      {['Introduction', 'What to Look For', 'Top Picks', 'FAQs'].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="w-full mt-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
