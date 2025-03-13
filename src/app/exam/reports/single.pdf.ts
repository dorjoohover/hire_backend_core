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

  async default(doc: PDFKit.PDFDocument, result: ResultEntity) {
    try {
      let duration = result.duration;

      let y = doc.y;
      const pie = await this.vis.doughnut(
        colors.grey,
        colors.orange,
        result.total,
        result.point,
      );
      const width = (doc.page.width - marginX * 2) / 2;
      doc.image(pie, doc.x, y, { width: width });

      doc.font(fontNormal).fillColor(colors.black).fontSize(14);
      const durationWidth = doc.widthOfString(
        `Тестийг ${result.duration == 0 ? 1 : result.duration} минутад гүйцэтгэсэн`,
      );
      doc
        .text('Тестийг ', doc.page.width - marginX - durationWidth - 4, y, {
          continued: true,
        })
        .font(fontBold)
        .fillColor(colors.orange)
        .fontSize(18)
        .text(`${result.duration == 0 ? 1 : result.duration} `, doc.x, y - 2, {
          continued: true,
        })
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(14)
        .text('минутад гүйцэтгэсэн', doc.x, y)
        .fontSize(14);
      // if (duration && duration != 0) {
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
        .font(fontBold)
        .fontSize(18)
        .text(`${duration ?? 0} `, doc.x, doc.y - 2, { continued: true })
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(14)
        .text('минут)', doc.x, doc.y + 2);
      // }
      doc
        .moveTo(doc.page.width - marginX - 75, doc.y)
        .strokeColor(colors.red)
        .lineTo(doc.page.width - marginX, doc.y)
        .stroke()
        .moveDown();
      doc.text('Нийт оноо', { align: 'right' });

      doc.font(fontBold).fontSize(32);
      const widthResult = doc.widthOfString(`${result.point}`);
      doc.fontSize(24);
      const widthTotal = doc.widthOfString(`/${result.total}`);
      doc.fontSize(32);
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
        .fontSize(24)
        .fillColor(colors.black)
        .text(`/${result.total}`, doc.x + 2, y + 4, {
          continued: false,
        });
      doc.moveDown(1);
      // if (assessment.partialScore) {

      // }

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
    // data
    const dataset = await this.result.findQuartile(result.assessment);
    const mean = calculateMean(dataset);
    const stdDev = calculateStdDev(dataset, mean);

    // Compute percentiles
    // const p0 = dataset[Math.floor(0 * dataset.length)];
    // const p25 = dataset[Math.floor(0.25 * dataset.length)];
    // const p50 = dataset[Math.floor(0.5 * dataset.length)];
    // const p75 = dataset[Math.floor(0.75 * dataset.length)];
    // const p100 = dataset[dataset.length - 1];
    const dataPoints = [];
    for (let x = mean - 3 * stdDev; x <= mean + 3 * stdDev; x += 1) {
      dataPoints.push([x, normalDistribution(x, mean, stdDev) / 10]);
    }

    const percent = Math.round(percentile(dataset, result.point));

    // dataset.sort((a, b) => a - b); // Sort data
    const max = Math.max(...dataset);
    const width = doc.page.width - marginX - marginX;
    const buffer = await this.vis.createChart(
      dataPoints,
      dataPoints[0]?.[0] ?? 0,
      dataPoints[dataPoints.length - 1]?.[0] ?? max,
      normalDistribution(result.point, mean, stdDev) / 10 - dataPoints[0][1],
      result.point,
      percent,
      // [p0, p25, p50, p75, p100],
    );
    doc.image(buffer, { width: width, height: (width / 515) * 250 });
    doc.moveDown(1);
    let y = doc.y + (width / 515) * 250;
    doc
      .fillColor(colors.black)
      .font(fontNormal)
      .fontSize(14)
      .text('Нийт ', width / 2, y, {
        continued: true,
      })
      .font(fontBold)
      .text(firstLetterUpper(result.assessmentName), {
        continued: true,
      })
      .font(fontNormal)
      .text(' гүйцэтгэгчдийн', { continued: true })
      .font(fontBold)
      .fontSize(20)
      .fillColor(colors.orange);
    y = doc.y;

    doc.text(`${percent}%`, { continued: true }).fontSize(14);
    doc.y += 6;
    doc.fillColor(colors.black).font(fontNormal).text('-г давсан');
    doc.moveDown(3);
    doc
      .font(fontBold)
      .fontSize(16)
      .fillColor(colors.orange)
      .text('Дэлгэрэнгүй үр дүн', marginX, doc.y);
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();
    const res = await this.answer.partialCalculator(result.code);
    res.map((v, i) => {
      this.section(doc, v.categoryName, v.totalPoint, v.point);
    });
  }
}
