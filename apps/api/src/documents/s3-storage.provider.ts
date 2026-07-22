import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { PresignedUpload, StorageProvider } from './storage-provider.interface';

const UPLOAD_EXPIRY_SECONDS = 900;
const DOWNLOAD_EXPIRY_SECONDS = 900;

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({ region: this.config.get<string>('AWS_REGION') ?? 'us-east-1' });
    this.bucket = this.config.get<string>('S3_INVOICE_DOCS_BUCKET') ?? '';
  }

  async getUploadUrl(keyPrefix: string, fileName: string): Promise<PresignedUpload> {
    const s3Key = `${keyPrefix}/${uuid()}-${fileName}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      ServerSideEncryption: 'AES256',
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: UPLOAD_EXPIRY_SECONDS });
    return {
      s3Key,
      uploadUrl,
      expiresInSeconds: UPLOAD_EXPIRY_SECONDS,
      // Must match the ServerSideEncryption set above — it's part of the signed request.
      headers: { 'x-amz-server-side-encryption': 'AES256' },
    };
  }

  async getDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: s3Key });
    return getSignedUrl(this.client, command, { expiresIn: DOWNLOAD_EXPIRY_SECONDS });
  }
}
