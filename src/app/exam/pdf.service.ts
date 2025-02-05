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
  colors,
  fontBold,
  fontNormal,
  marginX,
  marginY,
} from './reports/formatter';
import { SinglePdf } from './reports/single.pdf';

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
  path(p: string) {
    const imagePath = path.join(__dirname, `../../../src/assets/${p}.png`);
    return fs.readFileSync(imagePath);
  }

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
    doc.image(this.path('logo'), marginX, marginY, {
      width: 70,
    });
    doc.image(this.path('top'), 0, 0, {
      width: doc.page.width,
    });
    return doc;
  }

  async createPdfInOneFile() {
    const name = 'Адъяа Өсөхбаяр';
    const buffer = await this.vis.createChart();
    // const buffer2: any = await this.generateImage(htmlCode);
    // console.log(buffer2);
    const filePath = './chart.pdf';
    const out = fs.createWriteStream(filePath);
    const doc = await this.createDefaultPdf();
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
    const date = new Date();
    doc
      .fontSize(14)
      .text(`${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`, {
        align: 'right',
      });
    doc.moveDown(2);

    doc.moveDown(1);
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

    let y = doc.y;

    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(14)
      .text('Тестийг ', doc.x, y, { continued: true })
      .font(fontBold)
      .fillColor(colors.orange)
      .fontSize(18)
      .text('25 ', doc.x, y - 2, { continued: true })
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(14)
      .text('минутад гүйцэтгэсэн', doc.x, y + 2)
      .fontSize(14)
      .text('(Боломжит ', { continued: true })
      .font(fontBold)
      .fontSize(18)
      .text('30 ', doc.x, doc.y - 2, { continued: true })
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(14)
      .text('минут)', doc.x, doc.y + 2, { continued: false });

    doc.image(this.path('icons/time'), doc.x + 150, y + 15);

    // pie chart
    const pie = await this.vis.doughnut(colors.grey, colors.orange);
    const center = doc.page.width / 2;
    doc.image(pie, center + center - 168, y - 10, { width: 60 });
    doc.text('Нийт оноо', center, y, { align: 'right' });
    doc
      .moveTo(center, doc.y)
      .font(fontBold)
      .fontSize(32)
      .fillColor(colors.orange)
      .text('31', center + center - 100, doc.y, {
        // align: 'right',
        continued: true,
      })
      .fontSize(24)
      .fillColor(colors.black)
      .text('/50', doc.x, doc.y + 4, { continued: false });
    doc.moveDown(2);
    [8, 5, 10, 8, 0].map((v, i) => {
      this.single.section(doc, `${i + 1}-р хэсэг`, 10, v);
    });
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
