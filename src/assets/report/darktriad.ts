import { Injectable } from '@nestjs/common';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
  assetPath,
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
import { VisualizationService } from 'src/app/exam/visualization.service';

@Injectable()
export class Darktriad {
  constructor(
    private vis: VisualizationService,
    private single: SinglePdf,
  ) {}

  async template(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    exam: ExamEntity,
  ) {
    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
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
      .text('Хар гурвалын сорил');
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y + 2)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сүүлийн 20 гаруй жил судлаач нар хар буюу сөрөг зан үйл, сөрөг зан төрхийн хэв шинжийг хайж олох, судлах чиглэлд ихээхэн сонирхох. Ялангуяа эдгээр сөрөг зан төрхийн хэв шинжүүдийг байгууллага менежменттэй холбон судалж, хэрхэн ажлын байрны орчин, байгууллагын соёл, удирдан манлайлахад нөлөөлдөг талаар сонирхох болжээ.\n\nХар гурвал гэдэг нь ерөнхийдөө хүний сөрөг зан төрхийг илэрхийлдэг гурван хэв шинжийг нэгтгэсэн ойлголт юм. Хар гурвалд хоорондоо нягт харилцан холбоо хамааралтай, дараах гурван зан  төрхийн хэв шинжүүд орно. Үүнд: макиавеллизм (бусдад нөлөөлөх), нарциссизм (өөрийгөө хэт хайрлах, өөрийгөө тахин шүтэх), психопати (бусдын сэтгэл хөдлөлийг ойлгох, бусдын ороSAMнд өөрийгөө тавьж ойлгох чадваргүй байх) гэсэн гурван сөрөг зан төрхийн хэв шинжүүд орно. Эдгээр нь сэтгэцийн эмгэг биш, харин хувь хүний дэд түвшний зан төлөв юм. Хар гурвалын тестийн богино хувилбар (SD3) нь 2011 онд хөгжүүлэгдэж, түгээмэл ашиглагдаж байна. Энэхүү тест нь 27 асуултаас бүрдэх ба тест бөглөх дундаж хугацаа 5 минут орчим байна.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Нарциссизмийн тухай');

    const pageWidth = doc.page.width;
    const marginX = 40;
    const columnGap = 30;
    const availableWidth = pageWidth - marginX * 2 - columnGap;

    const textWidth1 = availableWidth * 0.7;
    const imageWidth1 = availableWidth * 0.3;

