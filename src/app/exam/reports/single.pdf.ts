import { Injectable } from '@nestjs/common';
import {
  assetPath,
  colors,
  firstLetterUpper,
  fontBold,
  fontNormal,
  marginX,
} from './formatter';
import { QuestionCategoryDao } from 'src/app/question/dao/question.category.dao';
import { VisualizationService } from '../visualization.service';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ExamEntity } from '../entities/exam.entity';
import { UserAnswerDao } from 'src/app/user.answer/user.answer.dao';
import { ExamDao } from '../dao/exam.dao';
import { ResultEntity } from '../entities/result.entity';
import { ResultDao } from '../dao/result.dao';
import { color } from 'echarts';

@Injectable()
export class SinglePdf {
  constructor(
    private answer: UserAnswerDao,
    private exam: ExamDao,
    private result: ResultDao,
    private vis: VisualizationService,
  ) {}
  async section(
    doc: PDFKit.PDFDocument,
    name: string,
    max: number,
    value: number,
  ) {
    const x = marginX;
    const y = doc.y;
    const center = doc.page.width / 2;
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(12)
      .text(name, marginX, y, { align: 'left' });

    doc.font('fontBlack').fontSize(15).fillColor(colors.black);
    const widthOfMax = doc.widthOfString(`/${max}`);
    doc.text(`/${max}`, x - marginX, y - 1.5, {
      align: 'right',
    });

    const widthOfValue = doc.widthOfString(`${value}`);
    doc
      .fontSize(20)
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
      .fill(colors.nonprogress);
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

    doc.fontSize(12).moveDown(1);
    return;
  }

