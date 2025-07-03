import {
  Injectable,
  StreamableFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createReadStream, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as AWS from 'aws-sdk';
import * as mime from 'mime-types';
import { PassThrough } from 'stream';

@Injectable()
export class FileService {
  private readonly s3: AWS.S3;
  private readonly bucketName = process.env.AWS_BUCKET_NAME;
  private readonly localPath = './uploads';

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async upload(key: string, ct: string, body) {
    await this.s3
      .upload({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: ct,
      })
      .promise();

    // Optional: Save locally
    const localFilePath = join(this.localPath, key);
    writeFileSync(localFilePath, body);

    // Add public S3 URL
    const fileUrl = `${key}`;
    return fileUrl;
  }
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  async processMultipleImages(
    files: Express.Multer.File[],
    pt?: PassThrough,
    key?: string,
    ct?: string,
  ): Promise<string[]> {
    try {
      console.log('uploading', files);
      const results: string[] = [];
      if (files.length == 0) {
        const buffer = await this.streamToBuffer(pt);
        const res = await this.upload(key, ct, buffer);
        results.push(res);
      }
      for (const file of files) {
        const key = `${Date.now()}_${file.originalname}`;
        const fileUrl = await this.upload(key, file.mimetype, file.buffer);

        results.push(fileUrl);
      }
      console.log(results);
      return results;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async getFile(filename: string): Promise<StreamableFile> {
    const filePath = join(this.localPath, filename);

    if (!existsSync(filePath)) {
      const file = await this.downloadFromS3(filename);

      if (!file) {
        throw new NotFoundException('File not found in S3');
      }

      writeFileSync(filePath, file);
    }

    const stream = createReadStream(filePath);
    const mimeType = mime.lookup(filename) || 'application/octet-stream';

    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `inline; filename="${filename}"`,
    });
  }

  private async downloadFromS3(key: string): Promise<Buffer | null> {
    try {
      const object = await this.s3
        .getObject({ Bucket: this.bucketName, Key: key })
        .promise();
      return object.Body as Buffer;
    } catch (err) {
      console.error('S3 download error:', err.message);
      return null;
    }
  }
}
