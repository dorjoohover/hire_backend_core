import { Injectable } from '@nestjs/common';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument, { text } from 'pdfkit';
import {
  assetPath,
  colors,
  firstLetterUpper,
  fontBold,
  fontNormal,
  footer,
  fz,
  header,
  home,
  lh,
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
import { Belbin } from 'src/assets/report/belbin';
import { UserAnswerDao } from '../user.answer/user.answer.dao';

@Injectable()
export class PdfService {
  constructor(
    private vis: VisualizationService,
    private single: SinglePdf,
    private disc: DISC,
    private belbin: Belbin,
    private userAnswer: UserAnswerDao,

    private resultDao: ResultDao,
  ) {}

  async singleTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    date: Date,
  ) {
    doc
      .font(fontBold)
      .fontSize(16)
      .fillColor(colors.orange)
      .text('Үр дүн', marginX, doc.y);
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();

    await this.single.default(doc, result);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, result.assessmentName);

    await this.single.examQuartile(doc, result);
    footer(doc);
  }

  async discTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    code: number,
  ) {
    doc.addPage();
    const name = result?.firstname ?? result?.lastname ?? '';

    header(doc, firstname, lastname, 'Оршил');
    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(DISC.preface);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Таны DiSC график');
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(fz.sm)
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
      .text(name, doc.x, doc.y + doc.page.width / 2 - marginX, {
        continued: true,
      })
      .font(fontNormal)
      .text(' таны хувь хүний хэв шинж: ', { continued: true })
      .fillColor(colors.orange)
      .font(fontBold)
      .text(`${DISC.enMn[result.value]} (${result.value})`);
    const style = DISC.values[result.result.toLowerCase()];
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .text(
        'Ажлын орчны талаарх таны хандлага, түүнийг хяналтандаа байлгадаг түвшинг тодорхойлох асуумжид таны өгсөн хариултыг шинжлэхэд та ',
        { continued: true },
      )
      .font(fontBold)
      .text(
        `${firstLetterUpper(style.text)} (${result.result.toUpperCase()})`,
        {
          continued: true,
        },
      )
      .font(fontNormal)
      .text(` хэв маягтай хүн юм байна.`, { continued: true })
      .font(fontBold)
      .text(`${style.text}`, { continued: true })
      .font(fontNormal)
      .text(
        ` шинжийг илэрхийлэх ерөнхий тайлбарыг уншиж таны зан төлөвтэй хэр тохирч байгааг сонирхоно уу. Бусад шинжүүдийн талаархи тайлбарыг 12-р хуудаснаас уншиж танилцахыг таньд зөвлөж байна. `,
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, `Үе шат I: Танд зонхилж буй шинж`);
    // const style = Object.entries(DISC.pattern).find(([_, value]) => {
    //   return Object.keys(value).includes(exam.result);
    // });
    // console.log(style);
    // let res = style[0] ? DISC.values[style[0].toLowerCase()] : '';
    // let result = ''

    doc
      .font(fontBold)
      .fontSize(fz.sm)
      .text(`${style.text} (${result.result.toUpperCase()})`);
    doc.moveDown();
    const character = DISC.characterDescription[result.result.toLowerCase()];
    // const character =
    //   DISC.characterDescription[(style?.[0] ?? '  ').substring(0, 1).toLowerCase()];
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .text(name + character);
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
      const color = DISC.colors[i.toLowerCase()];
      doc.addPage();
      header(
        doc,
        firstname,
        lastname,
        'Үе шат II: Таныг тодорхойлох онцлог шинжүүд',
      );
      doc
        .font(fontBold)
        .fillColor(color.value)
        .fontSize(fz.sm)
        .text(i.toUpperCase(), {
          continued: true,
        })
        .fillColor(colors.black)
        .text(' шинж чанар');

      const value = DISC.values[i.toLowerCase()];

      doc
        .font(fontNormal)
        .fontSize(fz.sm)
        .text(
          `Асуумжинд өгсөн хариултанд үндэслэн таны ${firstLetterUpper(value.text)} ${i.toUpperCase()} байдлыг дараах тайлбаруудаар тодорхойлж болох юм. Та өөрийн санал нийлж буй давуу талуудаа харандаагаар дугуйлж, анхаарвал зохих зан төлөвүүдийг тодруулна уу.`,
        )
        .moveDown();

      for (const v of k) {
        doc.x = marginX;
        const text = DISC.description[i][v.value];
        const textHeight = doc.heightOfString(text?.value);
        const includes = doc.page.height - doc.y - 80 - textHeight < 0;
        if (includes) {
          doc.addPage();
          header(doc, firstname, lastname);
        }
        doc.image(assetPath('icons/disc_2_' + color.key), doc.x, doc.y, {
          width: 16,
          height: 16,
        });
        doc.x += 21;
        doc
          .font(fontBold)
          .fillColor(color.value)
          .text(`${v.value}: `, doc.x, doc.y, {
            continued: true,
          });

        doc
          .font(fontNormal)
          .fillColor(colors.black)
          .text(text?.value)
          .moveDown();
      }
      footer(doc);
    }

    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж ');

    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .fillColor(colors.black)
      .text(
        `Давамгайлагч, Нөлөөлөгч, Нягт нямбай, Туйлбартай гэсэн үндсэн 4 шинжийн үзүүлэлтүүд нийлж хувь хүнийг тодорхойлох өвөрмөц хэв шинжийг бий болгодог. Судлаачид нийтлэг ажиглагддаг онцлог 15 хэв шинжийг илрүүлсэн. Онолын бөгөөд практикийн нэмэлт судалгааны дүнд тэдгээр хэв шинжүүдийн онцлогуудыг тодорхойлжээ. Эдгээр онцлогуудыг мэдсэнээр та өөрийгөө илүү ихээр танин мэдэх болно. \n\nАсуумжинд өгсөн хариултын дагуу та `,
        { continued: true },
      )
      .font(fontBold)
      .fontSize(fz.lg)
      .text(`${DISC.enMn[result.value]} `, doc.x, doc.y - 3, {
        continued: true,
      })
      .font(fontNormal)
      .fontSize(fz.sm)
      .text(
        ` хэв шинжийн бүлэгт хамаарч байна. Доорх тайлбаруудыг уншиж таны зан төлөвтэй тохирч буй хэсгүүдэд анхаарал хандуулна уу.`,
        doc.x,
        doc.y + 3,
      );
    doc.moveDown();
    doc
      .font(fontBold)
      .fontSize(fz.sm)
      .fillColor(colors.orange)
      .text(name + ' таны мотиваци')
      .moveDown();
    // !
    const disc = this.disc.step3(name, firstLetterUpper(result.value));
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(fz.sm)
      .text(disc.motivation);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж ');

    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .fontSize(fz.sm)
      .text(name + ' таны ажлын дадал зуршил');
    // !
    doc.font(fontNormal).fillColor(colors.black).text(disc.habit);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж');
    doc
      .font(fontBold)
      .fontSize(fz.sm)
      .fillColor(colors.orange)
      .text(name + ' таныг тольдвол;');
    // !
    doc.font(fontNormal).fillColor(colors.black).fontSize(12).text(disc.self);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'ДиСК загвар');
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(fz.sm)
      .text(
        'DiSC Давамгайлах (D), Нөлөөлөх (I), Туйлбартай (S), мөн Нягт нямбай (C) гэсэн дөрвөн  шинжийг дөрвөн талт хүснэгтэн загвараар тайлбарладаг. Зарим хүмүүст зөвхөн нэг төрлийн хэв шинж илэрдэг бол заримд хоёр, эсвэл бүр гурван хэв шинж ч  илэрч болно.\nТаны Диск загвар бусад хүмүүсийнхээс хэр их ялгаатай бол? Дискийн бусад загваруудтай адил төстэй ямар шинж байна вэ? Эдгээр асуултуудыг ойлгоход доорх Диск загвар танд туслана. Доорх хүснэгтэнд зэрэгцээ байрлах дискийн зан төлвийн төрлүүд нь өөр хоорондоо ямар нэгэн ижил төстэй шинжтэй. Таны харж байгаагаар C болон S төрлийн хүмүүс нь ажлын орчиндоо өөрсдийгөө нөлөөлөл багатай хэмээн үнэлдэг нь харагдаж байна. Тэд өөрийгөө бусдад нөлөөлөх чадвар багатай гэж боддог тул эргэн тойрныхоо хүмүүст илүү уусах хандлагатай байдаг. Нөгөө талдаа D болон I төрлийн хүмүүс нь өөрсдийгөө ажлын орчндоо нөлөөлөл ихтэй байдаг гэж үздэг тул илүү өөртөө итгэлтэй байх хандлагатай. Түүнчлэн, D болон C төрлийн хүмүүс ажлын орчиноо таагүй (хаалттай, эсэргүүцэж) хэмээн хүлээж авдаг бол I болон S төрлийн хүмүүс эсрэгээрээ илүү таатай (нөхөрсөг, дэмжлэг үзүүлдэг) хэмээн хүлээж авдаг.',
      );
    const x = doc.x;
    doc.text(
      ' Өөрийгөө хүрээлэн буй орчноосоо илүү хүчирхэг гэж ойлгодог',
      x + doc.page.width / 3,
      doc.y,
      {
        align: 'justify',
        width: doc.page.width / 3 - marginX - marginX,
      },
    );
    let y = doc.y;
    doc.text(
      'Хүрээлэн буй орчноо таагүй гэж ойлгодог',
      x,
      y + doc.page.width / 6,
      {
        align: 'justify',
        width: doc.page.width / 3 - marginX - marginX,
      },
    );
    doc.text(
      'Хүрээлэн буй орчноо таатай гэж ойлгодог',
      (doc.page.width / 3) * 2 + marginX,
      y + doc.page.width / 6,
      {
        align: 'justify',
        width: doc.page.width / 3 - marginX - marginX,
      },
    );
    doc
      .image(assetPath('report/disc/graph'), doc.page.width / 3, y, {
        width: doc.page.width / 3,
      })
      .moveDown();
    doc.text(
      'Хүрээлэн буй орчныг өөрөөсөө илүү хүчирхэг гэж ойлгодог',
      x + doc.page.width / 3,
      doc.y + doc.page.width / 12,
      {
        align: 'justify',
        width: doc.page.width / 3 - marginX - marginX,
      },
    );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Оноо ба өгөгдлийн шинжилгээ');
    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .fillColor(colors.black)
      .text(
        'Энэхүү хураангуй нь таны хувь хүний тайлан хэрхэн боловсруулагдсан болохыг харуулж байна. Асуумжийн “байнга”, “бараг үгүй” гэсэн сонголтуудад таны хариулсан үр дүнд үндэслэн өгөгдлийн шинжилгээ хийсэн. Мөн таны хамгийн өндөр оноо авсан DiSC төрөл, хүчний индексийн оноо, хувь хүний хэв шинжийг тодорхойлсон.',
      )
      .moveDown(2);

    doc
      .font(fontBold)
      .fontSize(fz.lg)
      .fillColor(colors.orange)
      .text('Хариултын дэлгэрэнгүй');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();
    // table
    let query = `select point, "qac".name from "userAnswer" inner join "questionAnswerCategory" qac on qac.id = "answerCategoryId" where code = ${code}`;

    const res = await this.userAnswer.query(query);
    const indexs = {
      d: {
        min: 0,
        max: 0,
      },
      i: {
        min: 0,
        max: 0,
      },
      s: {
        min: 0,
        max: 0,
      },
      c: {
        min: 0,
        max: 0,
      },
      n: {
        min: 0,
        max: 0,
      },
    };
    for (const r of res) {
      if (r.point == 0) continue;
      if (r.point == 1) indexs[r.name.toLowerCase()].max += +r['point'];
      if (r.point == -1) indexs[r.name.toLowerCase()].min += +r['point'];
    }

    console.log(res);
    console.log(indexs);

    const a = (doc.page.width - 2 * marginX) / 18;
    const lineHeight = 18;
    doc.font(fontNormal).fontSize(fz.sm).fillColor(colors.black);
    y = doc.y;
    const titleWidth = doc.widthOfString('Үнэлгээний хүснэгт');
    doc
      .moveTo(marginX, y + lineHeight)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y + lineHeight)
      .stroke();
    doc
      .moveTo(8 * a + marginX, y)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y)
      .stroke();
    doc
      .moveTo(marginX, y + 4 * lineHeight)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y + 4 * lineHeight)
      .stroke();
    doc
      .moveTo(5 * a + marginX, y + 2 * lineHeight)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y + 2 * lineHeight)
      .stroke();
    doc
      .moveTo(5 * a + marginX, y + 3 * lineHeight)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y + 3 * lineHeight)
      .stroke();
    doc
      .moveTo(marginX, y + lineHeight)
      .strokeColor(colors.black)
      .lineTo(marginX, y + 4 * lineHeight)
      .stroke();
    doc
      .moveTo(5 * a + marginX, y + lineHeight)
      .strokeColor(colors.black)
      .lineTo(5 * a + marginX, y + 4 * lineHeight)
      .stroke();
    doc
      .moveTo(8 * a + marginX, y)
      .strokeColor(colors.black)
      .lineTo(8 * a + marginX, y + 4 * lineHeight)
      .stroke();
    doc
      .moveTo(8 * a + marginX, y)
      .strokeColor(colors.black)
      .lineTo(8 * a + marginX, y + 4 * lineHeight)
      .stroke();
    doc
      .moveTo(8 * a + marginX, y + lineHeight)
      .strokeColor(colors.black)
      .lineTo(doc.page.width - marginX, y + lineHeight)
      .stroke();

    doc.text(
      'Үнэлгээний хүснэгт',
      a * 2.5 - titleWidth / 2 + marginX,
      doc.y + lineHeight * 2 + 2,
    );

    const text1 = 'Байнга';
    const text1Width = doc.widthOfString(text1);
    doc.text(text1, a * 6.5 - text1Width / 2 + marginX, y + lineHeight + 2);
    const text2 = 'Бараг үгүй';
    const text2Width = doc.widthOfString(text2);
    doc
      .text(text2, a * 6.5 - text2Width / 2 + marginX, y + lineHeight * 2 + 2)
      .font(fontBold);

    const text3 = 'Зөрүү';
    const text3Width = doc.widthOfString(text3);
    doc.text(text3, a * 6.5 - text3Width / 2 + marginX, y + lineHeight * 3 + 2);

    for (const [i, [key, value]] of Object.entries(indexs).entries()) {
      const headerWidth = doc.widthOfString(key.toUpperCase());
      doc
        .font(fontNormal)
        .text(
          key.toUpperCase(),
          a * 9 + i * 2 * a - headerWidth / 2 + marginX,
          y + 2,
        );
      const max = `${value.max}`;
      const maxWidth = doc.widthOfString(max);
      doc.text(
        max,
        a * 9 + i * 2 * a - maxWidth / 2 + marginX,
        y + lineHeight + 2,
      );
      const min = `${Math.abs(value.min)}`;
      const minWidth = doc.widthOfString(min);
      doc.text(
        min,
        a * 9 + i * 2 * a - minWidth / 2 + marginX,
        y + 2 * lineHeight + 2,
      );
      doc
        .moveTo(10 * a + marginX + i * 2 * a + 1, y)
        .strokeColor(colors.black)
        .lineTo(10 * a + marginX + i * 2 * a + 1, y + 4 * lineHeight)
        .stroke();
      const diff = `${value.max + value.min}`;
      const diffWidth = doc.widthOfString(diff);
      if (key.toLowerCase() != 'n')
        doc
          .font(fontBold)
          .text(
            diff,
            a * 9 + i * 2 * a - diffWidth / 2 + marginX,
            y + 3 * lineHeight + 2,
          );
    }
    doc.x = marginX;
    doc.y = doc.y + 50;
    doc.font(fontBold).fontSize(fz.lg).fillColor(colors.orange).text('Тайлбар');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .fillColor(colors.black)
      .text('Танд зонхилж буй шинж: ', { continued: true })
      .font(fontBold)
      .text(`${firstLetterUpper(style.text)} (${result.result.toUpperCase()})`);
    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .text('Хувь хүний хэв шинж: ', { continued: true })
      .font(fontBold)
      .text(`${DISC.enMn[result.value]}`);
    doc
      .font(fontNormal)
      .fontSize(fz.sm)
      .text('Сегментийн тоо: ', { continued: true })
      .font(fontBold)
      .text(`${result.segment ?? ''}`);
  }

  async belbinTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    assessment: AssessmentEntity,
  ) {
    // doc.addPage();

    header(doc, firstname, lastname, result.assessmentName);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(14)
      .text('Юуг хэмжих вэ?');

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(assessment.description)
      .moveDown(2);
    doc.font(fontBold).fontSize(14).text('Тайлангийн тухайд');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(Belbin.about)
      .moveDown(2);
    doc.font(fontBold).fontSize(14).text('Зөвлөмж, тодруулга');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(Belbin.advice)
      .moveDown(2);
    doc.addPage();
    header(doc, firstname, lastname, 'Белбиний багийн 9 дүр');
    // 9 characters
    const w = (doc.page.width - marginX * 2) / 3;
    let v = doc.y;
    const height = (doc.page.height - marginY * 2 - 150) / 3;
    console.log(height);
    for (let i = 0; i < Belbin.values.length; i++) {
      const value = this.belbin.result(Belbin.values[i]);
      const image = value.icon;
      let ml = marginX + (i % 3) * w;
      let mt = v + (i / 3) * height;
      console.log(i / 3);
      doc.lineWidth(5);
      doc
        .moveTo(ml, mt)
        .strokeColor(value.fill)
        .lineTo(ml + w, mt)
        .stroke();
      doc.image(assetPath(`icons/belbin/${image}`), ml, mt + 7, {
        width: 30,
      });
      ml += 36;
      doc
        .font(fontBold)
        .fontSize(fz.sm)
        .fillColor(value.color)
        .text(Belbin.values[i], ml, mt + 7, {
          width: w - 30,
        })
        .text(firstLetterUpper(value.name), ml, mt + 20, {
          width: w - 30,
        });
      mt += 20;
      doc
        .fontSize(11)
        .fillColor(colors.black)
        .text('Шинж чанар:', ml, mt + 23);
      mt += 39;
      doc.font(fontNormal).text(value.character, ml, mt, {
        width: w - 30,
      });
      const characterHeight = doc.heightOfString(value.character, {
        width: w - 30,
      });
      mt += 10 + characterHeight;
      doc.roundedRect(ml, mt, 50, 20, 20).fill(value.fill);
      doc.font(fontBold).fillColor('#ffffff');
      const keyWidth = doc.widthOfString(value.key);
      doc.text(value.key.toUpperCase(), ml + 25 - keyWidth / 2, mt + 4);
    }

    doc.lineWidth(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, assessment.name);
    doc.font(fontBold).fontSize(16).fillColor(colors.orange).text('Үр дүн');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();

    const details: ResultDetailEntity[] = result.details;
    const indicator = [];
    const data = [];
    const results = [];
    const max = details.reduce(
      (max, obj) => (parseInt(obj.value) > parseInt(max.value) ? obj : max),
      details[0],
    );
    for (const detail of details) {
      const result = this.belbin.result(detail.value);
      indicator.push({
        name: result.name,
        max: +max.cause,
      });
      data.push(+detail.cause);
      results.push({ ...result, point: +detail.cause });
    }
    let y = doc.y;
    const pie = await this.vis.createRadar(indicator, data);
    doc.image(pie, marginX / 2 + doc.page.width / 8, y - 10, {
      width: (doc.page.width * 3) / 4 - marginX * 2,
    });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, assessment.name);
    const width = (doc.page.width / 8) * 5;
    let x = doc.x + (doc.page.width / 8) * 1.5 - marginX;
    y = doc.y;
    const pointSize = (width / 20) * 7;
    const indexSize = (width / 20) * 1;
    const nameSize = (width / 20) * 12;
    doc.rect(x, doc.y, width, 16).fill(colors.orange).fillColor('#ffffff');
    doc
      .fontSize(16)
      .font(fontBold)
      .text('9 дүр', x + pointSize, y);
    doc.text('Оноо', width + x - (width / 20) * 5, y);
    results.map((res, i) => {
      y = doc.y;
      doc
        .font(fontNormal)
        .fillColor(colors.black)
        .text(`${i + 1}.`, x, y);
      const name = `${res.key.toUpperCase()} - ${firstLetterUpper(res.name)}`;
      const nameWidth = doc.widthOfString(name);
      doc.text(name, x + indexSize + nameSize / 2 - nameWidth / 2, y);
      const pointWidth = doc.widthOfString(`${res.point}`);
      doc
        .rect(x + indexSize + nameSize, y - 2, pointSize, 16)
        .fill(colors.orange)
        .fillColor('#ffffff');
      doc.text(
        `${res.point}`,
        x + indexSize + nameSize + pointSize / 2 - pointWidth / 2,
        y,
      );
    });

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
    const firstname = result?.firstname ?? '';
    const lastname = result?.lastname ?? '';
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
      if (exam.assessment.report != ReportType.BELBIN) {
        header(doc, firstname, lastname, result.assessmentName);
        let y = doc.y;
        let x = doc.x;
        let iconSize = 16;
        // doc
        //   .roundedRect(
        //     x - padding,
        //     y - padding,
        //     textWidth + padding * 2,
        //     textHeight + padding * 2,
        //     cornerRadius,
        //   )
        //   .fill('#ff0000');

        // doc
        //   .fillColor('#ffffff') // Text color (white)
        //   .text(text, x, y);
        // doc.image(assetPath('icons/category'), x, y, { width: iconSize });
        doc.image(assetPath('icons/book'), x, y, { width: iconSize - 4 });
        doc
          .font(fontNormal)
          .fillColor(colors.orange)
          .fontSize(12)
          .text(exam.assessment.author, x + iconSize, y)
          .moveDown(1);

        doc
          .fillColor(colors.black)
          .fontSize(12)
          .text(exam.assessment.description, x, doc.y)
          .moveDown();
        y = doc.y;
        doc.image(assetPath('icons/eye'), x, y, { width: iconSize });
        doc
          .font(fontBold)
          .fillColor(colors.black)
          .fontSize(14)
          .text('Хэмжих зүйлс', x + iconSize + 2, y);
        doc
          .fontSize(12)
          .font(fontNormal)
          .text(exam.assessment.measure, x, doc.y)
          .moveDown(1);
        y = doc.y;
        doc.image(assetPath('icons/bag'), x, y, { width: iconSize });
        doc
          .font(fontBold)
          .fillColor(colors.black)
          .fontSize(14)
          .text('Хэрэглээ', x + iconSize + 2, y);
        doc.fontSize(12).font(fontNormal).text(exam.assessment.usage, x, doc.y);
        doc.moveDown(1);
      }

      if (exam.assessment.report == ReportType.CORRECT)
        await this.singleTemplate(doc, result, firstname, lastname, date);
      if (exam.assessment.report == ReportType.DISC) {
        await this.discTemplate(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.code,
        );
      }

      if (exam.assessment.report == ReportType.BELBIN) {
        await this.belbinTemplate(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.assessment,
        );
      }
      doc.end();

      await new Promise((resolve, reject) => {
        out.on('finish', resolve);
        out.on('error', reject);
      });

      return filePath;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate PDF');
    }
    // doc.image(buffer2, 50, 400, { width: 260 });
  }

  async createSingleCorrect() {}
}
