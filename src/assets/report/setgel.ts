import { Injectable } from '@nestjs/common';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
  colors,
  fontBold,
  fontNormal,
  footer,
  header,
  info,
  lh,
  marginX,
  title,
} from 'src/app/exam/reports/formatter';
import { SinglePdf } from 'src/app/exam/reports/single.pdf';
@Injectable()
export class Setgel {
  constructor(private single: SinglePdf) {}

  async template(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    exam: ExamEntity,
  ) {
    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
    info(doc, exam.assessment.author, exam.assessment.description);
    doc
      .font('fontBold')
      .fontSize(16)
      .fillColor(colors.orange)
      .text('Үр дүн', marginX, doc.y + 10);
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(100, doc.y + 2)
      .stroke()
      .moveDown();

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Таны сэтгэл ханамж, амьдралын идэвх, нойр, хоолны дуршил, анхаарал төвлөрөл, өөрийгөө үнэлэх байдал зэрэг сэтгэл гутралын 9 үндсэн шинж тэмдгийг хэмжин оноо өгвөл:',
        { align: 'justify' },
      )
      .moveDown(1);

    let levelLabel = '';

    if (Number(result.point) <= 4) {
      levelLabel = 'Бараг байхгүй';
    } else if (Number(result.point) <= 9) {
      levelLabel = 'Энгийн, сэтгэл гутрал бараг үгүй';
    } else if (Number(result.point) <= 14) {
      levelLabel = 'Хөнгөн сэтгэл гутрал';
    } else if (Number(result.point) <= 19) {
      levelLabel = 'Дунд зэргийн сэтгэл гутрал';
    } else {
      levelLabel = 'Дундаас дээш зэргийн сэтгэл гутрал';
    }

    doc
      .fillColor(colors.orange)
      .font('fontBlack')
      .fontSize(28)
      .text(`${result.point ?? ''}`, doc.x, doc.y, { continued: true })
      .fontSize(12)
      .font(fontNormal)
      .fillColor(colors.black)
      .text('  оноо буюу  ', doc.x, doc.y + 11.35, {
        continued: true,
      })
      .font('fontBlack')
      .fontSize(16);
    doc
      .fillColor(colors.orange)
      .text(levelLabel.toUpperCase(), doc.x, doc.y - 2.5)
      .moveDown(-0.5);

    await this.single.examQuartileGraph(doc, result);
    doc
      .font(fontBold)
      .fontSize(13)
      .text('Зөвлөмж', marginX, doc.y)
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хэрэв та 10-с дээш оноо авсан бол мэргэжлийн тусламж, үйлчилгээнд хамрагдахыг зөвлөж байна.',
        { align: 'justify' },
      );
    footer(doc);
  }
}