    const startY1 = doc.y;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Нарциссизм (Narcissism) гэдэг нь хүний зан төлөвт илэрдэг өөрийгөө хэт их хайрлах, дөвийлгөн үзэх үзлийг хэлнэ. Нэршлийн хувьд эртний Грекийн домгоос үүдэлтэй бөгөөд Нарциссус (Narcissus) гэх нэгэн үзэсгэлэн төгөлдөр эр өөрийн төрхийг усны тусгалд хараад дурлаж, өөр зүйлд анхаарлаа хандуулж чадахгүй болж, эцэст нь өлсөж үхсэн гэх домог байдаг. Үүнээс үүдэлтэйгээр нарцисизмын тухай ойлголт бий болсон түүхтэй. Хожим нь Зигмунд Фройд нарциссизмын ойлголтыг сэтгэл судлалд оруулж иржээ.\n\nНарциссизм буюу өөрийгөө хэт их хайрлах, өөрийгөө тахин шүтэж бусдаас дөвийлгөж үзэх үзлийг нийтээр буруу гэж хүлээн зөвшөөрөх хандлага түгээмэл байдаг. Харин сүүлийн жилүүдэд “аливаа нэг хүнд, ялангуяа удирдах албан тушаалтанд тодорхой хэмжээний нарциссизм байх нь оновчтой” гэсэн асуудлыг дэвшүүлэх болжээ.',
        marginX,
        startY1,
        {
          align: 'justify',
          width: textWidth1,
        },
      );

    const imageX1 = marginX + textWidth1 + columnGap;

    doc.image(assetPath('icons/dt1'), imageX1, startY1, {
      width: imageWidth1,
    });

    const imgBottomY1 = startY1 + imageWidth1 * 1.2;
    doc
      .font(fontNormal)
      .fontSize(10)
      .fillColor(colors.black)
      .text(
        'Караважио зураачын Нарциссус-ын хөрөг зураг (1597–1599), Италийн Эртний Урлагийн Үндэсний Галерей.',
        imageX1,
        imgBottomY1 + 10,
        {
          width: imageWidth1,
          align: 'center',
        },
      );

    doc.moveDown(1);
    doc.y = Math.max(doc.y, imgBottomY1 + 90);

    doc.x = marginX;

    doc
      .font('fontBold')
      .fontSize(16)
      .fillColor(colors.orange)
      .text('Макиавеллизмын тухай');
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y + 2)
      .stroke()
      .moveDown();

    const imageWidth2 = availableWidth * 0.42;
    const textWidth2 = availableWidth * 0.58;

    const startY2 = doc.y;

    doc.image(assetPath('icons/dt2'), marginX, startY2, {
      width: imageWidth2,
    });

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Макиавеллизм (Machiavellianism) бусдыг хэт өөрийн эрх ашгийн төлөө ашиглах, удирдах зан үйлийг хэлдэг. Уг нэршил нь Италийн философич, улс төрч, зохиолч Никколо Макиавелли (1469–1527)-ийн нэрээс анх үүдэлтэй. Тэрээр алдарт “Хунтайж” номоороо дамжуулан ирээдүйн эзэн хаанд эрх мэдлээ хадгалахын тулд хэрхэн ёс суртахуунаас ангид, харгис, шийдэмгий байх ёстой талаарх зааж зөвлөсөн байдаг.',
        marginX + imageWidth2 + columnGap,
        startY2,
        {
          align: 'justify',
          width: textWidth2,
        },
      );

    const imgBottomY2 = startY2 + imageWidth2 * 0.75;
    doc
      .font(fontNormal)
      .fontSize(10)
      .fillColor(colors.black)
      .text(
        'Н.Макиавеллийн хөшөө (1846 он), Флоренц хот',
        marginX,
        imgBottomY2 + 7,
        {
          width: imageWidth2,
          align: 'center',
        },
      );
    doc.moveDown(1);
    doc.y = imgBottomY2 + 45;
    doc.x = marginX;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хэдийгээр түүний нэр хожим нь ичих нүүргүй байх, арга зальтай байх гэсэн утгатай албан ёсны үг болж, хорон санаатай сөрөг талын дүрийн бэлэг тэмдэг болон хэрэглэгддэг ч түүнийг бодит байдлыг хүлээн зөвшөөрч, нээлттэй бичсэн гэж бас үздэг.',
        {
          align: 'justify',
        },
      );
    doc.moveDown(1);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        '“Хүмүүс чамайг хайрлахаас илүү чамаас айж байсан нь дээр”\n~ Никколо Макиавелли (Хунтайж номын хэсгээс)',
        {
          align: 'justify',
        },
      );
    doc.moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Психопатийн тухай');
    const textWidth3 = availableWidth * 0.7;
    const imageWidth3 = availableWidth * 0.3;

    const startY3 = doc.y;

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Психопати хэмээх ойлголтод ерөнхийдөө хүний хүйтэн хөндий, нийгмийн эсрэг зан төрхийг авч үздэг. Түүхийн хувьд энэ төрлийн зан төрхийг сэтгэц судлал болон шүүх эмнэлгийн сэтгэц судлалын талаас анх сонирхон судалж ирсэн байдаг. Харин сүүлийн үед психопатид хамаарах зан төлөвийн шинжийг сэтгэцийн эмгэгээс гадуурх хүрээнд, нийт хүн амын дунд судлах, ашиглах сонирхол нэмэгдэж байгаа юм.\n\nПсихопати нь бусдын болон өөрийн сэтгэл хөдлөлийг мэдрэх, ойлгох, өөрийн бурууг ухамсарлах, буруу үйлдэлдээ гэмших тал дээр дутагдалтай байх, бодлогогүйгээр авирлах, эсрдэл гаргах, нийгмийн хэм хэмжээ болон бусдын эрх ашгийг үл тоомсорлох зэрэг шинжүүдээр тодорхойлогддог.\n\n“Хүн амын 1% нь психопати төрөлд ордог бол байгууллагын удирдлагын түвшинд 4% нь энэ төрөлд ордог байна” (Паул Бабиак, 2010 он)',
        marginX,
        startY3,
        {
          align: 'justify',
          width: textWidth3,
        },
      );

    const imageX3 = marginX + textWidth3 + columnGap;

    doc.image(assetPath('icons/dt3'), imageX3, startY3, {
      width: imageWidth1,
    });

    const imgBottomY3 = startY3 + imageWidth3 * 1.5;
    doc
      .font(fontNormal)
      .fontSize(10)
      .fillColor(colors.black)
      .text(
        'The Talented Mr.Ripley (1999 он) киноны гол дүр болох Tом Рифлеэй (Мэтт Дэймон)-г эмгэг бус психопатитай холбож үздэг.',
        imageX3,
        imgBottomY3 + 10,
        {
          width: imageWidth3,
          align: 'center',
        },
      );

    doc.moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Сорилын үр дүн');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Хар гурвалын зан төрхийн хэв шинж тус бүрд харгалзах оноог тооцоолж дараах графикт нэгтгэн үзүүлэв. Графикаас та өөрийн оноог бусад хүмүүстэй харьцуулан дүгнэх боломжтой. ',
        marginX,
        startY3,
        {
          align: 'justify',
        },
      );
    doc.moveDown(1);

    const percentileData = {
      Narcissism: {
        0: 0,
        1.89: 1,
        2.11: 2,
        2.22: 4,
        2.33: 6,
        2.44: 8,
        2.56: 13,
        2.67: 18,
        2.78: 25,
        2.89: 34,
        3.0: 43,
        3.11: 53,
        3.22: 62,
        3.33: 72,
        3.44: 80,
        3.56: 86,
        3.67: 91,
        3.78: 95,
        3.89: 97,
        4.0: 98,
        4.11: 99,
        5.0: 100,
      },
      Machiavellianism: {
        0: 0,
        1.67: 1,
        1.89: 2,
        2.0: 3,
        2.11: 4,
        2.22: 5,
        2.33: 6,
        2.44: 7,
        2.56: 9,
        2.67: 11,
        2.78: 13,
        2.89: 16,
        3.0: 19,
        3.11: 22,
        3.22: 25,
        3.33: 28,
        3.44: 32,
        3.56: 37,
        3.67: 41,
        3.78: 46,
        3.89: 52,
        4.0: 57,
        4.11: 63,
        4.22: 69,
        4.33: 74,
        4.44: 79,
        4.56: 84,
        4.67: 88,
        4.78: 92,
        4.89: 95,
        5.0: 98,
      },
      Psychopathy: {
        0: 0,
        1.67: 1,
        1.78: 2,
        1.89: 3,
        2.0: 5,
        2.11: 8,
        2.22: 11,
        2.33: 14,
        2.44: 19,
        2.56: 24,
        2.67: 30,
        2.78: 36,
        2.89: 42,
        3.0: 49,
        3.11: 56,
        3.22: 62,
        3.33: 68,
        3.44: 74,
        3.56: 79,
        3.67: 84,
        3.78: 88,
        3.89: 92,
        4.0: 94,
        4.11: 96,
        4.22: 98,
        4.44: 99,
        5.0: 100,
      },
    };

    function calculatePercentile(score, trait) {
      console.log('score', score, 'trait', trait);
      const data = percentileData[trait];
      if (!data) return 0;

      const scores = Object.keys(data)
        .map(Number)
        .sort((a, b) => a - b);

      let closestScore = scores[0];
      let minDiff = Math.abs(score - closestScore);

      for (const s of scores) {
        const diff = Math.abs(score - s);
        if (diff < minDiff) {
          minDiff = diff;
          closestScore = s;
        }
      }

      return data[closestScore] || 0;
    }

    const categories = result.details.map((detail) => detail.value);

    const values = result.details.map((detail) => Number(detail.cause));
    const divisors = [5, 5, 5];
    const averages = [3.78, 3.0, 3.0];

    for (let index = 0; index < categories.length; index++) {
      const category = categories[index];
      const score = values[index];
      const maxScore = divisors[index];

      const traitMap = {
        Machiavellianism: 'Machiavellianism',
        Narcissism: 'Narcissism',
        Psychopathy: 'Psychopathy',
      };

      const traitName = traitMap[category] || 'Machiavellianism';
      const percentile = calculatePercentile(score, traitName);

      if (index > 0) {
        doc.moveDown(3.2);
      }

      const currentY = doc.y;

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(colors.black)
        .text(category + ' ', marginX, currentY, { continued: true })
        .font('fontBlack')
        .fillColor(colors.orange)
        .text(String(score), { continued: false });

      doc
        .font(fontBold)
        .fontSize(10)
        .fillColor(colors.black)
        .text(`Эрэмбэ: ${percentile}`, marginX, currentY, {
          width: doc.page.width - marginX * 2,
          align: 'right',
        });

      doc.moveDown(-0.8);

      const buffer = await this.vis.bar(
        values[index],
        divisors[index],
        averages[index],
        'Голч утга',
      );

      doc.image(buffer, {
        width: doc.page.width - marginX * 2,
        height: (130 / 1800) * (doc.page.width - marginX * 2),
      });
    }
    doc
      .font('fontBold')
      .fontSize(13)
      .fillColor(colors.black)
      .text('Тестийн оноог зөв тайлбарлах', marginX, doc.y + 60)
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хэв шинж тус бүрд нийт авах боломжтой оноо нь 1-ээс 5-ын хооронд хэлбэлзэнэ. Таны авсан оноог бид нийт өгөгдлийн сан дахь бусад хүмүүсийн оноотой харьцуулж, эрэмбэлсэн. Хэв шинж тус бүрд харгалзах тестийн оноог ойлгомжтой тайлбарлахын тулд таны авсан оноог эрэмбэлэхээс гадна, голч утгатай харьцуулж “харьцангуй бага”, “харьцангуй өндөр” гэсэн хоёр бүлэгт хуваасан.\n\nЦаашид хар гурвалын зан төрхийн хэв шинж тус бүрд харгалзах өөрийн оноо болон дэлгэрэнгүй мэдээлэлтэй танилцана уу!',
        {
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .list(
        [
          'Харьцуулсан эрэмбэ буюу перцентиль - өгөгдлийн сан дахь бусад хүмүүсийн авсан оноонуудтай харьцуулахад таны авсан оноо хаана эрэмбэлэгдэж буйг зааж, 0-100 хооронд байр эзлүүлдэг. Жишээлбэл таны авсан оноо бусад хүмүүстэй харьцуулахад 85-д эрэмбэлэгдэж буй бол та бусад тест бөглөсөн хүмүүсийн 85%-иас нь илүү өндөр оноо авсан гэж тайлбарлагдана. ',
          'Голч утга буюу медиан - Нийт өгөгдлийн сан дахь оноонуудыг багаас нь их рүү эрэмбэлэн жагсаахад, дундах голын утга нь голч утга буюу медиан болно. Жишээлбэл хэрвээ  голч утга буюу голч оноо нь 3.0 байсан бол нийт хүмүүсийн 50% нь 3.0 болон түүнээс дээш оноо авсан гэж тайлбарлагдана. ',
        ],
        doc.x + 20,
        doc.y,
        {
          align: 'justify',
          bulletRadius: 1.5,
          columnGap: 8,
        },
      )
      .moveDown(1);
    footer(doc);

    const userMachiaScore = values[1];
    const userNarcScore = values[0];
    const userPsychoScore = values[2];

    const medianScores = {
      Machiavellianism: 3.78,
      Narcissism: 3.0,
      Psychopathy: 3.0,
    };

    function getScoreComparison(userScore, medianScore) {
      return userScore > medianScore ? 'ХАРЬЦАНГУЙ ӨНДӨР' : 'ХАРЬЦАНГУЙ БАГА';
    }

    doc.addPage();
    header(doc, firstname, lastname, 'Макиавеллизмын оноо');

    const machiaMedian = medianScores.Machiavellianism;
    const machiaComparison = getScoreComparison(userMachiaScore, machiaMedian);

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text('Таны оноог голч утга болох ', {
        continued: true,
        align: 'justify',
      })
      .font('fontBlack')
      .fontSize(12)
      .fillColor(colors.orange)
      .text(machiaMedian.toString(), { continued: true })
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(' оноотой харьцуулахад ', { continued: true })
      .font(fontBold)
      .text(`${machiaComparison} `, { continued: true })
      .font(fontNormal)
      .text('байна.', { continued: false })
      .moveDown(1);
    // await this.single.examQuartileGraph2(doc, result);
  }
}
