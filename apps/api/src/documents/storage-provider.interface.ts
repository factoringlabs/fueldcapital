export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface PresignedUpload {
  s3Key: string;
  uploadUrl: string;
  expiresInSeconds: number;
  /** Headers the caller must send on the PUT — e.g. S3 signs x-amz-server-side-encryption, so it must be sent identically or the signature is rejected. */
  headers: Record<string, string>;
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