  list(doc: PDFKit.PDFDocument, title: string, value: string) {
    doc.font(fontNormal).fillColor(colors.black).fontSize(12);
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

  async default(doc: PDFKit.PDFDocument, result: ResultEntity) {
    try {
      let duration = result.duration;

      let y = doc.y;
      const pie = await this.vis.doughnut(
        colors.nonprogress,
        result.total,
        result.point,
      );
      const width = (doc.page.width - marginX * 2) / 2;
      doc.image(pie, doc.x, y, { width: width });

      const percentage = Math.round((result.point / result.total) * 100);
      const percentageText = `${percentage}%`;

      doc.fontSize(28);
      const numberWidth = doc.widthOfString(`${percentage}`);

      doc.fontSize(21);
      const percentWidth = doc.widthOfString('%');

      const totalWidth = numberWidth + percentWidth;
      const xPosition = doc.x + width / 2 - totalWidth / 2;
      const yPosition = y + width / 2 - 38;

      doc
        .font('fontBlack')
        .fillColor(colors.orange)
        .fontSize(28)
        .text(`${percentage}`, xPosition, yPosition, { continued: true })
        .fontSize(21)
        .text('%', doc.x, yPosition + 5);

      doc
        .image(
          assetPath('icons/clock'),
          doc.page.width - marginX * 1.5 - 5,
          y - 5,
          {
            width: 24,
            align: 'right',
          },
        )
        .moveDown(1);

      doc.y;

      doc.font(fontNormal).fillColor(colors.black).fontSize(12);
      const durationWidth = doc.widthOfString(
        `Тестийг ${result.duration == 0 ? 1 : result.duration} минутад гүйцэтгэсэн`,
      );
      doc
        .text(
          'Тестийг ',
          doc.page.width - marginX - durationWidth - 4,
          y + 27,
          {
            continued: true,
          },
        )
        .font('fontBlack')
        .fillColor(colors.orange)
        .fontSize(15)
        .text(`${result.duration == 0 ? 1 : result.duration} `, doc.x, y + 25, {
          continued: true,
        })
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(12)
        .text('минутад гүйцэтгэсэн', doc.x, y + 27)
        .fontSize(12)
        .moveDown(0.2);
      if (duration && duration != 0) {
        const possibleWidth = doc.widthOfString(
          `(Боломжит ${duration ?? 0} минут)`,
        );
        doc
          .text(
            '(Боломжит ',
            doc.page.width - marginX - possibleWidth - 4,
            doc.y,
            { continued: true },
          )
          .font('fontBlack')
          .fontSize(15)
          .text(`${duration ?? 0} `, doc.x, doc.y - 2, { continued: true })
          .font(fontNormal)
          .fillColor(colors.black)
          .fontSize(12)
          .text('минут)', doc.x, doc.y + 2)
          .moveDown(0.7);
      } else {
        doc.moveDown(0.3);
      }
      doc
        .moveTo(doc.page.width - marginX - 75, doc.y)
        .strokeColor(colors.orange)
        .lineTo(doc.page.width - marginX, doc.y)
        .stroke()
        .moveDown(0.7);
      doc.text('Нийт оноо', { align: 'right' });

      doc.font('fontBlack').fontSize(28);
      const widthResult = doc.widthOfString(`${result.point}`);
      doc.fontSize(21);
      const widthTotal = doc.widthOfString(`/${result.total}`);
      doc.fontSize(28);
      y = doc.y;
      doc
        .fillColor(colors.orange)
        .text(
          `${result.point ?? ''}`,
          doc.page.width - marginX - widthResult - widthTotal - 4,
          y,
          {
            // align: 'right',
            continued: true,
          },
        );
      doc
        .fontSize(21)
        .fillColor(colors.black)
        .text(`/${result.total}`, doc.x + 2, y + 5, {
          continued: false,
        });
      doc.moveDown(1);

      y = doc.y;
      // doc
      //   .font(fontBold)
      //   .fontSize(16)
      //   .fillColor(colors.orange)
      //   .text('Давуу талууд', marginX, y);
      // doc.text('Анхаарах нь', doc.x, y, {
      //   align: 'right',
      // });
      // y = doc.y;

      // doc
      //   .moveTo(marginX, y)
      //   .strokeColor(colors.orange)
      //   .lineTo(84, doc.y)
      //   .stroke();
      // doc
      //   .moveTo(doc.page.width - marginX, y)
      //   .strokeColor(colors.orange)
      //   .lineTo(doc.page.width - marginX - 84, y)
      //   .stroke();
      // doc.moveDown();
      // [
      //   {
      //     title: 'Давуу тал 1',
      //     value: 'Хөгжүүлэх шаардлагатай чадвар 1',
      //   },
      //   {
      //     title: 'Давуу тал 2',
      //     value: 'Хөгжүүлэх шаардлагатай чадвар 2',
      //   },
      //   {
      //     title: 'Давуу тал 3',
      //     value: 'Хөгжүүлэх шаардлагатай чадвар 3',
      //   },
      // ].map((e) => {
      //   this.list(doc, e.title, e.value);
      // });
    } catch (error) {
      console.log(error);
    }
  }
  async examQuartile(doc: PDFKit.PDFDocument, result: ResultEntity) {
    function calculateMean(data) {
      return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    function calculateStdDev(data, mean) {
      const variance =
        data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        data.length;
      return Math.sqrt(variance);
    }

    function normalDistribution(x, mean, stdDev) {
      const exponent = Math.exp(
        -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)),
      );
      return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * exponent;
    }

    function percentile(data, value) {
      let count = 0;
      for (let num of data) {
        if (num <= value) count++;
      }
      return (count / data.length) * 100;
    }

    const dataset = await this.result.findQuartile(result.assessment);
    const mean = calculateMean(dataset);
    const stdDev = calculateStdDev(dataset, mean);

    const dataPoints = [];
    for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += 1) {
      dataPoints.push([x, normalDistribution(x, mean, stdDev) / 10]);
    }

    const percent = Math.round(percentile(dataset, result.point));
    const max = Math.max(...dataset);

    const width = doc.page.width - marginX * 2;

    const buffer = await this.vis.createChart(
      dataPoints,
      dataPoints[0]?.[0] ?? 0,
      dataPoints[dataPoints.length - 1]?.[0] ?? max,
      normalDistribution(result.point, mean, stdDev) / 10 - dataPoints[0][1],
      result.point,
      percent,
    );

    doc.image(buffer, marginX, doc.y + 10, {
      width: width,
      height: (width / 900) * 450,
    });

    const currentY = doc.y + (width / 900) * 450 + 20;

    const sectionName = result.assessmentName;
    const total = 'Нийт';
    const name = `${sectionName}`;

    const totalWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(total);

    const nameWidth = doc
      .font(fontBold)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(name);

    const row1Width = totalWidth + nameWidth + 8;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(total, doc.page.width - marginX - row1Width, currentY);

