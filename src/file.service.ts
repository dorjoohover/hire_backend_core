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
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import * as AWS from 'aws-sdk';
import * as mime from 'mime-types';
import { PassThrough } from 'stream';
import { Response } from 'express';
import axios from 'axios';
import { resolveInside } from './utils/safe-path';
import { isSafeMode, safeLog } from './utils/safe-mode';
import {
  createS3Client,
  describeObjectStorage,
  isObjectStorageConfigured,
  objectStorageConfig,
} from './utils/object-storage';

@Injectable()
export class FileService {
  private readonly s3: AWS.S3;
  // v1.3.0: AWS S3 эсвэл Cloudflare R2 (S3_ENDPOINT / R2_ACCOUNT_ID) — utils/object-storage.ts
  private readonly storage = objectStorageConfig();
  private readonly bucketName = this.storage.bucket;
  private readonly localPath = './uploads';
  private readonly reportPath = process.env.REPORT_PATH;
  constructor() {
    // ⚠️ Өмнө нь AWS_ACCESS_KEY-г бүтнээр нь stdout руу хэвлэдэг байсан (аудит) —
    // одоо зөвхөн set/MISSING гэсэн халхалсан мөр.
    console.log(`🗄️ object storage: ${describeObjectStorage(this.storage)}`);
    this.s3 = createS3Client(this.storage);
  }
  // constructor() {
  //   this.s3 = new AWS.S3({
  //     accessKeyId: process.env.AWS_ACCESS_KEY,
  //     secretAccessKey: process.env.AWS_SECRET_KEY,
  //     region: process.env.AWS_REGION,
  //     s3ForcePathStyle: true,
  //     httpOptions: {
  //       timeout: 300000,
  //       connectTimeout: 15000,
  //     },
  //   });
  // }
  async massRenameWithReportPrefix() {
    if (isSafeMode()) {
      safeLog('S3 massRename алгасав');
      return { success: false, message: 'SAFE_MODE: S3 өөрчлөлт хийгдээгүй' };
    }
    let continuationToken: string | undefined;

    do {
      const listRes = await this.s3
        .listObjectsV2({
          Bucket: this.bucketName,
          ContinuationToken: continuationToken,
        })
        .promise();

      if (!listRes.Contents) break;

      for (const obj of listRes.Contents) {
        const key = obj.Key;
        if (!key || key.endsWith('/')) continue;

        const fileName = key.split('/').pop();
        if (!fileName) continue;

        // ❌ 1. IMAGE бол шууд skip
        if (/\.(png|jpg|jpeg|webp)$/i.test(fileName)) {
          console.log('[SKIP - image]', key);
          continue;
        }

        /**
         * CASE A: report- эхэлсэн
         */
        if (fileName.startsWith('report-')) {
          // ✅ report-ТОO → хэвээр
          if (/^report-\d+(\.|$)/.test(fileName)) {
            console.log('[OK - numeric report]', key);
            continue;
          }

          // 🔁 report-code.pdf → report-code
          const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
          const newKey = key.replace(fileName, nameWithoutExt);

          console.log('[RENAME FIX]', key, '→', newKey);

          await this.s3
            .copyObject({
              Bucket: this.bucketName,
              CopySource: `${this.bucketName}/${key}`,
              Key: newKey,
            })
            .promise();

          await this.s3
            .deleteObject({
              Bucket: this.bucketName,
              Key: key,
            })
            .promise();

          continue;
        }

        /**
         * CASE B: report- байхгүй
         * ЗӨВХӨН цэвэр тоо байвал report- нэмнэ
         * 123.pdf ✅
         * 123_abc.pdf ❌
         */
        if (/^\d+(\.|$)/.test(fileName)) {
          const newKey = key.replace(fileName, `report-${fileName}`);
          console.log('[RENAME ADD]', key, '→', newKey);

          await this.s3
            .copyObject({
              Bucket: this.bucketName,
              CopySource: `${this.bucketName}/${key}`,
              Key: newKey,
            })
            .promise();

          await this.s3
            .deleteObject({
              Bucket: this.bucketName,
              Key: key,
            })
            .promise();

          continue;
        }

        // ❌ бусад бүх формат
        console.log('[SKIP - invalid format]', key);
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    return {
      success: true,
      message: 'Mass rename completed with strict rules',
    };
  }

  async dryRunRenameWithReportPrefix() {
    if (isSafeMode()) {
      safeLog('S3 dryRun алгасав');
      return { success: false, message: 'SAFE_MODE: S3 уншилт хийгдээгүй' };
    }
    let continuationToken: string | undefined;
    console.log('start');
    do {
      const listRes = await this.s3
        .listObjectsV2({
          Bucket: this.bucketName,
          // Prefix: this.reportPath,
          ContinuationToken: continuationToken,
        })
        .promise();
      if (!listRes.Contents) break;

      for (const obj of listRes.Contents) {
        const key = obj.Key;
        if (!key) continue;

        if (key.endsWith('/')) continue;

        const fileName = key.split('/').pop();
        if (!fileName) continue;

        // аль хэдийн report- байвал алгасна
        if (fileName.startsWith('report-')) {
          // console.log('[SKIP]', key);
          continue;
        }

        const newKey = key.replace(fileName, `report-${fileName}`);

        console.log('[DRY-RUN]', key, '→', newKey);
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    return {
      success: true,
      message: 'Dry-run completed. No files were changed.',
    };
  }
  async upload(key: string, ct: string, body) {
    console.log(key);

    // Local disk-рүү ЯМАГТ бичнэ — S3 амжилтгүй болсон ч (сүлжээ/эрх зэрэг
    // шалтгаанаар) getFile()-ийн local unshtn уншилт ажиллаж чадах ёстой.
    // Өмнө нь S3 upload-ын try/catch-ийн ДОТОР байрлаж байсан тул S3 throw
    // хийвэл local бичилт бүр хийгдэхгүй өнгөрдөг байсан — Зураг блокийн
    // upload хийсэн зураг "олдсонгүй" (404) болж харагдах шалтгаан нь энэ байсан.
    try {
      mkdirSync(this.localPath, { recursive: true });
      const localFilePath = resolveInside(this.localPath, key);
      writeFileSync(localFilePath, body);
    } catch (error) {
      console.log('local write failed', error);
    }

    if (isSafeMode()) {
      safeLog('S3 upload алгасав (local uploads/-д л хадгалсан)', key);
      return `${key}`;
    }
    if (!this.s3Configured()) {
      // Storage тохируулаагүй (local dev / туршилт) — local uploads/ хангалттай.
      return `${key}`;
    }
    try {
      await this.s3
        .upload({
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: ct,
        })
        .promise();
    } catch (error) {
      console.log('s3 upload failed', error);
    }

    // Add public S3 URL
    const fileUrl = `${key}`;
    return fileUrl;
  }
  /**
   * Assessment bundle-ийн экспорт: файлын агуулгыг local `uploads/`-оос, байхгүй
   * бол S3-аас уншина. Олдохгүй (эсвэл түлхүүр буруу) бол null.
   */
  async readBytes(key: string): Promise<Buffer | null> {
    try {
      const p = resolveInside(this.localPath, key);
      if (existsSync(p)) return readFileSync(p);
    } catch {
      return null;
    }
    if (!this.s3Configured()) return null;
    return await this.downloadFromS3(key);
  }

  /** Assessment bundle-ийн импорт: ижил түлхүүртэй файл аль хэдийн байгаа эсэх (local → S3). */
  async exists(key: string): Promise<boolean> {
    try {
      if (existsSync(resolveInside(this.localPath, key))) return true;
    } catch {
      return false;
    }
    if (!this.s3Configured()) return false;
    try {
      await this.s3.headObject({ Bucket: this.bucketName, Key: key }).promise();
      return true;
    } catch {
      return false;
    }
  }

  // S3 тохируулаагүй (local dev, SAFE_MODE) үед SDK EC2-metadata руу оролдож
  // удахаас сэргийлнэ.
  private s3Configured(): boolean {
    return !isSafeMode() && isObjectStorageConfigured(this.storage);
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
    const filePath = resolveInside(this.localPath, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }
    const size = statSync(filePath).size;
    return { path: filePath, size };
  }
  async getFile(filename: string): Promise<StreamableFile> {
    try {
      const filePath = resolveInside(this.localPath, filename);
      if (!existsSync(filePath)) {
        throw new NotFoundException('not found ');
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
    if (isSafeMode()) return null;
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ S3 download error:', errorMessage);
      return null;
    }
  }
  async getReport(filename: string) {
    try {
      const response = await axios.get(
        `${process.env.REPORT}file/${filename}`,
        {
          responseType: 'stream',
          timeout: 30000,
          headers: {
            Connection: 'close', // keep-alive issue-с сэргийлнэ
          },
        },
      );

      return response;
    } catch (e: any) {
      console.error('REPORT FETCH ERROR:', e.code, e.message);

      if (e.code === 'ECONNRESET') {
        console.log('Retrying report fetch...');
        // ⚠ Энэ retry дуудлага өмнө нь try/catch-гүй байсан тул амжилтгүй
        // бол getReport()-оос catch-гүйгээр дээш шидэгдэж, requestPdf
        // controller-т барихгүй, эцсийн хэрэглэгчид ил тод 500 болж
        // харагддаг байсан. Одоо бусад алдаатай адил чимээгүй null буцаана
        // — дуудагч тал (ExamController.requestPdf) үүнийг "File not
        // found" 404 болгож зөв боловсруулна.
        try {
          return await axios.get(`${process.env.REPORT}file/${filename}`, {
            responseType: 'stream',
            timeout: 30000,
            headers: { Connection: 'close' },
          });
        } catch (retryErr: any) {
          console.error(
            'REPORT FETCH RETRY ERROR:',
            retryErr.code,
            retryErr.message,
          );
          return null;
        }
      }

      return null;
    }
  }
}
