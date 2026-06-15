import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../lib/http';
import { ALLOWED_MIME } from '../services/media/storage';

/**
 * In-memory multipart upload for the Media Library (Phase 10). Buffers files in memory
 * (sharp processes them, then they're written to disk). Limits + an allowed-mime filter
 * are enforced; multer errors are mapped to 400 ApiErrors.
 */
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MEDIA_MAX_FILE_MB * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in ALLOWED_MIME) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});

/** Accept up to 20 files under the `files` field (drag-drop / multiple upload). */
export function uploadMedia(req: Request, res: Response, next: NextFunction): void {
  mediaUpload.array('files', 20)(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return next(ApiError.badRequest(message));
    }
    next();
  });
}

/** Accept a single file under the `file` field (replace). */
export function uploadSingle(req: Request, res: Response, next: NextFunction): void {
  mediaUpload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return next(ApiError.badRequest(message));
    }
    next();
  });
}
