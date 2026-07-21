import { IsNotEmpty, IsString } from 'class-validator';

export class ExtractPreviewDto {
  @IsString()
  @IsNotEmpty()
  s3Key!: string;
}
