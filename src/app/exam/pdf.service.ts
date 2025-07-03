import { Injectable } from '@nestjs/common';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument from 'pdfkit';
import {
  fontBold,
  fontNormal,
  home,
  marginX,
  marginY,
} from './reports/formatter';
import { ExamEntity } from './entities/exam.entity';
import { ReportType } from 'src/base/constants';
import { DISC } from 'src/assets/report/disc';
import { ResultEntity } from './entities/result.entity';
import { Belbin } from 'src/assets/report/belbin';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { Genos } from 'src/assets/report/genos';
import { Narc } from 'src/assets/report/narc';
import { Empathy } from 'src/assets/report/empathy';
import { SingleTemplate } from 'src/assets/report/single';
import { Setgel } from 'src/assets/report/setgel';

@Injectable()
export class PdfService {
  constructor(
    private disc: DISC,
    private genos: Genos,
    private narc: Narc,
    private belbin: Belbin,
    private empathy: Empathy,
    private setgel: Setgel,
    private singleTemplate: SingleTemplate,
    private userAnswer: UserAnswerDao,
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

  async createDefaultPdf(
    lastname: string,
    firstname: string,
    title: string,
    code: number,
  ): Promise<PDFKit.PDFDocument> {
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
    const medium = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-Bold.ttf'),
    );
    const bold = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-ExtraBold.ttf'),
    );
    const black = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-Black.ttf'),
    );
    doc.registerFont(fontNormal, normal);
    doc.registerFont('fontNormal', normal);
    doc.registerFont('fontMedium', medium);
    doc.registerFont(fontBold, bold);
    doc.registerFont('fontBold', bold);
    doc.registerFont('fontBlack', black);

    home(doc, lastname, firstname, title, code);
    doc.addPage();
    return doc;
  }

  async createPdfInOneFile(result: ResultEntity, exam: ExamEntity) {
    const firstname = result?.firstname ?? '';
    const lastname = result?.lastname ?? '';
    const doc = await this.createDefaultPdf(
      result?.lastname ?? '',
      result?.firstname ?? '',
      result?.assessmentName,
      result.code,
    );
    try {
      const date = new Date(exam.userStartDate);
      if (exam.assessment.report == ReportType.CORRECT)
        await this.singleTemplate.template(doc, result, exam);
      if (exam.assessment.report == ReportType.SETGEL)
        await this.setgel.template(doc, result, firstname, lastname, exam);
      if (exam.assessment.report == ReportType.EMPATHY)
        await this.empathy.template(doc, result, firstname, lastname, exam);
      if (exam.assessment.report == ReportType.DISC) {
        await this.disc.report(
          doc,
          result,
          firstname,
          lastname,
          exam.code,
          exam.assessment,
          this.userAnswer,
        );
      }

      if (exam.assessment.report == ReportType.BELBIN) {
        await this.belbin.template(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.assessment,
        );
      }

      if (exam.assessment.report == ReportType.GENOS) {
        await this.genos.template(
          doc,
          result,
          firstname,
          lastname,
          exam.assessment,
        );
      }

      if (exam.assessment.report == ReportType.NARC) {
        await this.narc.template(
          doc,
          result,
          firstname,
          lastname,
          exam.assessment,
        );
      }
      return doc;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate PDF');
    }
  }
}
