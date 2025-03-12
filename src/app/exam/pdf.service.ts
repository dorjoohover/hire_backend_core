import { Injectable } from '@nestjs/common';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument from 'pdfkit';
import {
  assetPath,
  colors,
  firstLetterUpper,
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
import { ReportType } from 'src/base/constants';
import { DISC } from 'src/assets/report/disc';
import { ResultDao } from './dao/result.dao';
import { ResultEntity } from './entities/result.entity';
import { ResultDetailEntity } from './entities/result.detail.entity';

@Injectable()
export class PdfService {
  constructor(
    private vis: VisualizationService,
    private single: SinglePdf,
    private disc: DISC,
    private resultDao: ResultDao,
  ) {}

  async singleTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    name: string,
    date: Date,
  ) {
    doc.font(fontBold).fontSize(16).fillColor(colors.orange).text('Үр дүн');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();

    await this.single.default(doc, result);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);
    await this.single.examQuartile(doc, result);
    footer(doc);
  }

  async discTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    name: string,
  ) {
    doc.addPage();

    header(doc, name, date, result.assessmentName);
    doc.font(fontBold).fontSize(16).fillColor(colors.orange).text('Оршил');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(DISC.preface);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);
    doc.font(fontNormal).fillColor(colors.black).fontSize(12);
    doc
      .text(
        'Таны өгсөн хариултанд үндэслэн дискийн 4 төрлөөс танд давамгайлж буй хэв шинжийг доорх DiSC графикт харууллаа. Энэхүү тайлангийн бүлэг бүрийн тайлбарууд эдгээр оноонуудад суурилсан болно. Та уг тайлангаас өөрийн хамгийн өндөр үзүүлэлт бүхий дискийн төрөл, түүний боломжит давуу болон сул талууд, мөн таныг илэрхийлэх загварын Хувь хүний хэв шинжтэй танилцах болно. ',
      )
      .moveDown();
    doc
      .image(assetPath('report/disc/graph'), doc.page.width / 4, doc.y, {
        width: doc.page.width / 2 - marginX,
        height: doc.page.width / 2 - marginX,
      })
      .moveDown();
    doc
      .font(fontBold)
      .text(
        'Таны хувь хүний хэв шинж: ',
        doc.x,
        doc.y + doc.page.width / 2 - marginX,
        { continued: true },
      );
    doc.fillColor(colors.orange).text(result.result);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);
    // const style = Object.entries(DISC.pattern).find(([_, value]) => {
    //   return Object.keys(value).includes(exam.result);
    // });
    // console.log(style);
    const style = DISC.values[result.result.toLowerCase()];
    // let res = style[0] ? DISC.values[style[0].toLowerCase()] : '';
    // let result = ''
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Ажлын орчны талаарх таны хандлага, түүнийг хяналтандаа байлгадаг түвшинг тодорхойлох асуумжид таны өгсөн хариултыг шинжлэхэд та ' +
          result.result.toUpperCase() +
          ` хэв маягтай хүн юм байна. ${style.text} шинжийг илэрхийлэх ерөнхий тайлбарыг уншиж таны зан төлөвтэй хэр тохирч байгааг сонирхоно уу. Бусад шинжүүдийн талаархи тайлбарыг 12-р хуудаснаас уншиж танилцахыг таньд зөвлөж байна. `,
      );
    doc.moveDown(2);

    doc
      .font(fontBold)
      .fontSize(16)
      .text(`${style.text} (${result.result.toUpperCase()})`);
    doc.moveDown();
    const character = DISC.characterDescription[result.result.toLowerCase()];
    // const character =
    //   DISC.characterDescription[(style?.[0] ?? '  ').substring(0, 1).toLowerCase()];
    doc
      .font(fontNormal)
      .fontSize(12)
      .text((result?.lastname ?? result?.firstname ?? '') + character);
    footer(doc);

    const details: ResultDetailEntity[] = result.details;
    const groupedDetails = details.reduce<Record<number, ResultDetailEntity[]>>(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {},
    );
    for (const [i, k] of Object.entries(groupedDetails)) {
      doc.addPage();
      header(doc, name, date, result.assessmentName);
      doc
        .font(fontBold)
        .fillColor(colors.black)
        .fontSize(16)
        .text('Үе шат II: Таныг тодорхойлох онцлог шинжүүд');
      doc.text(i.toUpperCase() + ' шинж чанар');

      const value = DISC.values[i.toLowerCase()];

      doc
        .font(fontNormal)
        .fontSize(12)
        .text(
          `Асуумжинд өгсөн хариултанд үндэслэн таны ${firstLetterUpper(value.text)} ${i.toUpperCase()} байдлыг дараах тайлбаруудаар тодорхойлж болох юм. Та өөрийн санал нийлж буй давуу талуудаа харандаагаар дугуйлж, анхаарвал зохих зан төлөвүүдийг тодруулна уу.`,
        );

      for (const v of k) {
        doc.font(fontBold).text(`${v.value}: `, {
          continued: true,
        });
        console.log(v.value);
        const text = DISC.description[i][v.value];
        doc.font(fontNormal).text(text?.value).moveDown();
      }
      footer(doc);
    }

    doc.addPage();
    header(doc, name, date, result.assessmentName);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(16)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc
      .font(fontNormal)
      .fontSize(12)
      .text(
        'Давамгайлагч, Нөлөөлөгч, Нягт нямбай, Туйлбартай гэсэн үндсэн 4 шинжийн үзүүлэлтүүд нийлж хувь хүнийг тодорхойлох өвөрмөц хэв шинжийг бий болгодог. Судлаачид нийтлэг ажиглагддаг онцлог 15 хэв шинжийг илрүүлсэн. Онолын бөгөөд практикийн нэмэлт судалгааны дүнд тэдгээр хэв шинжүүдийн онцлогуудыг тодорхойлжээ. Эдгээр онцлогуудыг мэдсэнээр та өөрийгөө илүү ихээр танин мэдэх болно. \nАсуумжинд өгсөн хариултын дагуу та чиглүүлэгч хэв шинжийн бүлэгт хамаарч байна. Доорх тайлбаруудыг уншиж таны зан төлөвтэй тохирч буй хэсгүүдэд анхаарал хандуулна уу.',
      );
    doc.moveDown();
    doc
      .font(fontBold)
      .fontSize(16)
      .text('Хэв шинж: ' + result.result.toUpperCase());
    doc.text((result?.lastname ?? result?.firstname ?? '') + ' таны мотиваци');
    // !
    const disc = this.disc.step3(
      result?.lastname ?? result?.firstname ?? '',
      firstLetterUpper(result.value),
    );
    doc.font(fontNormal).fontSize(12).text(disc.motivation);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);

    doc
      .font(fontBold)
      .fontSize(16)
      .fillColor(colors.black)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc.text(
      (result?.lastname ?? result?.firstname ?? '') +
        ' таны ажлын дадал зуршил',
    );
    // !
    doc.font(fontNormal).fontSize(12).text(disc.habit);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);
    doc
      .font(fontBold)
      .fontSize(16)
      .fillColor(colors.black)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc.text(
      (result?.lastname ?? result?.firstname ?? '') + ' таныг тольдвол;',
    );
    // !
    doc.font(fontNormal).fontSize(12).text(disc.self);
    footer(doc);
    doc.addPage();
    header(doc, name, date, result.assessmentName);
    doc.font(fontBold).fontSize(16).text('ДиСК загвар');
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(12)
      .text(
        'DiSC Давамгайлах (D), Нөлөөлөх (I), Туйлбартай (S), мөн Нягт нямбай (C) гэсэн дөрвөн  шинжийг дөрвөн талт хүснэгтэн загвараар тайлбарладаг. Зарим хүмүүст зөвхөн нэг төрлийн хэв шинж илэрдэг бол заримд хоёр, эсвэл бүр гурван хэв шинж ч  илэрч болно.\nТаны Диск загвар бусад хүмүүсийнхээс хэр их ялгаатай бол? Дискийн бусад загваруудтай адил төстэй ямар шинж байна вэ? Эдгээр асуултуудыг ойлгоход доорх Диск загвар танд туслана. Доорх хүснэгтэнд зэрэгцээ байрлах дискийн зан төлвийн төрлүүд нь өөр хоорондоо ямар нэгэн ижил төстэй шинжтэй. Таны харж байгаагаар C болон S төрлийн хүмүүс нь ажлын орчиндоо өөрсдийгөө нөлөөлөл багатай хэмээн үнэлдэг нь харагдаж байна. Тэд өөрийгөө бусдад нөлөөлөх чадвар багатай гэж боддог тул эргэн тойрныхоо хүмүүст илүү уусах хандлагатай байдаг. Нөгөө талдаа D болон I төрлийн хүмүүс нь өөрсдийгөө ажлын орчндоо нөлөөлөл ихтэй байдаг гэж үздэг тул илүү өөртөө итгэлтэй байх хандлагатай. Түүнчлэн, D болон C төрлийн хүмүүс ажлын орчиноо таагүй (хаалттай, эсэргүүцэж) хэмээн хүлээж авдаг бол I болон S төрлийн хүмүүс эсрэгээрээ илүү таатай (нөхөрсөг, дэмжлэг үзүүлдэг) хэмээн хүлээж авдаг.',
      )
      .moveDown();
    const x = doc.x;
    doc.text(
      ' Өөрийгөө хүрээлэн буй орчноосоо илүү хүчирхэг гэж ойлгодог',
      x + doc.page.width / 4 + marginX,
      doc.y,
      {
        align: 'justify',
        width: doc.page.width / 2 - marginX - marginX,
      },
    );
    const y = doc.y;
    doc.text(
      'Хүрээлэн буй орчноо таагүй гэж ойлгодог',
      x,
      y + doc.page.width / 5,
      {
        align: 'justify',
        width: doc.page.width / 4 - marginX - marginX,
      },
    );
    doc.text(
      'Хүрээлэн буй орчноо таатай гэж ойлгодог',
      (doc.page.width / 4) * 3 + marginX,
      y + doc.page.width / 5,
      {
        align: 'justify',
        width: doc.page.width / 4 - marginX - marginX,
      },
    );
    doc
      .image(assetPath('report/disc/graph'), doc.page.width / 4, y, {
        width: doc.page.width / 2,
      })
      .moveDown();
    doc.text(
      'Хүрээлэн буй орчныг өөрөөсөө илүү хүчирхэг гэж ойлгодог',
      x + doc.page.width / 4 + marginX,
      doc.y + doc.page.width / 5,
      {
        align: 'justify',
        width: doc.page.width / 2 - marginX - marginX,
      },
    );
    footer(doc);
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

  async createDefaultPdf(
    lastname: string,
    firstname: string,
    title: string,
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
    const bold = fs.readFileSync(
      path.join(__dirname, '../../../src/assets/fonts/Gilroy-ExtraBold.ttf'),
    );
    doc.registerFont(fontNormal, normal);
    doc.registerFont(fontBold, bold);
    home(doc, lastname, firstname, title);
    doc.addPage();
    return doc;
  }

  async createPdfInOneFile(result: ResultEntity, exam: ExamEntity) {
    const name = `${result?.firstname ?? ''} ` + (result?.lastname ?? '');
    // const buffer2: any = await this.generateImage(htmlCode);
    // console.log(buffer2);
    const filePath = './chart.pdf';
    const out = fs.createWriteStream(filePath);
    const doc = await this.createDefaultPdf(
      result?.lastname ?? '',
      result?.firstname ?? '',
      result.assessmentName,
    );
    try {
      doc.pipe(out);
      const date = new Date(exam.userStartDate);
      header(doc, name, date, result.assessmentName);
      doc
        .font(fontNormal)
        .fillColor(colors.black)
        .fontSize(12)
        .text(exam.assessment.description)
        .moveDown();
      doc.font(fontBold).text('Хэмжих зүйлс').moveDown(1);

      doc.font(fontNormal).text(exam.assessment.measure).moveDown(1);
      if (exam.assessment.report == ReportType.CORRECT)
        await this.singleTemplate(doc, result, name, date);
      if (exam.assessment.report == ReportType.DISC) {
        await this.discTemplate(doc, result, date, name);
      }
      doc.end();

      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });

      return filePath;
    } catch (error) {
      throw new Error('Failed to generate PDF');
    }
    // doc.image(buffer2, 50, 400, { width: 260 });
  }

  async createSingleCorrect() {}
}
