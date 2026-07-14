export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PresignedUpload {
  s3Key: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/**
 * Swappable file storage boundary. Buckets are always private; access is
 * always via a presigned URL — never a public object. S3StorageProvider is
 * the real AWS implementation; LocalStorageProvider lets Phase 1 be
 * developed and tested without AWS credentials.
 */
export interface StorageProvider {
  getUploadUrl(keyPrefix: string, fileName: string): Promise<PresignedUpload>;
  getDownloadUrl(s3Key: string): Promise<string>;
}
