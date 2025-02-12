import { Injectable } from '@nestjs/common';
import { TextOptionsLight, jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { index, TableOptions, TextOptions } from './pdf.interface';
import PdfPrinter from 'pdfmake';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument from 'pdfkit';
import {
  assetPath,
  colors,
  dateFormatter,
  fontBold,
  fontNormal,
  footer,
  header,
  home,
  marginX,
  marginY,
} from './reports/formatter';
import { SinglePdf } from './reports/single.pdf';
import { AssessmentEntity } from '../assessment/entities/assessment.entity';
import { ExamEntity } from './entities/exam.entity';

const fonts = {
  CIP: {
    bold: path.join(__dirname, '../../../src/assets/fonts/GIP-ExtraBold.woff'),
    boldItalics: path.join(
      __dirname,
      '../../../src/assets/fonts/GIP-ExtraBoldItalic.woff',
    ),
    normal: path.join(__dirname, '../../../src/assets/fonts/GIP-Medium.woff'),
    italics: path.join(
      __dirname,
      '../../../src/assets/fonts/GIP-MediumItalic.woff',
    ),
  },
};

@Injectable()
export class PdfService {
  constructor(
    private vis: VisualizationService,
    private single: SinglePdf,
  ) {}

  async generateImage(html: string) {
    const image = await nodeHtmlToImage({
      html: html.toString(),
      puppeteerArgs: {
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--lang=en-US',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
    });

    return await image;
  }

  async createDefaultPdf(): Promise<PDFKit.PDFDocument> {
    const doc = new PDFDocument({
      margins: {
        left: marginX,
        right: marginX,
        top: marginY,
        bottom: marginY - 10,
      },
      size: 'A4',
    });

    const normal = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-Medium.ttf'),
    );
    const bold = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-ExtraBold.ttf'),
    );
    doc.registerFont(fontNormal, normal);
    doc.registerFont(fontBold, bold);
    home(doc, 'Адъяа', 'Өсөхбаяр', 'Багийн дүрийг тодорхойлох тест');
    doc.addPage();
    return doc;
  }

  async createPdfInOneFile(assessment: AssessmentEntity, exam: ExamEntity) {
    const name = `${exam.lastname} ${exam.firstname}`;
    const buffer = await this.vis.createChart();
    // const buffer2: any = await this.generateImage(htmlCode);
    // console.log(buffer2);
    const filePath = './chart.pdf';
    const out = fs.createWriteStream(filePath);
    const doc = await this.createDefaultPdf();
    header(doc);
    doc.moveDown(5);

    doc.font(fontNormal).fontSize(14).text('Шалгуулагч', {
      align: 'left',
    });
    doc.moveUp(1);
    doc.fontSize(14).text('Тест өгсөн огноо', {
      align: 'right',
    });
    doc.font(fontBold).fontSize(14).text(name, {
      align: 'left',
    });
    doc.moveUp(1);
    const date = new Date(exam.userStartDate);

    doc.fontSize(14).text(`${dateFormatter(date)}`, {
      align: 'right',
    });
    doc.moveDown(1);
    doc
      .font(fontBold)
      .fontSize(20)
      .fillColor(colors.orange)
      .text(assessment.name);
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(230, doc.y)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(14)
      .text(
        'Багт оруулж буй хувь нэмрээ таньж мэдсэнээр багийн гүйцэтгэлийг нэмэгдүүлэх, сайжруулах, багийн үйл ажиллагааг төгөлдөржүүлэх боломжийг олгоно.',
      )
      .moveDown();
    doc.font(fontBold).text('Хэмжих зүйлс').moveDown(1);

    doc
      .font(fontNormal)
      .text(
        'Хамтын ажиллагаа, Харилцаа, Шийдвэр гаргалт, Асуудал шийдвэрлэх, Дасан зохицох, Уян хатан байдал',
      )
      .moveDown(1);
    doc.font(fontBold).fontSize(16).fillColor(colors.orange).text('Үр дүн');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();

    this.single.default(doc, assessment, exam);
    footer(doc);
    doc.pipe(out);

    // doc.image(buffer, { width: 260 });
    // doc.image(buffer2, 50, 400, { width: 260 });
    doc.end();

    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    return filePath;
  }
}