    doc
      .font(fontBold)
      .fontSize(12)
      .fillColor('#231F20')
      .text(
        name,
        doc.page.width - marginX - row1Width + totalWidth + 3,
        currentY,
      );
    const percentPrefix = 'гүйцэтгэгчдийн ';
    const percentText = `${percent}%`;
    const percentSuffix = '-г давсан';

    const prefixWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(percentPrefix);

    const percentWidth = doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor('#F36421')
      .widthOfString(percentText);

    const suffixWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(percentSuffix);

    const row2TotalWidth = prefixWidth + percentWidth + suffixWidth + 10;

    let textX = doc.page.width - marginX - row2TotalWidth;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(percentPrefix, textX, currentY + 18);

    textX += prefixWidth + 3;
    doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor('#F36421')
      .text(percentText, textX, currentY + 14);

    textX += percentWidth + 1;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(percentSuffix, textX, currentY + 18);

    doc.y = currentY + 50;

    doc
      .font('fontBold')
      .fontSize(16)
      .fillColor('#F36421')
      .text('Дэлгэрэнгүй үр дүн', marginX, doc.y);

    doc
      .moveTo(marginX, doc.y + 2)
      .strokeColor('#F36421')
      .lineTo(75, doc.y + 2)
      .stroke()
      .moveDown();

    const res = await this.answer.partialCalculator(result.code, result.type);
    console.log(res);
    res.map((v, i) => {
      console.log(v);

      this.section(doc, v.categoryName, v.totalPoint, v.point);
    });
  }

  async examQuartileGraph(doc: PDFKit.PDFDocument, result: ResultEntity) {
    function calculateMean(data) {
      return data.reduce((sum, val) => sum + val, 0) / data.length;
    }

    function calculateStdDev(data, mean) {
      const variance =
        data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        data.length;
      return Math.sqrt(variance);
    }

    function normalDistribution(x, mean, stdDev) {
      const exponent = Math.exp(
        -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)),
      );
      return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * exponent;
    }

    function percentile(data, value) {
      let count = 0;
      for (let num of data) {
        if (num <= value) count++;
      }
      return (count / data.length) * 100;
    }

    const dataset = await this.result.findQuartile(result.assessment);
    const mean = calculateMean(dataset);
    const stdDev = calculateStdDev(dataset, mean);

    const dataPoints = [];
    for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += 1) {
      dataPoints.push([x, normalDistribution(x, mean, stdDev) / 10]);
    }

    const percent = Math.round(percentile(dataset, result.point));
    const max = Math.max(...dataset);

    const width = doc.page.width - marginX * 2;

    const buffer = await this.vis.createChart(
      dataPoints,
      dataPoints[0]?.[0] ?? 0,
      dataPoints[dataPoints.length - 1]?.[0] ?? max,
      normalDistribution(result.point, mean, stdDev) / 10 - dataPoints[0][1],
      result.point,
      percent,
    );

    doc.image(buffer, marginX, doc.y + 10, {
      width: width,
      height: (width / 900) * 450,
    });

    const currentY = doc.y + (width / 900) * 450 + 20;

    const sectionName = result.assessmentName;
    const total = 'Таны оноо нь нийт';
    const name = `${sectionName}`;

    const totalWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(total);

    const nameWidth = doc
      .font(fontBold)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(name);

    const row1Width = totalWidth + nameWidth + 8;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(total, doc.page.width - marginX - row1Width, currentY);

    doc
      .font(fontBold)
      .fontSize(12)
      .fillColor('#231F20')
      .text(
        name,
        doc.page.width - marginX - row1Width + totalWidth + 3,
        currentY,
      );
    const percentPrefix = 'гүйцэтгэгчдийн ';
    const percentText = `${percent}%`;
    const percentSuffix = '-с өндөр байна.';

    const prefixWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(percentPrefix);

    const percentWidth = doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor('#F36421')
      .widthOfString(percentText);

    const suffixWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .widthOfString(percentSuffix);

    const row2TotalWidth = prefixWidth + percentWidth + suffixWidth + 10;

    let textX = doc.page.width - marginX - row2TotalWidth;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(percentPrefix, textX, currentY + 18);

    textX += prefixWidth + 3;
    doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor('#F36421')
      .text(percentText, textX, currentY + 14);

    textX += percentWidth + 1;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor('#231F20')
      .text(percentSuffix, textX, currentY + 18);

    doc.y = currentY + 50;
  }
}
