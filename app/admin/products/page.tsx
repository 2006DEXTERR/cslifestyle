'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  X,
  Upload,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  catalogApi,
  type CatalogProduct,
  type CatalogCategory,
  type CatalogBrand,
} from '@/lib/api/catalog';
import { formatNumber, formatDate } from '@/lib/format';

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  status: 'Published' | 'Draft';
  updatedAt: string;
  image: string;
  raw: CatalogProduct;
}

function toRow(p: CatalogProduct): ProductRow {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    brand: p.brand,
    price: p.currentPrice,
    rating: p.rating,
    status: p.isPublished ? 'Published' : 'Draft',
    updatedAt: p.updatedAt,
    image: p.image,
    raw: p,
  };
}

export default function ProductsAdminPage() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<CatalogProduct | null>(null);

  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [categories, setCategories] = React.useState<CatalogCategory[]>([]);
  const [brands, setBrands] = React.useState<CatalogBrand[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await catalogApi.listProducts({ status: 'all', perPage: 200, sort: 'newest' });
      setProducts(items.map(toRow));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    catalogApi.listCategories({ status: 'all', parent: 'all' }).then(setCategories).catch(() => setCategories([]));
    catalogApi.listBrands({ status: 'all' }).then(setBrands).catch(() => setBrands([]));
  }, [refresh]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this product? This cannot be undone.')) return;
      await catalogApi.deleteProduct(id);
      await refresh();
    },
    [refresh],
  );

  const handleBulk = React.useCallback(
    async (action: 'publish' | 'unpublish' | 'delete') => {
      if (selectedRows.length === 0) return;
      if (action === 'delete' && !window.confirm(`Delete ${selectedRows.length} product(s)?`)) return;
      await catalogApi.bulkProducts(action, selectedRows);
      setSelectedRows([]);
      await refresh();
    },
    [selectedRows, refresh],
  );

  const columns = React.useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'image',
        header: '',
        cell: ({ row }) => (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted">
            <img src={row.original.image} alt={row.original.name} className="w-full h-full object-cover" />
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Product Name',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1">
            Category
            <ArrowUpDown className="w-4 h-4" />
          </button>
        ),
      },
      { accessorKey: 'brand', header: 'Brand' },
      {
        accessorKey: 'price',
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="flex items-center gap-1">
            Price
            <ArrowUpDown className="w-4 h-4" />
          </button>
        ),
        cell: ({ row }) => <span className="font-medium">Rs {formatNumber(row.original.price)}</span>,
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{row.original.rating}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.original.status === 'Published' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
            }`}
          >
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingProduct(row.original.raw);
                setIsEditorOpen(true);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleDelete],
  );

  const table = useReactTable({
    data: products,
    columns,
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
    onRowSelectionChange: (updater) => {
      const newSelection =
        typeof updater === 'function' ? updater(Object.fromEntries(selectedRows.map((r) => [r, true]))) : updater;
      setSelectedRows(Object.keys(newSelection).filter((k) => newSelection[k]));
    },
  });

  const categoryNames = Array.from(new Set(categories.map((c) => c.name)));
  const brandNames = Array.from(new Set(brands.map((b) => b.name)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog</p>
        </div>
        <Button
          className="bg-brand-gradient hover:opacity-90"
          onClick={() => {
            setEditingProduct(null);
            setIsEditorOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          value={(table.getColumn('category')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('category')?.setFilterValue(e.target.value)}
        >
          <option value="">All Categories</option>
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          value={(table.getColumn('brand')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('brand')?.setFilterValue(e.target.value)}
        >
          <option value="">All Brands</option>
          {brandNames.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
          <span className="text-sm">
            {selectedRows.length} product{selectedRows.length > 1 ? 's' : ''} selected
          </span>
          <Button variant="outline" size="sm" onClick={() => handleBulk('publish')}>
            Publish
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulk('unpublish')}>
            Unpublish
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleBulk('delete')}>
            Delete
          </Button>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    setEditingProduct(row.original.raw);
                    setIsEditorOpen(true);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm"
                      onClick={(e) => {
                        if (cell.column.id === 'select' || cell.column.id === 'actions') {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && table.getRowModel().rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading products…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {table.getFilteredRowModel().rows.length === 0 ? 0 : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{' '}
            of {table.getFilteredRowModel().rows.length} products
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Product Editor Drawer */}
      <ProductEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        brands={brands}
        onSaved={async () => {
          setIsEditorOpen(false);
          setEditingProduct(null);
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

function ProductEditor({
  isOpen,
  onClose,
  product,
  categories,
  brands,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: CatalogProduct | null;
  categories: CatalogCategory[];
  brands: CatalogBrand[];
  onSaved: () => void | Promise<void>;
}) {
  const [activeTab, setActiveTab] = React.useState('general');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const blank = {
    asin: '',
    title: '',
    slug: '',
    categoryId: '',
    brandId: '',
    description: '',
    shortDescription: '',
    highlights: '',
    isPublished: false,
    availability: 'In Stock',
    image: '',
    gallery: '',
    specifications: '',
    currentPrice: '',
    originalPrice: '',
    discountPercent: '',
    seoTitle: '',
    metaDescription: '',
    affiliateUrl: '',
  };
  const [form, setForm] = React.useState(blank);

  React.useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setError(null);
    if (product) {
      setForm({
        asin: product.asin ?? '',
        title: product.title ?? product.name ?? '',
        slug: product.slug ?? '',
        categoryId: product.categoryId ?? '',
        brandId: product.brandId ?? '',
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        highlights: (product.highlights ?? []).join(', '),
        isPublished: product.isPublished ?? false,
        availability: product.availability ?? 'In Stock',
        image: product.image ?? '',
        gallery: (product.gallery ?? []).join('\n'),
        specifications: product.specifications ? JSON.stringify(product.specifications, null, 2) : '',
        currentPrice: product.currentPrice != null ? String(product.currentPrice) : '',
        originalPrice: product.originalPrice != null ? String(product.originalPrice) : '',
        discountPercent: product.discountPercent != null ? String(product.discountPercent) : '',
        seoTitle: product.seoTitle ?? '',
        metaDescription: product.metaDescription ?? '',
        affiliateUrl: product.affiliateUrl ?? '',
      });
    } else {
      setForm(blank);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product]);

  const set = (k: keyof typeof blank, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'images', label: 'Images' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'seo', label: 'SEO' },
    { id: 'affiliate', label: 'Affiliate' },
  ];

  async function handleSave() {
    setError(null);
    if (!form.title.trim()) return setError('Product name is required.');
    if (!form.categoryId) return setError('Please select a category.');
    if (!product && !form.asin.trim()) return setError('ASIN is required for a new product.');

    let specifications: unknown;
    if (form.specifications.trim()) {
      try {
        specifications = JSON.parse(form.specifications);
      } catch {
        setActiveTab('specifications');
        return setError('Specifications must be valid JSON.');
      }
    }

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      description: form.description || undefined,
      shortDescription: form.shortDescription || undefined,
      highlights: splitList(form.highlights),
      isPublished: form.isPublished,
      availability: form.availability,
      image: form.image || undefined,
      gallery: splitList(form.gallery),
      specifications,
      currentPrice: form.currentPrice ? Number(form.currentPrice) : undefined,
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      discountPercent: form.discountPercent ? Number(form.discountPercent) : undefined,
      seoTitle: form.seoTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      affiliateUrl: form.affiliateUrl || undefined,
    };
    if (!product) payload.asin = form.asin.trim();
    else if (form.asin.trim()) payload.asin = form.asin.trim();

    setSaving(true);
    try {
      if (product) await catalogApi.updateProduct(product.id, payload);
      else await catalogApi.createProduct(payload);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
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
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl bg-background border-l overflow-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
              <div>
                <h2 className="text-lg font-semibold">{product ? 'Edit Product' : 'Add Product'}</h2>
                <p className="text-sm text-muted-foreground">{product?.name || 'Create a new product'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tabs */}
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

            {/* Form Content */}
            <div className="p-6 space-y-6">
              {activeTab === 'general' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Product Name</label>
                    <Input placeholder="Enter product name" value={form.title} onChange={(e) => set('title', e.target.value)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Slug</label>
                      <Input placeholder="auto from name" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">ASIN</label>
                      <Input placeholder="B0..." value={form.asin} onChange={(e) => set('asin', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        value={form.categoryId}
                        onChange={(e) => set('categoryId', e.target.value)}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Brand</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        value={form.brandId}
                        onChange={(e) => set('brandId', e.target.value)}
                      >
                        <option value="">No brand</option>
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Short Description</label>
                    <Input
                      placeholder="One-line summary"
                      value={form.shortDescription}
                      onChange={(e) => set('shortDescription', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
                      placeholder="Enter product description"
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Highlights (comma separated)</label>
                    <Input
                      placeholder="A17 Pro Chip, Titanium Design"
                      value={form.highlights}
                      onChange={(e) => set('highlights', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        value={form.isPublished ? 'Published' : 'Draft'}
                        onChange={(e) => set('isPublished', e.target.value === 'Published')}
                      >
                        <option>Published</option>
                        <option>Draft</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Availability</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        value={form.availability}
                        onChange={(e) => set('availability', e.target.value)}
                      >
                        <option>In Stock</option>
                        <option>Limited Stock</option>
                        <option>Out of Stock</option>
                        <option>Pre-order</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'images' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Main Image URL</label>
                    <Input placeholder="https://…" value={form.image} onChange={(e) => set('image', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gallery URLs (one per line)</label>
                    <textarea
                      className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
                      placeholder={'https://…\nhttps://…'}
                      value={form.gallery}
                      onChange={(e) => set('gallery', e.target.value)}
                    />
                  </div>
                  <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">File uploads arrive with the media phase — paste image URLs above for now.</p>
                  </div>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Specifications (JSON)</label>
                  <textarea
                    className="w-full min-h-[240px] rounded-lg border bg-background p-3 text-sm font-mono"
                    placeholder={'{\n  "Display": { "Size": "6.7 inches" }\n}'}
                    value={form.specifications}
                    onChange={(e) => set('specifications', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Grouped key/value specs, e.g. {'{ "Display": { "Size": "6.7″" } }'}.
                  </p>
                </div>
              )}

              {activeTab === 'pricing' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Price</label>
                      <Input type="number" placeholder="0" value={form.currentPrice} onChange={(e) => set('currentPrice', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Original Price</label>
                      <Input type="number" placeholder="0" value={form.originalPrice} onChange={(e) => set('originalPrice', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Percentage</label>
                    <Input type="number" placeholder="0" value={form.discountPercent} onChange={(e) => set('discountPercent', e.target.value)} />
                  </div>
                </>
              )}

              {activeTab === 'seo' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Title</label>
                    <Input placeholder="Page title for search engines" value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Description</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      placeholder="Brief description for search engines"
                      value={form.metaDescription}
                      onChange={(e) => set('metaDescription', e.target.value)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'affiliate' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amazon Affiliate URL</label>
                  <Input placeholder="https://amazon.in/dp/..." value={form.affiliateUrl} onChange={(e) => set('affiliateUrl', e.target.value)} />
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button className="bg-brand-gradient" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save Product'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
