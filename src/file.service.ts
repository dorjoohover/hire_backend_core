import {
  Injectable,
  StreamableFile,
  NotFoundException,
  BadRequestException,
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
    try {
      console.log(key);
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
      console.log(results);
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
      const buf = await this.downloadFromS3(filename);
      if (!buf) throw new NotFoundException('File not found in S3');
      writeFileSync(filePath, buf);
    }
    const size = statSync(filePath).size;
    return { path: filePath, size };
  }
  async getFile(filename: string): Promise<StreamableFile> {
    try {
      const filePath = join(this.localPath, filename);
      console.log(filename);
      if (!existsSync(filePath)) {
        const file = await this.downloadFromS3(filename);
        console.log('file', file);
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
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  private async downloadFromS3(key: string): Promise<Buffer | null> {
    try {
      console.log('key', key);
      const raw = key;
      const cleaned = raw.trim().replace(/^\/*/, '');
      console.log('RAW:', JSON.stringify(raw));
      console.log('CLEANED:', JSON.stringify(cleaned));
      console.log('HEX  :', Buffer.from(cleaned, 'utf8').toString('hex'));
      await this.s3
        .headObject({ Bucket: 'hire.mn', Key: 'report-3286171091721517.pdf' })
        .promise();
      await this.s3.headObject({ Bucket: 'hire.mn', Key: cleaned }).promise();
      const list = await this.s3
        .listObjectsV2({
          Bucket: 'hire.mn',
          Prefix: '3286171091721517', // эхний хэдэн цифр
        })
        .promise();
      console.log(list.Contents?.map((o) => o.Key));
      const object = await this.s3
        .getObject({ Bucket: this.bucketName, Key: key })
        .promise();
      console.log(object);
      return object.Body as Buffer;
    } catch (err) {
      console.error('S3 download error:', err.message);
      return null;
    }
  }
}
