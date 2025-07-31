import { Injectable } from '@nestjs/common';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
  colors,
  footer,
  info,
  marginX,
  title10,
} from 'src/app/exam/reports/formatter';
import { SinglePdf } from 'src/app/exam/reports/single.pdf';

@Injectable()
export class SingleTemplate {
  constructor(private single: SinglePdf) {}
  async template(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    exam: ExamEntity,
  ) {
    title10(doc, result.firstname, result.lastname, result.assessmentName);
    info(
      doc,
      exam.assessment.author,
      exam.assessment.description,
      exam.assessment.measure,
      exam.assessment.usage,
    );

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

    doc.y;

    await this.single.default(doc, result);
    footer(doc);
    doc.addPage();
    title10(doc, result.firstname, result.lastname, result.assessmentName);

    await this.single.examQuartile(doc, result);
    footer(doc);
  }
}
