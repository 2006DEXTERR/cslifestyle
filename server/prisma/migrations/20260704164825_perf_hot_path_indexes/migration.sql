-- CreateIndex
CREATE INDEX "brands_is_active_name_idx" ON "brands"("is_active", "name");

-- CreateIndex
CREATE INDEX "comparisons_status_featured_idx" ON "comparisons"("status", "featured");

-- CreateIndex
CREATE INDEX "guides_status_category_id_idx" ON "guides"("status", "category_id");

-- CreateIndex
CREATE INDEX "products_is_published_created_at_idx" ON "products"("is_published", "created_at");

-- CreateIndex
CREATE INDEX "products_is_published_is_editors_pick_idx" ON "products"("is_published", "is_editors_pick");

-- CreateIndex
CREATE INDEX "products_is_published_brand_id_idx" ON "products"("is_published", "brand_id");

-- CreateIndex
CREATE INDEX "products_is_published_rating_idx" ON "products"("is_published", "rating");

-- CreateIndex
CREATE INDEX "products_is_published_current_price_idx" ON "products"("is_published", "current_price");
