import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from './storage-provider.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Public } from '../auth/public.decorator';

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), 'local-storage');

function safeLocalPath(s3Key: string): string {
  const normalized = path.normalize(s3Key).replace(/^([/\\]|\.\.[/\\])+/, '');
  const resolved = path.resolve(LOCAL_STORAGE_ROOT, normalized);
  if (!resolved.startsWith(LOCAL_STORAGE_ROOT)) {
    throw new BadRequestException('Invalid document key');
  }
  return resolved;
}

@Controller('documents')
export class DocumentsController {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  @Post('presigned-upload-url')
  async getUploadUrl(
    @Query('keyPrefix') keyPrefix: string,
    @Query('fileName') fileName: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    if (!keyPrefix || !fileName) {
      throw new BadRequestException('keyPrefix and fileName are required');
    }
    return this.storage.getUploadUrl(keyPrefix, fileName);
  }

  @Get('download-url/:s3Key')
  async getDownloadUrl(@Param('s3Key') s3Key: string) {
    return { downloadUrl: await this.storage.getDownloadUrl(decodeURIComponent(s3Key)) };
  }

  // --- Local dev only: emulates the presigned S3 PUT/GET the browser would otherwise hit directly. ---

  @Public()
  @Post('local-upload/:s3Key')
  async localUpload(@Param('s3Key') s3Key: string, @Req() req: Request, @Res() res: Response) {
    const filePath = safeLocalPath(decodeURIComponent(s3Key));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    res.status(200).json({ ok: true });
  }

  @Public()
  @Get('local-download/:s3Key')
  async localDownload(@Param('s3Key') s3Key: string, @Res() res: Response) {
    const filePath = safeLocalPath(decodeURIComponent(s3Key));
    if (!fs.existsSync(filePath)) throw new NotFoundException('Document not found');
    res.sendFile(filePath);
  }
}
