import { Injectable } from '@nestjs/common';
import { assetPath, colors, fontBold, fontNormal, marginX } from './formatter';
import { QuestionCategoryDao } from 'src/app/question/dao/question.category.dao';
import { VisualizationService } from '../visualization.service';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ExamEntity } from '../entities/exam.entity';
import { UserAnswerDao } from 'src/app/user.answer/user.answer.dao';

@Injectable()
export class SinglePdf {
  constructor(
    private answer: UserAnswerDao,
    private vis: VisualizationService,
  ) {}
  async section(
    doc: PDFKit.PDFDocument,
    name: string,
    max: number,
    value: number,
  ) {
    const x = doc.x;
    const y = doc.y;
    const center = doc.page.width / 2;
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(14)
      .text(name, marginX, y, { align: 'left' });

    doc.font(fontBold).fontSize(20).fillColor(colors.black);
    const widthOfMax = doc.widthOfString(`/${max}`);
    doc.text(`/${max}`, x - marginX, y - 3, {
      align: 'right',
    });

    const widthOfValue = doc.widthOfString(`${value}`);
    doc
      .fontSize(24)
      .fillColor(colors.orange)
      .text(
        `${value}`,
        doc.page.width - widthOfMax - widthOfValue - 4 - marginX,
        y - 5,
        {
          // align: 'right',
        },
      );
    doc
      .roundedRect(doc.page.width - 150 - marginX, y + 3, 80, 8, 10)
      .fill(colors.grey);
    doc
      .roundedRect(
        doc.page.width - 150 - marginX,
        y + 3,
        (80 / max) * value,
        8,
        10,
      )
      .fill(colors.orange);
    doc
      .moveTo(marginX, doc.y)
      .strokeColor(colors.light)
      .lineTo(doc.page.width - marginX, doc.y)
      .stroke();

    doc.fontSize(14).moveDown();
    return;
  }

  list(doc: PDFKit.PDFDocument, title: string, value: string) {
    doc.font(fontNormal).fillColor(colors.black).fontSize(14);
    const y = doc.y;
    doc.text(title, doc.x, y, {
      bulletRadius: 0.01,
      listType: 'bullet',
    });
    doc.text(value, doc.x, y, {
      align: 'right',
      listType: 'bullet',
      bulletRadius: 0.01,
    });
    return;
  }

  async default(
    doc: PDFKit.PDFDocument,
    assessment: AssessmentEntity,
    exam: ExamEntity,
  ) {
    try {
      const diff = Math.floor(
        (Date.parse(exam.userEndDate.toString()) -
          Date.parse(exam.userStartDate.toString())) /
          60000,
      );
      let duration = assessment.duration;

      let y = doc.y;

      doc
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(14)
        .text('Тестийг ', doc.x, y, { continued: true })
        .font(fontBold)
        .fillColor(colors.orange)
        .fontSize(18)
        .text(`${diff == 0 ? 1 : diff} `, doc.x, y - 2, { continued: true })
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(14)
        .text('минутад гүйцэтгэсэн', doc.x, y + 2)
        .fontSize(14);

      if (duration && duration != 0) {
        doc
          .text('(Боломжит ', { continued: true })
          .font(fontBold)
          .fontSize(18)
          .text('30 ', doc.x, doc.y - 2, { continued: true })
          .font(fontNormal)
          .fillColor(colors.black)
          .fontSize(14)
          .text('минут)', doc.x, doc.y + 2, { continued: false })
          .image(assetPath('icons/time'), doc.x + 150, y + 15, { width: 18 });
      }
      // pie chart
      const pie = await this.vis.doughnut(
        colors.grey,
        colors.orange,
        assessment.totalPoint,
        parseInt(exam.result),
      );
      const center = doc.page.width / 2;
      doc.image(pie, center + center - 168, y - 10, { width: 50 });
      doc.text('Нийт оноо', center, y - 10, { align: 'right' });
      doc.moveTo(center, doc.y);
      doc.font(fontBold).fontSize(32);
      const widthResult = doc.widthOfString(exam.result);
      doc.fontSize(24);
      const widthTotal = doc.widthOfString(`/${assessment.totalPoint}`);
      doc.fontSize(32);
      y = doc.y;
      doc
        .fillColor(colors.orange)
        .text(
          exam.result,
          center + center - marginX - widthResult - widthTotal - 8,
          y,
          {
            // align: 'right',
            continued: true,
          },
        );
      doc
        .fontSize(24)
        .fillColor(colors.black)
        .text(
          `/${assessment.totalPoint}`,
          center + center - marginX - widthTotal,
          y + 4,
          {
            continued: false,
          },
        );
      doc.moveDown(1);
      // if (assessment.partialScore) {
      const res = await this.answer.partialCalculator(exam.id);
      res.map((v, i) => {
        this.section(doc, v.categoryName, v.totalPoint, v.point);
      });
      // }

      y = doc.y;
      doc
        .font(fontBold)
        .fontSize(16)
        .fillColor(colors.orange)
        .text('Давуу талууд', marginX, y);
      doc.text('Анхаарах нь', doc.x, y, {
        align: 'right',
      });
      y = doc.y;

      doc
        .moveTo(marginX, y)
        .strokeColor(colors.orange)
        .lineTo(84, doc.y)
        .stroke();
      doc
        .moveTo(doc.page.width - marginX, y)
        .strokeColor(colors.orange)
        .lineTo(doc.page.width - marginX - 84, y)
        .stroke();
      doc.moveDown();
      [
        {
          title: 'Давуу тал 1',
          value: 'Хөгжүүлэх шаардлагатай чадвар 1',
        },
        {
          title: 'Давуу тал 2',
          value: 'Хөгжүүлэх шаардлагатай чадвар 2',
        },
        {
          title: 'Давуу тал 3',
          value: 'Хөгжүүлэх шаардлагатай чадвар 3',
        },
      ].map((e) => {
        this.list(doc, e.title, e.value);
      });
    } catch (error) {
      console.log(error);
    }
  }
}
