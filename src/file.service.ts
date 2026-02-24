import {
  Injectable,
  StreamableFile,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import * as AWS from 'aws-sdk';
import * as mime from 'mime-types';
import { PassThrough } from 'stream';
import { Response } from 'express';
import axios from 'axios';

@Injectable()
export class FileService {
  private readonly s3: AWS.S3;
  private readonly bucketName = process.env.AWS_BUCKET_NAME;
  private readonly localPath = './uploads';
  private readonly reportPath = process.env.REPORT_PATH;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_REGION,
      httpOptions: {
        timeout: 300000,
        connectTimeout: 15000,
      },
    });
  }

  async upload(key: string, ct: string, body) {
    try {
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
    } catch (error) {
      console.log(error);
    }
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
      return results;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  async getFileBuf(filename: string): Promise<{ path: string; size: number }> {
    mkdirSync(this.localPath, { recursive: true });
    const filePath = join(this.localPath, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    const size = statSync(filePath).size;
    return { path: filePath, size };
  }
  async getFile(filename: string): Promise<StreamableFile> {
    try {
      // 1️⃣ URL decode (%20 → space)
      const decodedName = decodeURIComponent(filename);

      // 2️⃣ Path traversal хамгаалалт

      const filePath = join(this.localPath, filename);

      if (!existsSync(filePath)) {
        console.log('File not found locally, trying S3:', decodedName);
        const buffer = await this.downloadFromS3(decodedName);
        if (!buffer) throw new Error('File not found in S3');
        writeFileSync(filePath, buffer);
      }

      const stream = createReadStream(filePath);
      const mimeType = mime.lookup(filename) || 'application/octet-stream';

      return new StreamableFile(stream, {
        type: mimeType,
        disposition: `inline; filename="${filename}"`,
      });
    } catch (error) {
      console.error('GET FILE ERROR:', error);
      throw error;
    }
  }
  private async downloadFromS3(key: string): Promise<Buffer | null> {
    try {
      // Upload дээрээ "report/<filename>" болгож хадгалсан бол энд тааруулна
      const finalKey = `${key}`;

      console.log('▶️ S3 Download Key:', finalKey);

      // Тухайн object байгаа эсэхийг шалгана
      await this.s3
        .headObject({
          Bucket: this.bucketName,
          Key: finalKey,
        })
        .promise();

      // Object татах
      const object = await this.s3
        .getObject({
          Bucket: this.bucketName,
          Key: finalKey,
        })
        .promise();

      console.log('✅ S3 Downloaded:', {
        key: finalKey,
        size: object.ContentLength,
        type: object.ContentType,
      });

      return object.Body as Buffer;
    } catch (err) {
      console.error('❌ S3 download error:', err.message);
      return null;
    }
  }
  async getReport(filename: string) {
    try {
      const response = await axios.get(
        `${process.env.REPORT}file/${filename}`,
        {
          responseType: 'stream', // ⭐ ХАМГИЙН ЧУХАЛ
          timeout: 15000,
        },
      );

      return response; // stream + headers
    } catch (e) {
      console.error('REPORT FETCH ERROR:', e.message);
      return null; // ❗ throw хийхгүй
    }
  }
}
