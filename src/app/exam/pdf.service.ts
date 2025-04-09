import { Injectable } from '@nestjs/common';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument, { addPage, text } from 'pdfkit';
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
  info,
  lh,
  marginX,
  marginY,
  title,
  title10,
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

  async discTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    code: number,
    assessment: AssessmentEntity,
  ) {
    const name = result?.firstname ?? result?.lastname ?? '';
    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
    info(
      doc,
      assessment.author,
      assessment.description,
      assessment.measure,
      assessment.usage,
    );
    doc
      .font('fontBlack')
      .fontSize(16)
      .fillColor('#F36421')
      .text('Оршил', marginX, doc.y);

    doc
      .moveTo(marginX, doc.y + 2)
      .strokeColor('#F36421')
      .lineTo(marginX + 70, doc.y + 2)
      .stroke()
      .moveDown();

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(DISC.preface, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Таны DiSC график');
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(12)
      .text(
        'Таны өгсөн хариултанд үндэслэн дискийн 4 төрлөөс танд давамгайлж буй хэв шинжийг доорх DiSC графикт харууллаа. Энэхүү тайлангийн бүлэг бүрийн тайлбарууд эдгээр оноонуудад суурилсан болно. Та уг тайлангаас өөрийн хамгийн өндөр үзүүлэлт бүхий дискийн төрөл, түүний боломжит давуу болон сул талууд, мөн таныг илэрхийлэх загварын Хувь хүний хэв шинжтэй танилцах болно. ',
        { align: 'justify' },
      )
      .moveDown();
    doc
      .image(assetPath('report/disc/graph'), doc.page.width / 4, doc.y, {
        width: doc.page.width / 2 - marginX,
        height: doc.page.width / 2 - marginX,
      })
      .moveDown(1.5);
    doc
      .font(fontBold)
      .text(name, doc.x, doc.y + doc.page.width / 2 - marginX, {
        continued: true,
      })
      .font(fontNormal)
      .text(' таны хувь хүний хэв шинж: ', { continued: true })
      .fillColor(colors.orange)
      .font('fontBlack')
      .text(`${DISC.enMn[result.value]} (${result.value})`);
    const style = DISC.values[result.result.toLowerCase()];
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .text(
        '\nАжлын орчны талаарх таны хандлага, түүнийг хяналтандаа байлгадаг түвшинг тодорхойлох асуумжид таны өгсөн хариултыг шинжлэхэд та ',
        { continued: true, align: 'justify' },
      )
      .font(fontBold)
      .text(
        `${firstLetterUpper(style.text)} (${result.result.toUpperCase()}) `,
        {
          continued: true,
        },
      )
      .font(fontNormal)
      .text(` хэв маягтай хүн юм байна. `, {
        continued: true,
      })
      .font(fontBold)
      .text(`${style.text} `, { continued: true })
      .font(fontNormal)
      .text(
        ` шинжийг илэрхийлэх ерөнхий тайлбарыг уншиж таны зан төлөвтэй хэр тохирч байгааг сонирхоно уу. Бусад шинжүүдийн талаархи тайлбарыг 12-р хуудаснаас уншиж танилцахыг таньд зөвлөж байна. `,
        { align: 'justify' },
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
      .font('fontBlack')
      .fontSize(fz.sm)
      .text(`${style.text} (${result.result.toUpperCase()})`);
    doc.moveDown();
    const character = DISC.characterDescription[result.result.toLowerCase()];
    // const character =
    //   DISC.characterDescription[(style?.[0] ?? '  ').substring(0, 1).toLowerCase()];
    doc
      .font(fontBold)
      .fontSize(12)
      .fillColor(colors.black)
      .text(name + ' ', { continued: true })
      .font(fontNormal)
      .text(character, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(
      doc,
      firstname,
      lastname,
      'Үе шат II: Таныг илүүтэй тодорхойлох хүчний индекс',
    );

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Таны хэв шинжийг илүүтэй тодорхойлох индексүүдийг доорх хүснэгтэнд тодрууллаа. Давуу болон сул талыг илэрхийлэх эдгээр үгнүүдийн дэлгэрэнгүй тайлбаруудыг дараагийн хуудсаас уншина уу.',
        { align: 'justify' },
      )
      .moveDown(1);

    const tableWidth = doc.page.width - 2 * marginX;
    const colWidth = tableWidth / 4;
    const startY = doc.y;

    doc.font('fontBlack').fontSize(10);

    // Table headers
    const headers = [
      { text: 'Давамгайлагч (D)', color: colors.green },
      { text: 'Нөлөөлөгч (I)', color: colors.redSecondary },
      { text: 'Туйлбартай (S)', color: colors.blue },
      { text: 'Нягт нямбай (C)', color: colors.yellow },
    ];

    headers.forEach((header, index) => {
      doc
        .rect(marginX + colWidth * index, startY, colWidth, 25)
        .fill(header.color);
      doc
        .fillColor('white')
        .text(header.text, marginX + colWidth * index, startY + 7.5, {
          width: colWidth,
          align: 'center',
        });
    });

    doc.font(fontNormal).fontSize(8);
    let rowY = startY + 25;
    const baseRowHeight = 17.3;

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

    const traits = {
      d: Object.keys(DISC.description.d),
      i: Object.keys(DISC.description.i),
      s: Object.keys(DISC.description.s),
      c: Object.keys(DISC.description.c),
    };

    const boldIfMatched = (trait, category) =>
      groupedDetails[category]?.some((item) => item.value === trait);

    const maxTraits = Math.max(...Object.values(traits).map((t) => t.length));

    for (let i = 0; i < maxTraits; i++) {
      let maxHeight = baseRowHeight;

      // Calculate text heights for all columns
      const traitHeights = {};
      Object.keys(traits).forEach((key) => {
        if (i < traits[key].length) {
          traitHeights[key] = doc.heightOfString(
            `${28 - i} ${traits[key][i]}`,
            {
              width: colWidth - 10,
            },
          );
          maxHeight = Math.max(maxHeight, traitHeights[key] + 4);
        }
      });

      if (i % 2 === 0) {
        doc.rect(marginX, rowY, tableWidth, maxHeight).fill(colors.nonprogress);
      }

      Object.entries(traits).forEach(([key, list], index) => {
        if (i < list.length) {
          const textY = rowY + (maxHeight - traitHeights[key]) / 2;
          doc.fillColor(
            boldIfMatched(list[i], key) ? headers[index].color : colors.black,
          );
          doc.font(boldIfMatched(list[i], key) ? 'fontBlack' : fontNormal);
          doc.text(
            `${28 - i} ${list[i]}`,
            marginX + colWidth * index + 5,
            textY + 2,
            {
              width: colWidth - 10,
            },
          );
        }
      });

      rowY += maxHeight;
    }

    footer(doc);

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
        .font('fontBlack')
        .fillColor(color.value)
        .fontSize(fz.sm)
        .text(i.toUpperCase(), {
          continued: true,
        })
        .fillColor(color.value)
        .text(' шинж чанар');

      const value = DISC.values[i.toLowerCase()];

      doc
        .font(fontNormal)
        .fontSize(12)
        .fillColor(colors.black)
        .text(
          `Асуумжинд өгсөн хариултанд үндэслэн таны ${firstLetterUpper(value.text)} ${i.toUpperCase()} байдлыг дараах тайлбаруудаар тодорхойлж болох юм. Та өөрийн санал нийлж буй давуу талуудаа харандаагаар дугуйлж, анхаарвал зохих зан төлөвүүдийг тодруулна уу.`,
          { align: 'justify' },
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
        doc.image(assetPath('icons/disc_2_' + color.key), doc.x, doc.y - 2, {
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
          .text(text?.value, { align: 'justify' })
          .moveDown();
      }
      footer(doc);
    }

    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж ');

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        `Давамгайлагч, Нөлөөлөгч, Нягт нямбай, Туйлбартай гэсэн үндсэн 4 шинжийн үзүүлэлтүүд нийлж хувь хүнийг тодорхойлох өвөрмөц хэв шинжийг бий болгодог. Судлаачид нийтлэг ажиглагддаг онцлог 15 хэв шинжийг илрүүлсэн. Онолын бөгөөд практикийн нэмэлт судалгааны дүнд тэдгээр хэв шинжүүдийн онцлогуудыг тодорхойлжээ. Эдгээр онцлогуудыг мэдсэнээр та өөрийгөө илүү ихээр танин мэдэх болно. \n\nАсуумжинд өгсөн хариултын дагуу та `,
        { continued: true, align: 'justify' },
      )
      .font(fontBold)
      .fontSize(12)
      .text(`${DISC.enMn[result.value]} `, doc.x, doc.y, {
        continued: true,
      })
      .font(fontNormal)
      .fontSize(12)
      .text(
        ` хэв шинжийн бүлэгт хамаарч байна. Доорх тайлбаруудыг уншиж таны зан төлөвтэй тохирч буй хэсгүүдэд анхаарал хандуулна уу.`,
        doc.x,
        doc.y,
      );
    doc.moveDown();
    doc
      .font('fontBlack')
      .fontSize(fz.sm)
      .fillColor(colors.orange)
      .text(name + ' таны мотиваци')
      .moveDown(0.75);
    // !
    const disc = this.disc.step3(name, firstLetterUpper(result.value));
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(12)
      .text(disc.motivation, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж ');

    doc
      .font('fontBlack')
      .fillColor(colors.orange)
      .fontSize(fz.sm)
      .text(name + ' таны ажлын дадал зуршил')
      .moveDown(0.75);
    // !
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(disc.habit, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үе шат III: Таны хувь хүний хэв шинж');
    doc
      .font('fontBlack')
      .fontSize(fz.sm)
      .fillColor(colors.orange)
      .text(name + ' таныг тольдвол;')
      .moveDown(0.75);
    // !
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(12)
      .text(disc.self, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'ДиСК загвар');
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(12)
      .text(
        'DiSC Давамгайлах (D), Нөлөөлөх (I), Туйлбартай (S), мөн Нягт нямбай (C) гэсэн дөрвөн  шинжийг дөрвөн талт хүснэгтэн загвараар тайлбарладаг. Зарим хүмүүст зөвхөн нэг төрлийн хэв шинж илэрдэг бол заримд хоёр, эсвэл бүр гурван хэв шинж ч  илэрч болно.\n\nТаны Диск загвар бусад хүмүүсийнхээс хэр их ялгаатай бол? Дискийн бусад загваруудтай адил төстэй ямар шинж байна вэ? Эдгээр асуултуудыг ойлгоход доорх Диск загвар танд туслана. Доорх хүснэгтэнд зэрэгцээ байрлах дискийн зан төлвийн төрлүүд нь өөр хоорондоо ямар нэгэн ижил төстэй шинжтэй. Таны харж байгаагаар C болон S төрлийн хүмүүс нь ажлын орчиндоо өөрсдийгөө нөлөөлөл багатай хэмээн үнэлдэг нь харагдаж байна. Тэд өөрийгөө бусдад нөлөөлөх чадвар багатай гэж боддог тул эргэн тойрныхоо хүмүүст илүү уусах хандлагатай байдаг. Нөгөө талдаа D болон I төрлийн хүмүүс нь өөрсдийгөө ажлын орчндоо нөлөөлөл ихтэй байдаг гэж үздэг тул илүү өөртөө итгэлтэй байх хандлагатай. Түүнчлэн, D болон C төрлийн хүмүүс ажлын орчиноо таагүй (хаалттай, эсэргүүцэж) хэмээн хүлээж авдаг бол I болон S төрлийн хүмүүс эсрэгээрээ илүү таатай (нөхөрсөг, дэмжлэг үзүүлдэг) хэмээн хүлээж авдаг.',
        { align: 'justify' },
      )
      .moveDown(1.5);
    const x = doc.x;
    doc
      .fontSize(12)
      .text(
        'Өөрийгөө хүрээлэн буй орчноосоо илүү хүчирхэг гэж ойлгодог',
        x + doc.page.width / 3,
        doc.y,
        {
          align: 'justify',
          width: doc.page.width / 3 - marginX - marginX,
        },
      );
    let y = doc.y;
    doc
      .fontSize(12)
      .text(
        'Хүрээлэн буй орчноо таагүй гэж ойлгодог',
        x,
        y + doc.page.width / 6,
        {
          align: 'justify',
          width: doc.page.width / 3 - marginX - marginX,
        },
      );
    doc
      .fontSize(12)
      .text(
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
      .moveDown(0.75);
    doc
      .fontSize(12)
      .text(
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
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Энэхүү хураангуй нь таны хувь хүний тайлан хэрхэн боловсруулагдсан болохыг харуулж байна. Асуумжийн “байнга”, “бараг үгүй” гэсэн сонголтуудад таны хариулсан үр дүнд үндэслэн өгөгдлийн шинжилгээ хийсэн. Мөн таны хамгийн өндөр оноо авсан DiSC төрөл, хүчний индексийн оноо, хувь хүний хэв шинжийг тодорхойлсон.',
        { align: 'justify' },
      )
      .moveDown(1.5);

    doc
      .font('fontBold')
      .fontSize(16)
      .fillColor(colors.orange)
      .text('Хариултын дэлгэрэнгүй');
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y + 2)
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
    doc.font(fontNormal).fontSize(12).fillColor(colors.black);
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
      doc.y + lineHeight * 2 + 3,
    );

    const text1 = 'Байнга';
    const text1Width = doc.widthOfString(text1);
    doc.text(text1, a * 6.5 - text1Width / 2 + marginX, y + lineHeight + 3);
    const text2 = 'Бараг үгүй';
    const text2Width = doc.widthOfString(text2);
    doc
      .text(text2, a * 6.5 - text2Width / 2 + marginX, y + lineHeight * 2 + 3)
      .font(fontBold);

    const text3 = 'Зөрүү';
    const text3Width = doc.widthOfString(text3);
    doc.text(text3, a * 6.5 - text3Width / 2 + marginX, y + lineHeight * 3 + 3);

    for (const [i, [key, value]] of Object.entries(indexs).entries()) {
      const headerWidth = doc.widthOfString(key.toUpperCase());
      doc
        .font(fontNormal)
        .text(
          key.toUpperCase(),
          a * 9 + i * 2 * a - headerWidth / 2 + marginX,
          y + 3,
        );
      const max = `${value.max}`;
      const maxWidth = doc.widthOfString(max);
      doc.text(
        max,
        a * 9 + i * 2 * a - maxWidth / 2 + marginX,
        y + lineHeight + 3,
      );
      const min = `${Math.abs(value.min)}`;
      const minWidth = doc.widthOfString(min);
      doc.text(
        min,
        a * 9 + i * 2 * a - minWidth / 2 + marginX,
        y + 2 * lineHeight + 3,
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
            y + 3 * lineHeight + 3,
          );
    }
    doc.x = marginX;
    doc.y = doc.y + 50;
    doc.font('fontBold').fontSize(16).fillColor(colors.orange).text('Тайлбар');
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y + 2)
      .stroke()
      .moveDown(1);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text('Танд зонхилж буй шинж: ', { continued: true })
      .font(fontBold)
      .text(`${firstLetterUpper(style.text)} (${result.result.toUpperCase()})`);
    doc
      .font(fontNormal)
      .fontSize(12)
      .text('Хувь хүний хэв шинж: ', { continued: true })
      .font(fontBold)
      .text(`${DISC.enMn[result.value]}`);
    doc
      .font(fontNormal)
      .fontSize(12)
      .text('Сегментийн тоо: ', { continued: true })
      .font(fontBold)
      .text(`${result.segment ?? ''}`);
    footer(doc);
  }

  async genosTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    code: number,
    assessment: AssessmentEntity,
  ) {
    const name = result?.firstname ?? result?.lastname ?? '';
    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
    info(
      doc,
      assessment.author,
      assessment.description,
      assessment.measure,
      assessment.usage,
    );
    doc
      .font('fontBlack')
      .fontSize(16)
      .fillColor('#F36421')
      .text('Тайланг хэрхэн ашиглах вэ?', marginX, doc.y);

    doc
      .moveTo(marginX, doc.y + 2)
      .strokeColor('#F36421')
      .lineTo(marginX + 70, doc.y + 2)
      .stroke()
      .moveDown();

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү сэтгэл хөдлөлөө удирдах чадварын үнэлгээний тайлан нь таны үнэлгээний үр дүнд суурилсан болно. Энэ тайлангаас та дараах зүйлсүүдийг мэдэх боломжтой. Үүнд:\n• Үнэлгээний үр дүнд тодорхойлогдсон таны давуу талууд\n• Үнэлгээний үр дүнд тодорхойлогдсон таны хөгжүүлэх шаардлагтай чадварууд',
        { align: 'justify' },
      )
      .moveDown(1);
    doc.font(fontBold).fontSize(13).text('Зөвлөмж').moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү тайлантай танилцсаны дараа сэтгэл хөдлөлөө удирдах чадвараа хөгжүүлэх гарын авлагатай ажиллаарай.\n\nСэтгэл хөдлөлөө удирдах чадварын үр дүнтэй танилцахдаа 7 бүрдэл чадвар тус бүртэй танилцаарай. Чадвар тус бүр нь өмнөх чадвар дээрээ суурилсан байдаг тул дарааллыг алдагдуулахгүй танилцахыг хүсье.\n\nЭнэхүү үнэлгээний  сайн, муу, зөв, буруу хариулт гэж үгүй болохыг анхаарна уу.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Сэтгэл хөдлөлөө удирдах чадварын тухай');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сэтгэл хөдлөлөө удирдах чадвар гэдэг нь өөрийн болон бусдын сэтгэл хөдлөлийг хир үр дүнтэйгээр таньж, учир шалтгааныг ойлгож, өөрийн болон бусдын сэтгэл хөдлөлийг удирдаж буйг тодорхойлох багц чадварууд юм. Сэтгэл хөдлөл нь ажил хөдөлмөр эрхлэх үйл явцын салшгүй хэсэг байдаг ба байгууллагын аль ч түвшинд эдгээр чадварууд чухалд тооцогддог.',
        { align: 'justify' },
      )
      .moveDown(1);

    doc
      .font(fontBold)
      .fontSize(13)
      .text('Ажлын байр ба сэтгэл хөдлөл')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сэтгэл хөдлөл нь шийдвэр гаргалт болон байгууллагын стратегид өдөр тутам нөлөөлж байдаг. Та дараах зүйлсийг өөрөөсөө асуугаарай.\n• “Нэг л биш байна” гэдэг мэдрэмж хэн нэгнийг ажилд авахгүй байх шалтгаан болж байсан уу? \n• Даргын тань сэтгэл санаа таагүй үед та илүү ямар нэгэн зүйлийг асууж, нэхэж байсан уу?\n• Уцаарласан харилцагчтай учраа олохдоо олон төрлийн аргуудыг хэрэглэж байсан уу?\n• Гүйцэтгэл тааруу байгаа багийн гишүүнээ хэрхэн идэвхжүүлэх вэ?',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .text('Сэтгэл хөдлөл нь ажил дээрх зан төлөвт нөлөөлдөг')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Ажил дээрх сэтгэл хөдлөл тань дараах зүйлсээр дамжин бусадтай харилцахад нөлөөлдөг.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .text('Хэмжигдэхүйц өөрчлөлтүүд')
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сэтгэл хөдлөлөө удирдах чадвар нь ажил дээр дараах зүйлсэд нөлөөлдөг.\n\n• Бүтээмж болон гүйцэтгэл\n• Хүмүүс хоорондын харилцааны үр ашигтай байдал\n• Манлайллын чадвар\n• Борлуулалтын гүйцэтгэл\n• Багийн ажиллагаа\n• Харилцагчийн үйлчилгээ\n• Ажлын сэтгэл ханамж',
        { align: 'justify' },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Сэтгэл хөдлөлөө удирдах чадварын тухай');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Сэтгэл хөдлөлөө удирдах чадвараа нэмэгдүүлснээр')
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сэтгэл хөдлөлөө удирдах чадвараа хөгжүүлснээр танд дараах боломжууд бий болно. Үүнд: \n• Өөрийн болон бусдын сэтгэл хөдлөлийг таних, ойлгох боломжууд нэмэгдэнэ \n• Сэтгэлийн хөдөлгөөнөө илэрхийлэхдээ илүү ухаалаг болно\n• Шийдвэр гаргалт тань бодит мэдээлэл дээр суурилаж, тэнцвэртэй тулхтай болно\n• Ажил дээрх бүтээмж болон гүйцэтгэл тань сайжирна.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү тайлан нь сэтгэл хөдлөлөө удирдах чадвараа хөгжүүлэх чухал анхны алхам юм. Та өөрийн сэтгэл хөдлөлийн чадварыг танин барьснаар хөгжүүлэх боломжтой болдог. Мөн уг тайлангаар сэтгэл хөдлөлийн давуу тал болон боломжуудыг жагсаан гаргадаг. ',
        { align: 'justify' },
      )
      .moveDown(1);

    doc
      .font(fontBold)
      .fontSize(13)
      .text('Genos сэтгэл хөдлөлөө удирдах чадварын загвар')
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Genos-ийн сэтгэл хөдлөлөө удирдах чадварын загвар нь дараах ялгаатай 7 чадваруудыг багтаадаг.\n\n• Өөрийн сэтгэл хөдлөлийг таньж мэдэх\n• Сэтгэл хөдлөлөө илэрхийлэх\n• Бусдын сэтгэл хөдлөлийг таньж мэдэх\n• Сэтгэл хөдлөлийн эргэцүүлэл\n• Өөрийн сэтгэл хөдлөлийг удирдах\n• Бусдын сэтгэл хөдлөлийг удирдах\n• Өөрийн сэтгэл хөдлөлийг хянах',
        { align: 'justify' },
      )
      .moveDown(1);
    footer(doc);
  }

  async narcTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    code: number,
    assessment: AssessmentEntity,
  ) {
    const name = result?.firstname ?? result?.lastname ?? '';

    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
    info(
      doc,
      assessment.author,
      assessment.description,
      assessment.measure,
      assessment.usage,
    );
    doc
      .font('fontBlack')
      .fontSize(16)
      .fillColor('#F36421')
      .text('Нарциссизмийн тухай', marginX, doc.y);

    doc
      .moveTo(marginX, doc.y + 2)
      .strokeColor('#F36421')
      .lineTo(marginX + 70, doc.y + 2)
      .stroke()
      .moveDown();

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Нарциссизм (Narcissism) гэдэг нь хүний зан төлөвт илэрдэг өөрийгөө хэт их хайрлах, дөвийлгөн үзэх үзлийг хэлнэ. Нэршлийн хувьд эртний Грекийн домгоос үүдэлтэй бөгөөд Нарциссус (Narcissus) гэх нэгэн үзэсгэлэн төгөлдөр эр өөрийн төрхийг усны тусгалд харж дурласан гэх түүх байдаг. Үүнээс үүдэлтэйгээр нарцисизмын үзэл бий болсон түүхтэй.\n\nНарциссизм буюу өөрийгөө хэт их хайрлах, дөвийлгөж үзэх үзлийг нийтээр буруу гэж хүлээн зөвшөөрөх хандлага түгээмэл байдаг. Харин сүүлийн жилүүдэд “аливаа нэг хүнд, ялангуяа удирдах албан тушаалтанд тодорхой хэмжээний нарциссизм байх нь оновчтой” гэсэн асуудлыг дэвшүүлэх болжээ.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Нарциссизмын индекс');
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Таны нарциссизмын оноо')
      .moveDown(0.5);
    doc.font('fontBlack').fontSize(28);
    doc.fillColor(colors.orange).text(`${result.value ?? ''}`, {
      continued: true,
    });
    doc
      .fontSize(21)
      .fillColor(colors.black)
      .text(`/${result.total}`, doc.x, doc.y + 5, {
        continued: true,
      });

    doc
      .fontSize(12)
      .font(fontNormal)
      .fillColor(colors.black)
      .text('  буюу  ', doc.x, doc.y + 6.25, {
        continued: true,
      });
    doc
      .fontSize(21)
      .font('fontBlack')
      .fillColor(colors.orange)
      .text(
        `${(parseInt(result.value) / result.total).toFixed(2)}%`,
        doc.x,
        doc.y - 6.25,
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Аливаа хүний нарциссизмын үзэл дараах 6 зан төлөвийн хүчин зүйлээс үүдэлтэй болохыг аналитик сэтгэл судлалын гол төлөөлөгч Карл Густав Юунг судалж тодорхойлжээ. Таны нарциссизмын тестийн үр дүнг дээрх 6 хүчин зүйлсэд хуваан авч үзсэн графикийг дор харууллаа. Карл Юунг (Carl Jung): Дан ганц нарциссизмын оноог авч үзэхээс гадна бие хүний зан төлөвийн хүчин зүйл тус бүрээр нь салгаж шинжлэх нь илүү оновчтой болохыг тодорхойлж дараах 6 зан төлөвийн хүчин зүйлсийг боловсруулжээ. Дараах 6  бөгөөд таны нарциссизмын хэмжээг 6 хүчин зүйл тус бүрээр хуваан авч үзвэл:',
        { align: 'justify' },
      );

    const categories = result.details.map((detail) => detail.value);
    const values = result.details.map((detail) => detail.cause);

    const buffer = await this.vis.bar(categories, values);
    const imgWidth = doc.page.width - marginX * 2;
    const imgHeight = (700 / 1800) * imgWidth;

    doc
      .image(buffer, marginX, doc.y + 15, {
        width: imgWidth,
        height: imgHeight,
      })
      .moveDown(1);

    let descriptionText =
      'Дээрх график нь танд буй дээрх 6 хүчин зүйлс хэр их нарциссизмд автаж буйг харуулж байгаа бөгөөд ';

    const numericValues = values.map((val) =>
      typeof val === 'string' ? parseFloat(val) : val,
    );
    const maxValue = Math.max(...numericValues);
    const halfMax = maxValue / 2;
    const categoryStates = [];

    const reversedCategories = [...categories].reverse();

    reversedCategories.forEach((category, index) => {
      const value = numericValues[index];
      let state;
      if (value === 0) {
        state = 'нарциссизмд огт автаагүй';
      } else if (value < halfMax) {
        state = 'нарциссизмд автсан байдал бага';
      } else if (value === halfMax) {
        state = 'дундаж хэмжээтэй';
      } else {
        state = 'нарциссизмд автсан байдал их';
      }

      categoryStates.push({
        index: index + 1,
        category: category,
        state: state,
      });
    });

    const stateGroups = {};
    categoryStates.forEach((item) => {
      if (!stateGroups[item.state]) {
        stateGroups[item.state] = [];
      }
      stateGroups[item.state].push(item.index);
    });

    const stateTexts = [];
    for (const state in stateGroups) {
      const indices = stateGroups[state];
      let indexText;

      if (indices.length === 1) {
        indexText = `${indices[0]}-р хүчин зүйлийн хувьд ${state}`;
      } else if (indices.length > 1) {
        indexText = `${indices.join(', ')}-р хүчин зүйлсийн хувьд ${state}`;
      }

      stateTexts.push(indexText);
    }

    descriptionText += stateTexts.join(', ') + ' байна.';

    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Графикийн тайлбар', marginX, doc.y + 225)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(descriptionText, { align: 'justify' })
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Нарциссизмын ЭЭЭ буюу 3Э');
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Нарциссизмын эрүүл талууд')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Тавьсан зорилгодоо хүрэхийн тулд бусдаас илт ялгарахуйц тууштай зүтгэдэг.',
          'Алсын хараатай. Тэд аливаа зүйлийн цаад учир, гарах үр дүн зэргийг тооцоолохдоо гарамгай. Нарциссист удирдагчдийн хамгийн том давуу тал нь аливааг томоор нь харж компанийг үргэлж шинэ, шинэлэг зүгт хөтөлж чаддагт оршдог.',
          'Энгийн хүмүүс аливаа зүйлийг байгаагаар нь харж “яагаад?” гэх асуултыг тавьдаг бол Нарциссист хүмүүс тухайн зүйлийг өмнө нь хэзээ ч байгаагүй өнцгөөс харж “яагаад болохгүй гэж?” гэсэн асуултыг тавьдаг (George Benard Shaw).',
          'Бусдаас илүү эрч хүчтэй, бусдад юу таалагдах, юу таалагдахгүйг сайн мэддэг.',
          'Нарциссист хүмүүс өөрийг нь хүндэлдэг, үнэлдэг хүмүүсийг өөрийн хүрээлэлдээ байлгах хандлагатай байдаг. Өөрөөр хэлбэл тэд эерэг орчин, эерэг уур амьсгал бий болгож чаддаг.',
          'Тэд хэрэггүй зүйлсэд цаг зав, мөнгө үрээд байдаггүй. Нарциссистуудын хийж буй үйлдэл, товлож буй уулзалт бүр ямар нэг байдлаар тэдэнд өөрсдөд нь ашигтай байдаг.',
          'Эрсдэлтэй алхам гаргах нь амжилтад хүргэдэг гэдгийг сайтар мэддэг.',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Нарциссизмын эрсдэлтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Бусдын анхаарлыг татахыг хэт их хүсэмжлэх, өөрийн үзэл бодлыг бусдад тулгах, бусдад сэтгэгдэл үлдээхийг хэт их оролдох, бусдаас ангид байж ойрын зайны харилцаа үүсгэхгүй байхыг эрмэлзэх зэрэг нь нарциссизм ихтэй хүний үйлдлүүд бөгөөд зарим тохиолдолд бусадтай хамтран ажиллах, орчин тойронодоо дасан зохицоход хүндрэлтэй байдал үүсгэдэг сөрөг талтай. Нарциссизм ихтэй хүмүүс өөрийн харагдах байдал, гадаад үзэмж, бий болгож буй дүр төрх, гаргаж буй үйлдэл зэрэгтээ хэт их анхаардаг учраас ямар нэг зүйлд байнгын санаа зовж суудаг нь нэг талаараа тэдний өөрсдөө ч анзаараагүй толгойны өвчин нь болж хувирдаг.',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Шүүмжлэлийг эмзэгээр хүлээж авах хандлагатай. Нарциссист хүмүүс шүүмжлэл хүлээж авах дургуй байдаг учраас ямар нэг шүүмжлэл тэдэнд хүндээр тусах нь элбэг. Тэд шүүмжлэлийг тэдний дүр төрх, үзэл бодолруу ирж буй дайралт гэж хүлээж авдаг бөгөөд тэдний үзүүлэх хариу үйлдэл нь дүр төрх, үзэл бодлоо хамгаалахад чиглэгдсэн байдаг ажээ.',
          'Тэд бол муу сонсогчид. Нарциссист удирдагчид шүүмжлүүлэх дургүй байх тохиолдол цөөнгүй байдаг учраас тэдэнд үнэтэй шүүмж өгч буй хүнийг төдийлэн чих тавин сонсохгүй байх магадлал өндөр. Нарциссист удирдагчдын хувьд бусдыг сайтар сонсдог байх нь чухал.',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Нарциссизмын ЭЭЭ буюу 3Э');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .list(
        [
          'Бусдыг хайхардаггүй. Нарциссист удирдагчид бизнесийн шийдвэр гаргахдаа хувийн амьдрал, өрөвч сэтгэл зэргийг ажил, үүргээсээ сайтар ялгаж, салгаж чаддаг. Компанийн зүгээс гаргахад хүндрэлтэй шийдвэрүүд(хамтын ажиллагааны гэрээг цуцлах, цомхотгол хийх г.м)-ийг тэдэнд даалгавал тэд уг шийдвэрийг ямар нэг стрессгүйгээр амархан гаргаж чадна. Энэ нь компанийн хувьд сайн ч Нарциссист удирдагчийн хувийн нэр хүнд, дүр төрхөд сөргөөр нөлөөлөх магдадлал маш өндөр юм.',
          'Ментор хийхдээ дурамжхан. Ихэнх нарциссистууд бие даасан, бусдаас ангид байхыг илүүд үздэг учраас хэн нэгэнд зөвлөгөө өгөх, зөвлөх багш байх зэрэгт таагүй ханддаг. Нарциссистууд амжилтаа 100% дан ганц өөрийн чадлаараа бий болгосон гэж боддог бөгөөд бусад хүмүүс ч мөн адил өөрөө бий болгох хэрэгтэй гэж үздэг учраас тэдэнд бусдад зааж зөвлөөд байх сонирхол маш бага байдаг ажээ.',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Нарциссизмын эрсдэлтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Өрсөлдөх хүсэл, тэмүүлэлтэй. Хүн бүр хийж буй зүйлдээ хамгийн шилдэг нь байхыг эрмэлздэг бол нарциссистуудын хувьд хийж буй бүхий л зүйлдээ хамгийн шилдэг нь байх ёстой гэж боддог. Нэг талаас ажлын гүйцэтгэлийг нэмэгдүүлэх, амжилт гаргах хүчтэй өдөөгч хүчин зүйл байж болох ч нарциссистуудын дотор орших аливаад шилдэг нь байж байнга ялж байхыг хүсдэг хүсэл нь бусдын дургуйцлыг хүргэж цаашлаад дайсан бий болгодог ч аюулыг дагуулж байдаг.',
          'Тэд өөр өнцгөөс харахдаа гарамгай.',
          'Нөгөө талаас нарциссизм ихтэй хүмүүс эхэн үедээ бусдад мундагаар ойлгогдож сайшаагдах боловч цаг өнгөрөх тусам нарциссизм ихтэй хүмүүс эргэн тойрноо залхааж эхлэх хандлага байдаг.',
          '“They are good at taking on different appearances. They will do or say what other people want to hear and then often do the opposite.”',
          'They are seldom stopped at the gate, but they can do a lot of harm to an organization once they are hired,” she said. - Rick Nauert PhD',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Судалгааны үр дүн');
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text(
        'Олон улсад хэрэгжүүлсэн Нарциссизмын хэмжээг тодорхойлох судалгаа',
        marginX,
        doc.y,
      );
    doc.image(assetPath(`icons/narc2`), {
      width: doc.page.width - marginX * 2,
    });
    doc.image(assetPath(`icons/narc3`), marginX, doc.y + 110, {
      width: doc.page.width - marginX * 2,
    });
    doc.image(assetPath(`icons/narc1`), marginX, doc.y + 200, {
      width: doc.page.width - marginX * 2,
    });
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Уг тестийг бөглөсөн нийт хүмүүсийн ерөнхий дундаж оноо 15.3 байдаг бол харин алдартан, олны танил хүмүүсийн дундаж оноо 17.8 байдаг ажээ.',
        marginX,
        doc.y + 410,
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc.image(assetPath(`icons/narc4`), {
      width: doc.page.width - marginX * 2,
    });

    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Судалгааны үр дүн');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Энэхүү нарциссизмын оноо нь зарим хүмүүсийн хувьд үнэн зөв үнэлгээ болж чадахгүй гэдгийг анхаараарай. Жишээ нь: АНУ-ын их сургуулийн сурагчдын дунд энэхүү тестийг хэрэгжүүлж эхэлсэн цагаас хойш сурагчдын авч буй (нарциссизмын тестийн үр дүнгээр) оноо байнгын өсөлттэй байгаа юм. Дараах графикуудаас дээрх өсөлтийг харж болно.',
        { align: 'justify' },
      )
      .moveDown(0.75);
    doc.image(assetPath(`icons/narc5`), marginX * 3, doc.y, {
      width: doc.page.width - marginX * 6,
    });
    doc
      .font('fontBold')
      .fontSize(16)
      .fillColor('#F36421')
      .text('Нарциссист удирдагчид', marginX, doc.y + 140),
      marginX,
      doc.y + 100;
    doc
      .moveTo(marginX, doc.y + 2)
      .strokeColor('#F36421')
      .lineTo(75, doc.y + 2)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Тэд алсыг харж чаддаг учраас хамт олноо манлайлан компанид учрах хэцүү цаг үеийг туулаад давах чадалтай. Мөн Нарциссист удирдагчид ажил үүргээ гүйцэтгэхийн тулд ямар ч хэмжээний эрсдэлийг даагаад гарах зоригтой байдаг. Нэн тэргүүнд нарциссист удирдагчид компанийг залж буй чиглэлээ бодитойгоор харж чаддаг байх нь чухал.',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc.image(assetPath(`icons/narc6`), marginX * 1.8, doc.y, {
      width: doc.page.width - marginX * 3.6,
    });
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Нарциссизмын талаарх нэмэлт мэдээллүүд', marginX, doc.y + 160)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'АНУ-ын бүхий л ерөнхийлөгч нарциссистууд байсан.',
          'Удирдах төвшний нарциссизмыг судалж аливаа хүнд тодорхой хэмжээний нарциссизм байх нь удирдах албан тушаалд хүрэхэд нөлөөлдөг болохыг тогтоожээ.',
          'Нарциссизм болон харизм (charisma) хоорондоо салшгүй холбоотой байдаг.',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      );
    footer(doc);

    doc.addPage();
    header(doc, firstname, lastname, 'Зөвлөмж');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Нарциссизм өндөртэй буюу нарциссист байна гэдэг нь шууд утгаараа амиа бодсон, бусдыг ашигласан, хүйтэн сэтгэлтэй байна гэсэн үг биш юм. Өөрийгөө харах өнцгийг үл ялиг өөрчлөхөд мэдэгдэхүйц эерэг үр дүнгүүд илэрч, төсөөлөөгүй үр дүнгүүд бий болдогийг та өөрийн биеэр мэдрэх боломжтой (Whitbourne, 2012). Нарциссизмын үзлийг тухайн хүний өөртөө итгэх итгэлтэй шууд холбон авч үзэж болно. Нарциссизмын хэмжээ бага байх нь өөртөө итгэх итгэл бага буйг илэрхийлэх ч эсэргээрээ нарциссизмын хэмжээ зохистой хэмжээнээс хэтэрвээс өөрт болон орчин тойрондоо сөрөг үр дагавартай байдаг учир нарциссизмын хэмжээг тодорхой төвшинд барьж байх нь чухал юм. Нарциссизмын хэмжээг тодорхой төвшинд барих зөвлөмжүүд:',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Scores of Followers – Being a visionary doesn’t get you very far unless you have people who believe in your vision and want to see it realized. If all it took to succeed was the ability to have visions than I’m sure we would have many more CEO’s that wore tie-dyes and Birkenstocks to work instead of suites and ties. Luckily for narcissists, their natural charisma and way with words tend to attract a following.',
          'Удирдах албан тушаалтны хувьд хүлцэнгүй ба...... хэрэгтэй. Хэрвээ та төрөлхийн удирдах чадвартай... хэн нь ч манлайлах, толгойлоход бэлэн биш байгаа тохиолдолд та удирдлагыг гартаа авч манлайлаж чаддаг байх хэрэгтэй. Хэн нэгэнд саад болоогүй л бол удирдлагыг игэж гартаа авах нь зүгээр. ',
          'Нарциссизм ихтэй хүмүүс бусдын юу мэдэрч буйгаар үл хамааран өөрийн сэтгэл хөдлөлдөө уягдах гээд байдаг тал бий. Нарциссизмыг өөрт ашигтаа байдлаар ашиглаж чаддаг гарамгай нарциссистууд ч уг цаг ямагт өөрийгөө хянаж үг хэлээ цэнэж байдаг.',
          'Өөрсдийн нарициссист найзууддаа... Өөрийн нарциссизмын хэмжээг мэддэг, түүнийгээ удирдаж чаддаг байх нь хувь хүн өөрийн сул талаа, ашигтай байдал болгон эргүүлж чаддаг байх давуу талтай юм. ',
          'Regardless of whether or not there is a narcissism epidemic, it is clear that the antidote to narcissism is empathy.',
          'Solicit input and practice active listening.',
          'Set aside your agenda and become more aware of the other person’s feelings and your own feelings in the moment.',
          'Consider how you can affirm, encourage, and support others.',
        ],
        doc.x + 20,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
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
    // const buffer2: any = await this.generateImage(htmlCode);
    // console.log(buffer2);
    const doc = await this.createDefaultPdf(
      result?.lastname ?? '',
      result?.firstname ?? '',
      result.assessmentName,
      result.code,
    );
    try {
      const date = new Date(exam.userStartDate);
      if (exam.assessment.report == ReportType.CORRECT)
        await this.singleTemplate(doc, result, firstname, lastname, date, exam);
      if (exam.assessment.report == ReportType.DISC) {
        await this.discTemplate(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.code,
          exam.assessment,
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
        await this.genosTemplate(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.code,
          exam.assessment,
        );
      }

      if (exam.assessment.report == ReportType.NARC) {
        await this.narcTemplate(
          doc,
          result,
          date,
          firstname,
          lastname,
          exam.code,
          exam.assessment,
        );
      }
      return doc;
    } catch (error) {
      console.log(error);
      throw new Error('Failed to generate PDF');
    }
    // doc.image(buffer2, 50, 400, { width: 260 });
  }

  async createSingleCorrect() {}
}
