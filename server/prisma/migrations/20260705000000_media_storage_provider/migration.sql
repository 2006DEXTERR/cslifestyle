-- Media Library: record which storage backend holds each asset's bytes.
--
-- Additive + backward-compatible + non-destructive: all existing rows were stored on the
-- local disk, so the new column defaults to 'local'. New uploads write 'local' or 's3'
-- depending on STORAGE_DRIVER. Existing external image URLs (e.g. Amazon) are stored on
-- other tables as plain URL strings and are unaffected by this change.
ALTER TABLE "media_assets" ADD COLUMN "storage_provider" TEXT NOT NULL DEFAULT 'local';
