import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { PresignedUpload, StorageProvider } from './storage-provider.interface';

const UPLOAD_EXPIRY_SECONDS = 900;

/**
 * Dev-only stand-in for S3 so Phase 1 can be built and tested without AWS
 * credentials. Files are written under ./local-storage via the matching PUT
 * route in DocumentsController — never used outside local development.
 */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  async getUploadUrl(keyPrefix: string, fileName: string): Promise<PresignedUpload> {
    const s3Key = `${keyPrefix}/${uuid()}-${fileName}`;
    const port = this.config.get<string>('PORT') ?? '4000';
    return {
      s3Key,
      uploadUrl: `http://localhost:${port}/documents/local-upload/${encodeURIComponent(s3Key)}`,
      expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
    };
  }

  async getDownloadUrl(s3Key: string): Promise<string> {
    const port = this.config.get<string>('PORT') ?? '4000';
    return `http://localhost:${port}/documents/local-download/${encodeURIComponent(s3Key)}`;
  }
}
