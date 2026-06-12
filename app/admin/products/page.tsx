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
  MoreHorizontal,
  ChevronDown,
  ChevronsUpDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Copy,
  X,
  Upload,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Mock data
const mockProducts = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    category: 'Smartphones',
    brand: 'Apple',
    price: 134900,
    rating: 4.8,
    status: 'Published',
    updatedAt: '2024-01-15',
    image: 'https://images.pexels.com/photos/69926/computer-smartphone-typography-smart-69926.jpeg?w=100',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    category: 'Smartphones',
    brand: 'Samsung',
    price: 129999,
    rating: 4.7,
    status: 'Published',
    updatedAt: '2024-01-14',
    image: 'https://images.pexels.com/photos/69926/computer-smartphone-typography-smart-69926.jpeg?w=100',
  },
  {
    id: '3',
    name: 'MacBook Pro 14" M3',
    slug: 'macbook-pro-14-m3',
    category: 'Laptops',
    brand: 'Apple',
    price: 169900,
    rating: 4.9,
    status: 'Draft',
    updatedAt: '2024-01-13',
    image: 'https://images.pexels.com/photos/20511/pexels-photo.jpg?w=100',
  },
  {
    id: '4',
    name: 'Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    category: 'Audio',
    brand: 'Sony',
    price: 29990,
    rating: 4.7,
    status: 'Published',
    updatedAt: '2024-01-12',
    image: 'https://images.pexels.com/photos/3394662/pexels-photo-3394662.jpeg?w=100',
  },
  {
    id: '5',
    name: 'Apple Watch Ultra 2',
    slug: 'apple-watch-ultra-2',
    category: 'Smartwatches',
    brand: 'Apple',
    price: 89900,
    rating: 4.8,
    status: 'Published',
    updatedAt: '2024-01-11',
    image: 'https://images.pexels.com/photos/437036/pexels-photo-437036.jpeg?w=100',
  },
  {
    id: '6',
    name: 'boAt Airdopes 441',
    slug: 'boat-airdotes-441',
    category: 'Audio',
    brand: 'boAt',
    price: 1299,
    rating: 4.2,
    status: 'Published',
    updatedAt: '2024-01-10',
    image: 'https://images.pexels.com/photos/3780695/pexels-photo-3780695.jpeg?w=100',
  },
  {
    id: '7',
    name: 'LG C3 OLED 55"',
    slug: 'lg-c3-oled-55',
    category: 'Televisions',
    brand: 'LG',
    price: 116990,
    rating: 4.9,
    status: 'Draft',
    updatedAt: '2024-01-09',
    image: 'https://images.pexels.com/photos/400613/pexels-photo-400613.jpeg?w=100',
  },
  {
    id: '8',
    name: 'OnePlus 12',
    slug: 'oneplus-12',
    category: 'Smartphones',
    brand: 'OnePlus',
    price: 64999,
    rating: 4.6,
    status: 'Published',
    updatedAt: '2024-01-08',
    image: 'https://images.pexels.com/photos/69926/computer-smartphone-typography-smart-69926.jpeg?w=100',
  },
];

type Product = typeof mockProducts[0];

