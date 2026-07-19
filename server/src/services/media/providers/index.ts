import { env } from '../../../config/env';
import type { BlobStore, StorageProviderName } from './blob-store';
import { LocalBlobStore, localPublicUrl } from './local-provider';
import { S3BlobStore, s3PublicUrl } from './s3-provider';

/**
 * Storage provider factory/resolver. One shared instance per provider is reused (an S3
 * client is created ONCE, never per request). `blobStore()` returns the active provider
 * chosen by STORAGE_DRIVER; `blobStoreFor(provider)` returns a specific provider so an
 * asset stored under an older driver can still be deleted after the driver is switched.
 */
let localSingleton: LocalBlobStore | null = null;
let s3Singleton: S3BlobStore | null = null;

function localStore(): LocalBlobStore {
  return (localSingleton ??= new LocalBlobStore());
}
function s3Store(): S3BlobStore {
  return (s3Singleton ??= new S3BlobStore());
}

export function blobStoreFor(provider: StorageProviderName): BlobStore {
  return provider === 's3' ? s3Store() : localStore();
}

/** The active store selected by STORAGE_DRIVER. */
export function blobStore(): BlobStore {
  return blobStoreFor(env.STORAGE_DRIVER);
}

/** The active provider name (recorded on new uploads). */
export function activeProvider(): StorageProviderName {
  return env.STORAGE_DRIVER;
}

/**
 * Pure public-URL builder for a key under a specific provider — no client instantiation.
 * Used by presenters so an asset always resolves to the URL of the provider that actually
 * holds its bytes, regardless of the currently-active driver.
 */
export function publicUrlFor(provider: StorageProviderName, key: string | null): string | null {
  if (!key) return null;
  return provider === 's3' ? s3PublicUrl(key) : localPublicUrl(key);
}

/** Test-only: drop cached singletons so a changed STORAGE_DRIVER/env takes effect. */
export function resetStoresForTest(): void {
  localSingleton = null;
  s3Singleton = null;
}

export type { BlobStore, StorageProviderName } from './blob-store';
