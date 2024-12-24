import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
@Injectable()
export class AppService {
  constructor() {}

  async processImage(file: Express.Multer.File): Promise<string> {
    // const imageBuffer = file.buffer;

    let processImage = file.buffer;
    // if (file.mimetype.startsWith('image')) {
    //   processImage = await sharp(imageBuffer)
    //     .jpeg({
    //       quality: parseInt(
    //         (file.size > 2000000
    //           ? (2000000 / file.size) * 100 < 20
    //             ? 20
    //             : (2000000 / file.size) * 100
    //           : 100
    //         ).toString(),
    //       ),
    //     })
    //     .toBuffer();
    // }
    const uploadFolder = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadFolder))
      fs.mkdirSync(uploadFolder, { recursive: true });
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadFolder, fileName);
    fs.writeFileSync(filePath, processImage);
    return fileName;
  }
  async processMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        return await this.processImage(file);
      }),
    );

    return processedFiles;
  }
}