export default function ProductsAdminPage() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedRows, setSelectedRows] = React.useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  const columns: ColumnDef<Product>[] = [
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
          <img
            src={row.original.image}
            alt={row.original.name}
            className="w-full h-full object-cover"
          />
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
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1"
        >
          Category
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
    },
    {
      accessorKey: 'brand',
      header: 'Brand',
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="flex items-center gap-1"
        >
          Price
          <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          Rs {row.original.price.toLocaleString()}
        </span>
      ),
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
            row.original.status === 'Published'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-yellow-500/10 text-yellow-600'
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
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.updatedAt).toLocaleDateString()}
        </span>
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
              setEditingProduct(row.original);
              setIsEditorOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: mockProducts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function'
        ? updater(Object.fromEntries(selectedRows.map(r => [r, true])))
        : updater;
      setSelectedRows(Object.keys(newSelection));
    },
  });

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
          <option value="Smartphones">Smartphones</option>
          <option value="Laptops">Laptops</option>
          <option value="Audio">Audio</option>
          <option value="Smartwatches">Smartwatches</option>
          <option value="Televisions">Televisions</option>
        </select>
        <select
          className="h-10 rounded-lg border bg-background px-3 text-sm"
          value={(table.getColumn('brand')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('brand')?.setFilterValue(e.target.value)}
        >
          <option value="">All Brands</option>
          <option value="Apple">Apple</option>
          <option value="Samsung">Samsung</option>
          <option value="Sony">Sony</option>
          <option value="boAt">boAt</option>
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
          <Button variant="outline" size="sm">
            Publish
          </Button>
          <Button variant="outline" size="sm">
            Unpublish
          </Button>
          <Button variant="outline" size="sm">
            Duplicate
          </Button>
          <Button variant="destructive" size="sm">
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
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    setEditingProduct(row.original);
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
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
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
      />
    </div>
  );
}

function ProductEditor({
  isOpen,
  onClose,
  product,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const [activeTab, setActiveTab] = React.useState('general');

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'images', label: 'Images' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'seo', label: 'SEO' },
    { id: 'affiliate', label: 'Affiliate' },
  ];

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
                <h2 className="text-lg font-semibold">
                  {product ? 'Edit Product' : 'Add Product'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {product?.name || 'Create a new product'}
                </p>
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
                    activeTab === tab.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
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
                    <Input
                      placeholder="Enter product name"
                      defaultValue={product?.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Slug</label>
                    <Input
                      placeholder="product-slug"
                      defaultValue={product?.slug}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        defaultValue={product?.category}
                      >
                        <option>Smartphones</option>
                        <option>Laptops</option>
                        <option>Audio</option>
                        <option>Smartwatches</option>
                        <option>Televisions</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Brand</label>
                      <select
                        className="w-full h-10 rounded-lg border bg-background px-3"
                        defaultValue={product?.brand}
                      >
                        <option>Apple</option>
                        <option>Samsung</option>
                        <option>Sony</option>
                        <option>boAt</option>
                        <option>OnePlus</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="w-full min-h-[120px] rounded-lg border bg-background p-3 text-sm"
                      placeholder="Enter product description"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Highlights</label>
                    <Input placeholder="A17 Pro Chip, Titanium Design" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select className="w-full h-10 rounded-lg border bg-background px-3">
                        <option>Published</option>
                        <option>Draft</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Availability</label>
                      <select className="w-full h-10 rounded-lg border bg-background px-3">
                        <option>In Stock</option>
                        <option>Limited Stock</option>
                        <option>Out of Stock</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'images' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-xl p-12 text-center">
                    <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-2">
                      Drag and drop images here, or click to browse
                    </p>
                    <Button variant="outline">Browse Files</Button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="aspect-square rounded-lg bg-muted relative">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'specifications' && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
                      <Input placeholder="Key (e.g., Display)" />
                      <Input className="col-span-2" placeholder="Value (e.g., 6.7-inch OLED)" />
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Specification
                  </Button>
                </div>
              )}

              {activeTab === 'pricing' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Price</label>
                      <Input
                        type="number"
                        placeholder="0"
                        defaultValue={product?.price}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Original Price</label>
                      <Input type="number" placeholder="0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Discount Percentage</label>
                    <Input type="number" placeholder="0" />
                  </div>
                </>
              )}

              {activeTab === 'seo' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Title</label>
                    <Input placeholder="Page title for search engines" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meta Description</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      placeholder="Brief description for search engines"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Keywords</label>
                    <Input placeholder="keyword1, keyword2, keyword3" />
                  </div>
                </>
              )}

              {activeTab === 'affiliate' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amazon Affiliate URL</label>
                    <Input placeholder="https://amazon.in/dp/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Flipkart Affiliate URL</label>
                    <Input placeholder="https://flipkart.com/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reliance Digital URL</label>
                    <Input placeholder="https://reliancedigital.in/..." />
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t bg-background">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button className="bg-brand-gradient">Save Product</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
