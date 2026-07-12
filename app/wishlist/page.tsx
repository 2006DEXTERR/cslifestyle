'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, ExternalLink, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/ProductCard';
import { products } from '@/lib/data';
import { productThumbClass, resolveProductImage } from '@/lib/image';

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = React.useState(products.slice(0, 4));

  const removeFromWishlist = (productId: string) => {
    setWishlistItems(wishlistItems.filter((item) => item.id !== productId));
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <section className="py-12 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <a href="/" className="hover:text-foreground">Home</a>
            <span>/</span>
            <span>Wishlist</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Heart className="w-8 h-8 text-brand-pink" />
                My Wishlist
              </h1>
              <p className="text-muted-foreground mt-2">
                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
            {wishlistItems.length > 0 && (
              <Button variant="outline" onClick={clearWishlist} className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <AnimatePresence mode="wait">
            {wishlistItems.length > 0 ? (
              <motion.div
                key="wishlist"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Desktop Table View */}
                <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Product</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {wishlistItems.map((product) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <Link href={`/products/${product.slug}`} className="flex items-center gap-4">
                              <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img
                                  src={resolveProductImage(product)}
                                  alt={product.name}
                                  className={productThumbClass}
                                />
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">{product.brand}</p>
                                <p className="font-medium">{product.name}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-baseline gap-2">
                              <span className="font-semibold">{formatPrice(product.currentPrice)}</span>
                              {product.originalPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.originalPrice)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-sm ${
                              product.availability === 'In Stock'
                                ? 'text-green-600'
                                : product.availability === 'Limited Stock'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                product.availability === 'In Stock'
                                  ? 'bg-green-500'
                                  : product.availability === 'Limited Stock'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`} />
                              {product.availability}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="bg-brand-gradient hover:opacity-90">
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Buy Now
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeFromWishlist(product.id)}
                                className="text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {wishlistItems.map((product) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="flex gap-4 p-4">
                        <Link href={`/products/${product.slug}`} className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img
                            src={resolveProductImage(product)}
                            alt={product.name}
                            className={productThumbClass}
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                          <Link href={`/products/${product.slug}`} className="font-medium line-clamp-2 hover:underline">
                            {product.name}
                          </Link>
                          <p className="font-semibold mt-2">{formatPrice(product.currentPrice)}</p>
                        </div>
                        <button
                          onClick={() => removeFromWishlist(product.id)}
                          className="text-muted-foreground hover:text-red-600 self-start"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="px-4 pb-4">
                        <a href={product.affiliateUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="w-full bg-brand-gradient hover:opacity-90">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Buy Now
                          </Button>
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-16"
              >
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Your Wishlist is Empty</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Save products you're interested in by clicking the heart icon on any product page.
                </p>
                <Link href="/categories">
                  <Button className="bg-brand-gradient hover:opacity-90">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Browse Products
                  </Button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
