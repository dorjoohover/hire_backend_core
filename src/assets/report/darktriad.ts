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
    );
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Хэрэглээ')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хувь хүний хөгжил, зан төлөв, баг бүрдүүлэх, удирдах албан тушаалд тохирох байдлыг үнэлэхэд өргөнөөр ашигладаг. Уг тест зөвхөн хувь хүний зан төлөвийг танин мэдэх зорилготой. Уг тестийг ямар ч нөхцөлд сэтгэцийн эмгэгийн оношилгоонд ашиглаж болохгүй. Мөн түүнчлэн тестийн үр дүнг ашиглан сэтгэл зүй, сэтгэц судлалын зөвлөгөө өгөхгүй байхыг анхаарна уу! Зөвхөн эмчилгээ эрхлэх зөвшөөрөлтэй, нарийн мэргэжлийн эмч л сэтгэцийн эмгэгийг оношлох эрхтэй.',
        {
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font('fontBlack')
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
        'Сүүлийн 20 гаруй жил судлаач нар хар буюу сөрөг зан үйл, сөрөг зан төрхийн хэв шинжийг хайж олох, судлах чиглэлд ихээхэн сонирхох. Ялангуяа эдгээр сөрөг зан төрхийн хэв шинжүүдийг байгууллага менежменттэй холбон судалж, хэрхэн ажлын байрны орчин, байгууллагын соёл, удирдан манлайлахад нөлөөлдөг талаар сонирхох болжээ.\n\nХар гурвал гэдэг нь ерөнхийдөө хүний сөрөг зан төрхийг илэрхийлдэг гурван хэв шинжийг нэгтгэсэн ойлголт юм. Хар гурвалд хоорондоо нягт харилцан холбоо хамааралтай, дараах гурван зан  төрхийн хэв шинжүүд орно. Үүнд: макиавеллизм (бусдад нөлөөлөх), нарциссизм (өөрийгөө хэт хайрлах, өөрийгөө тахин шүтэх), психопати (бусдын сэтгэл хөдлөлийг ойлгох, бусдын ороSAMнд өөрийгөө тавьж ойлгох чадваргүй байх) гэсэн гурван сөрөг зан төрхийн хэв шинжүүд орно. Эдгээр нь сэтгэцийн эмгэг биш, харин хувь хүний дэд түвшний зан төлөв юм. Хар гурвалын тестийн богино хувилбар (SD3) нь 2011 онд хөгжүүлэгдэж, түгээмэл ашиглагдаж байна.',
        { align: 'justify' },
      )
      .moveDown(1);

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
      .font('fontBlack')
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
        2.11: 3,
        2.22: 5,
        2.33: 7,
        2.44: 12,
        2.56: 17,
        2.67: 24,
        2.78: 33,
        2.89: 42,
        3.0: 52,
        3.11: 61,
        3.22: 71,
        3.33: 79,
        3.44: 85,
        3.56: 90,
        3.67: 94,
        3.78: 96,
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
        2.44: 8,
        2.56: 10,
        2.67: 12,
        2.78: 15,
        2.89: 18,
        3.0: 21,
        3.11: 24,
        3.22: 27,
        3.33: 31,
        3.44: 36,
        3.56: 40,
        3.67: 45,
        3.78: 51,
        3.89: 56,
        4.0: 62,
        4.11: 68,
        4.22: 73,
        4.33: 78,
        4.44: 83,
        4.56: 87,
        4.67: 91,
        4.78: 94,
        4.89: 97,
        5.0: 98,
      },
      Psychopathy: {
        0: 0,
        1.67: 1,
        1.78: 2,
        1.89: 4,
        2.0: 7,
        2.11: 10,
        2.22: 13,
        2.33: 18,
        2.44: 23,
        2.56: 29,
        2.67: 35,
        2.78: 41,
        2.89: 48,
        3.0: 55,
        3.11: 61,
        3.22: 67,
        3.33: 73,
        3.44: 78,
        3.56: 83,
        3.67: 87,
        3.78: 91,
        3.89: 93,
        4.0: 95,
        4.11: 97,
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

    const desiredOrder = ['Machiavellianism', 'Narcissism', 'Psychopathy'];
    const sortedDetails = result.details.sort((a, b) => {
      return desiredOrder.indexOf(a.value) - desiredOrder.indexOf(b.value);
    });
    const categories = sortedDetails.map((detail) => detail.value);

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
      .font(fontBold)
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

    const userMachiaScore = values[0];
    const userNarcScore = values[1];
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
      .text('байна.', { continued: false });
    await this.single.examQuartileGraph2(doc, result, 'Machiavellianism');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Графикийн тайлбар', marginX, doc.y + 10)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү графикт өмнө нь судалгаанд хамрагдаж байсан хүмүүсийн авсан макиавеллизмын оноог давтамжаар нь харуулсан. Та өөрийн оноог бусад хүмүүстэй харьцуулан, өөрийгөө хаана буйг эрэмбэлэн харах боломжтой.',
        {
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Макиавеллизмын эерэг талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Сайн төлөвлөгч. Энэ хэв шинжид өндөр оноо авсан хүмүүс ихэвчлэн юмыг сайн төлөвлөх чадвартай хүмүүс байдаг. Тэд энэ чадвараа ашиглан урьдаас нарийн тооцолсон төлөвлөгөөний дагуу бусадтай өрсөлддөг.',
          'Харилцааны ур чадвар. Макиавеллистууд нь нийгэм, хүмүүсийн харилцааг харьцангуй сайн ойлгох чадвартай ч энэхүү чадвараа өөрийн зорилго, ашиг сонирхолд хүрэхийн тулд бусдыг ашиглахад зарцуулдаг.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Макиавеллизмын оноо');
    doc
      .fillColor(colors.black)
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Сайн нөлөөлөгч. Энэ төрлийн хүмүүс нийгмийн харилцаанд илүү нарийн тооцоо, зорилготой ханддаг бөгөөд хүмүүстэй гэрээ хэлэлцээр хийх, зөвшилцөх ур чадвар өндөр. Энэ чадвараа ашиглан бусдад илүү нөлөөлөл үзүүлэх боломжтой.',
          'Байгууллагын удирдагч. Макиавеллистуудын сэтгэл хөдлөлийн багатай байдал нь хэцүү стратегийн шийдвэр гаргахад нь ашигтайгаар үйлчилдэг. Тэд сэтгэл хөдлөл дээр суурилсан шийдвэр бага гаргадаг. Энэ чадвараа ашиглан байгууллагын дотор нөлөөллөө үзүүлж, өндөр албан тушаалд хүрэх илүү магадлалтай.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Макиавеллизмын сөрөг, эрсдэлтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Хууран мэхлэх. Макиавеллизм гэдэг нь бусдыг ямар ч хамаагүй аргаар өөрийнхөөрөө байлгах сонирхолтой. Энэ зорилгодоо хүрэхийн тулд худал хэлэх, хууран мэхлэх, залилах аргуудыг хэрэглэж магадгүй. Нөхцөл байдал, хүмүүсийг өөрийн гартаа оруулах, хяналтандаа байлгах сонирхолтой.',
          'Нөхөрлөл, гүнзгий харилцаа тогтоох чадваргүй. Хэдийгээр энэ төрлийн хүмүүс нь түргэн хугацаанд хүмүүст таалагдах магадлал өндөр ч урт хугацааны хувьд хүмүүсийн итгэлийг хүлээх, харилцан бие биедээ итгэсэн гүн гүнзгий нөхөрлөл тогтоох чадвар муутай. Тэд хүмүүсийг богино хугацааны ашгийн хэрэгсэл болгон харах хандлагатай.',
          'Сэтгэл санааны тааламжгүй байдал, гутрал. Урт хугацааны туршид авч үзвэл макиавеллист хүмүүс нь илүү их ганцаардаж, стресс, сэтгэл гутралд өртөх магадлал өндөр.',
          'Байгууллагын сөрөг уур амьсгал. Хэдийгээр олон судалгаанд энэ төрлийн хүмүүс нь сайн удирдагчид байдаг талаар дурдсан байдаг болов ч байгууллага доторх уур амьсгалыг эвдэх, багийн гишүүдийн дундах итгэлцлийг нураах боломжтойг мөн дурдсан байдаг.',
          'Эмпати бага. Эмпати буюу бусдыг сэтгэл хөдлөлийг мэдэрч, ойлгох, бусдын оронд өөрийгөө тавих, бусдыг өрөвдөх тал дээр харьцангуй идэвхгүй байдаг.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Нарцисизмын оноо');
    const narcMedian = medianScores.Narcissism;
    const narcComparison = getScoreComparison(userNarcScore, narcMedian);

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
      .text(narcMedian.toString(), { continued: true })
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(' оноотой харьцуулахад ', { continued: true })
      .font(fontBold)
      .text(`${narcComparison} `, { continued: true })
      .font(fontNormal)
      .text('байна.', { continued: false });
    await this.single.examQuartileGraph2(doc, result, 'Narcissism');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Графикийн тайлбар', marginX, doc.y + 10)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү графикт өмнө нь судалгаанд хамрагдаж байсан хүмүүсийн авсан макиавеллизмын оноог давтамжаар нь харуулсан. Та өөрийн оноог бусад хүмүүстэй харьцуулан, өөрийгөө хаана буйг эрэмбэлэн харах боломжтой.',
        {
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Нарциссизмын төрлүүд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text('Нарцисизм нь дотроо мөн олон төрөл хэлбэрүүдтэй байдаг.', {
        align: 'justify',
      })
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Хэт өөрийгөө өргөмжлөгч нарциссизм. Бусад хэлбэртэй харьцуулахад өөрийгөө маш чухал хүн гэж итгэж бусдаас илүү их хүч чадалтай, агуу, хайр татам гэж төсөөлдөг хэлбэр. Тэд үргэлж бусдын анхаарал дунд байж, магтуулах гүнзгий хүсэл эрмэлзэлтэй. Энэ хэлбэр нь өөртөө итгэлгүй байдалтай хавсарсан үед үл ялиг шүүмжлэлийг ч хүндээр хүлээж аван, уурлаж бухимдах байдлаар хамгаалах хариу үйлдлүүд үзүүлж магадгүй.',
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
    doc.addPage();
    header(doc, firstname, lastname, 'Нарцисизмын оноо');
    doc
      .fillColor(colors.black)
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Эмзэг нарциссизм. Энэ хэлбэрийн нарциссистууд нь эмзэг мэдрэмтгий, дотогшоо чиглэсэн интроверт хүмүүс байдаг. Ийм төрлийн хүмүүст бусдад хүлээн зөвшөөрөгдөх, танигдах хүсэлтэй нь хавсран хажуугаар нь мөн адил өөртөө сэтгэл дундуур байх, өөртөө итгэлгүй байх, бусдад буруугаар ойлгогдох айдас хамт байдаг. Тэд шүүмжлэлт хэт эмзгээр хандаж, өөрийгөө өрөвдөх, ичих, сэтгэлээр унах, гутрах байдлаар хариу үзүүлдэг. Мөн түүнчлэн энэ хэлбэр нь бусдад өөрийгөө хохирогч гэж итгүүлэн, бусдыг өөрийнхөө оронд буруутгах, хохирогчийн дүрд тоглох хандлагатай.',
          'Тусч нарциссизм. Өөрийгөө хайрлах, хэт өргөмжлөхөөс гадна бусдад туслах хүсэл мөн адил хамт илэрдэг. Энэ хэлбэрийн нарциссист хүмүүс нь бусдад туслах, өгөөмөр хандах, хандив өгөх замаар өөрийгөө бусдаас дөвийлгөж, бусдын талархлыг хүлээх, бусдаар магтуулах ашиг сонирхолтой.',
          'Нийтэч нарциссизм. Энэ төрлийн нарциссистик хэлбэр нь өөрийн харьяалагдах нийгмийн баг бүлгийг бусдаас хэт өргөмжлөх, хайрлах хэлбэр юм. Үүнд:  жижиг цөөн хүнтэй багаас, байгууллага компани, шашин, улс төрийн нам, үндэс угсаа, улс орон үндэстний хэмжээнд хүртэл илэрч болно. Энэ хэлбэр нь байгууллагад сөрөг уур амьсгал, хэт их өрсөлдөөнийг бий болгох эрсдэлтэй. ',
          'Хортой нарциссизм. Энэ нь хэт өөрийгөө магтсан, психопати хосолсон хамгийн хүнд, эмгэг хэлбэрийн нарциссизм юм.',
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
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Нарциссизмын эерэг талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Тавьсан зорилгодоо хүрэхийн тулд бусдаас илт ялгагдахуйц тууштай зүтгэдэг.',
          'Алсын хараатай. Тэд аливаа зүйлийн цаад учир, гарах үр дүн зэргийг тооцоолохдоо гарамгай. Нарциссист удирдагчийн хамгийн том давуу тал нь аливааг томоор нь харж компанийг үргэлж шинэ, шинэлэг зүгт хөтөлж чаддагт оршдог. ',
          'Энгийн хүмүүс аливаа зүйлийг байгаагаар нь харж “яагаад?” гэх асуултыг тавьдаг бол Нарциссист хүмүүс тухайн зүйлийг өмнө нь хэзээ ч байгаагүй өнцгөөс харж “яагаад болохгүй гэж?” гэсэн асуултыг тавьдаг (George Benard Shaw).',
          'Бусдаас илүү эрч хүчтэй, бусдад юу таалагдах, юу таалагдахгүйг сайн мэддэг.',
          'Нарциссист хүмүүс өөрийг нь хүндэлдэг, үнэлдэг хүмүүсийг өөрийн хүрээлэлдээ байлгах хандлагатай байдаг. Өөрөөр хэлбэл тэд эерэг орчин, эерэг уур амьсгал бий болгож чаддаг.',
          'Тэд хэрэггүй зүйлсэд цаг зав, мөнгө үрээд байдаггүй. Нарциссистуудын хийж буй үйлдэл, товлож буй уулзалт бүр ямар нэг байдлаар тэдэнд өөрсдөд нь ашигтай байдаг.',
          'Эрсдэлтэй алхам гаргах нь амжилтад хүргэдэг гэдгийг сайтар мэддэг.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    footer(doc);

    doc.addPage();
    header(doc, firstname, lastname, 'Нарцисизмын оноо');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Нарциссизмын эрсдэлтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Бусдын анхаарлыг татахыг хэт их хүсэмжлэх, өөрийн үзэл бодлыг бусдад тулгах, бусдад сэтгэгдэл үлдээхийг хэт их оролдох, бусдаас ангид байж ойрын зайны харилцаа үүсгэхгүй байхыг эрмэлзэх зэрэг нь нарциссизм ихтэй хүний үйлдлүүд бөгөөд зарим тохиолдолд бусадтай хамтран ажиллах, орчин тойрондоо дасан зохицоход хүндрэлтэй байдал үүсгэдэг сөрөг талтай. Нарциссизм ихтэй хүмүүс өөрийн харагдах байдал, гадаад үзэмж, бий болгож буй дүр төрх, гаргаж буй үйлдэл зэрэгтээ хэт их анхаардаг учраас ямар нэг зүйлд байнгын санаа зовж суудаг нь нэг талаараа тэдний өөрсдөө ч анзаараагүй толгойн өвчин нь болж хувирдаг.',
        {
          align: 'justify',
        },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Шүүмжлэлийг эмзгээр хүлээж авах хандлагатай',
          'Тэд бол муу сонсогчид',
          'Бусдыг хайхардаггүй. Нарциссист удирдагчид бизнесийн шийдвэр гаргахдаа хувийн амьдрал, өрөвч сэтгэл зэргийг ажил, үүргээсээ сайтар ялгаж, салгаж чаддаг.',
          'Ментор хийхдээ дурамжхан.',
          'Эмзэг хэлбэрийн нарциссизмын хэлбэр нь яваандаа сэтгэл гутрал, түгшил, ганцаардалд хүргэх эрсдэлтэй. ',
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
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Нарциссизмын эргэлзээтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Өрсөлдөх хүсэл, тэмүүлэлтэй.',
          'Тэд өөр өнцгөөс харахдаа гарамгай.',
          'Нөгөө талаас нарциссизм ихтэй хүмүүс эхэн үедээ бусдад мундгаар ойлгогдож сайшаагдах боловч цаг өнгөрөх тусам нарциссизм ихтэй хүмүүс эргэн тойрноо залхааж эхлэх хандлага байдаг.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);

    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Психопатийн оноо');
    const psychoMedian = medianScores.Psychopathy;
    const psychoComparison = getScoreComparison(userPsychoScore, psychoMedian);

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
      .text(psychoMedian.toString(), { continued: true })
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(' оноотой харьцуулахад ', { continued: true })
      .font(fontBold)
      .text(`${psychoComparison} `, { continued: true })
      .font(fontNormal)
      .text('байна.', { continued: false });
    await this.single.examQuartileGraph2(doc, result, 'Psychopathy');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Графикийн тайлбар', marginX, doc.y + 10)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Энэхүү графикт өмнө нь судалгаанд хамрагдаж байсан хүмүүсийн авсан макиавеллизмын оноог давтамжаар нь харуулсан. Та өөрийн оноог бусад хүмүүстэй харьцуулан, өөрийгөө хаана буйг эрэмбэлэн харах боломжтой.',
        {
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Психопатийн эерэг талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Айдасгүйгээр эрсдэл үүрэх чадвар. Психопати хэв шинжид өндөр оноо авсан хүмүүс бусад хүмүүстэй харьцуулахад айх айдас, сэтгэлийн хөдлөл багатай байдаг нь тэднийг аюултай, эрсэл ихтэй нөхцөл байдалд шийдвэр гаргахад нь тусалдаг. Энэ чадвар нь удирдлагын түвшинд болон цэрэг, хууль сахиулах, аврах ажиллагаа, гамшгийн нөхцөл байдалд ажилдаг хүмүүст ашигтай байж болно. Зарим судалгаанд психопати хүмүүсийн тархин дахь айдас мэдрэх, зохицуулах хэсгийн үйл ажиллагаа нь буурсан байдгийг илрүүлжээ (Blair, 2005).',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Психопатийн оноо');
    doc
      .fillColor(colors.black)
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Хүчтэй анхны сэтгэгдэл. Психоапати оноо өндөртэй хүмүүс нь ихэвчлэн хүчтэй эерэг анхны сэтгэгдлийг бусдад үлдээж чаддаг. Эхний уулзалтуудад өөртөө итгэлтэй, харизма өндөртэй мэт харагдах хэдий ч урт хугацаандаа гүнзгий харилцаа үүсгэхэд асуудлууд гарах хандлагатай.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Психопатийн сөрөг талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Бусдын сэтгэл хөдлөлийг бага мэдэрч, ойлгодог. Психопати хэв шинж дээр өндөр оноо авсан хүмүүс нь голдуу эмпати бага буюу бусдын сэтгэл хөдлөлийг мэдрэх, бусдын оронд өөрийгөө тавьж ойлгох, бусдад туслах өрөвч сэтгэл харьцангуй багатай байдаг. Үүнээс гадна психопати хүмүүс өөрийн буруу үйлдэлдээ гэмших, ёс зүйн хариуцлага, хэм хэмжээг ойлгох тал дээр харьцангуй идэвх багатай байдаг (Hare, 1993). ',
          'Гэмт хэрэгт холбогдох эрсдэл өндөр.  Психопати хэв шинж нь хүчирхийлэл, зөрчил, гэмт хэрэгтэй холбогдох эрсдэл харьцангуй өндөр байдаг. Ялангуяа эмгэг психопатитай хүмүүсийн дунд хууль зөрчсөн, гэмт хэрэг үйлдэж байсан хүмүүс их байдаг байна.',
          'Гүнзгий харилцаа үүсгэх чадвар бага. Өндөр психопати оноотой хүмүүс нь ихэвчлэн бусадтай гүн гүнзгий, дотно харилцаа үүсгэж чаддаггүй. Хайр дурлал, найз нөхөрлөлийн хувьд голдуу өнгөц байх нь олон бөгөөд төдийлөн амжилттай биш.',
          'Хуурамч баг зүүх. Психопати хэв шинжид багтах хүмүүс өөрийн сэтгэл хөдлөлийн илэрхийллээ маш сайн нуухаас гадна нийгмийн харилцааг сайн ойлгож, нөхцөл байдалд тохирсон зан авир гаргах байдлаар бусдад сайхан сэтгэгдэл төрүүлэх, таалагдах чадвар сайн. Энэ чадвараа ашиглах бусдыг ашиглах, хууран мэхлэх магадлалтай.',
          'Тогтворгүй байдал. Психопати хэв шинжтэй хүмүүс удирдлагын түвшинд болон богино хугацаанд амжилт үзүүлэх магадлалтай. Гэхдээ сэтгэл хөдлөл, ёс зүйн ойлголт, мэдрэмж багатай байдлаасаа болж урт хугацаандаа алдаа гаргах, карьерын хувьд тогтворгүй гаргах эрсдэлтэй. Мөн түүнчлэн энэ төрлийн хэв шинжийн хүмүүс ажлаасаа амархан уйдах, ажлаа солих магадлал өндөртэй.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      )
      .moveDown(1);
    footer(doc);

    doc.addPage();
    header(doc, firstname, lastname, 'Судалгааны үр дүн, нэмэлт мэдээлэл');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хар гурвалын зан чанарууд таны бодож байгаагаас ч илүү түгээмэл. Судалгаагаар 14 хүн тутмын 1 (7%) нь эдгээр гурван хэв шинжийн дундаж онооноос илүү өндөр оноо авдаг байна. Та магадгүй аль хэдийн энэ төрлийн хүмүүстэй уулзаж байсан, эсвэл таны ойр орчимд ийм төрлийн хүмүүс байж магадгүй.\n\nХэрэв хар гурвалын нэг хэв шинж илэрсэн бол өөр бусад шинж мөн дагалдан илрэх магадлал өндөр. Хэдийгээр тус тусын өвөрмөц шинж чанар, дараах хэдэн хэдэн шинжүүд хамтдаа илэрдэг. Тухайлбал, өөрийгөө магтах, хэт өргөмжлөх, хүйтэн хөндий, хуурч мэхлэх, бусадтай санал нийлэхгүй зөрөх, хэрцгий түрэмгий зан авир, үйлдэл гаргах ерөнхий хандлага бүгдэд нь илэрдэг. Нарцисизм болон психопати нь илүү экстроверт буюу гадагшаа чиглэсэн, илүү яриасаг, нээлттэй байдаг. Психопати болон Макиавеллизм нь бусадтай харилцан ойлголцох, хариуцлагатай байх тал дээр сул байдаг.\n\nНарцисистик хэв шинжийн хүмүүс бусад хэв шинжтэй харьцуулахад өөрсдийгөө хамгийн чухал, онцгой гэж боддог. Психопати хэв шинжийн хүмүүст мөн адил энэ шинж харьцангуй өндөр илэрдэг. Харин Макиавеллизм хэв шинжийн хүмүүст өөрийгөө магтах, хэт өргөмжлөх талын зан авир илэрдэггүй. Энэ төрлийн хүмүүст өөрийн бодит нөхцөл байдлыг мэдрэх чадамж сайн байдаг.\n\nХар гурвалын хэв шинж их илэрсэн эрэгтэйчүүдэд эмэгтэйчүүд илүү ихээр татагдах магадлалтайг судалсан байдаг. Хүн төрөлхтний хувьслын явцад эсрэг хүйстнээ богино хугацаанд өөртөө татахын тулд хар гурвалын хэв шинжүүд үүссэн гэсэн онол бас байдаг (Carter GL, 2014).\n\nСудалгаагаар хамгийн ухаалаг хар гурвалын төлөөлөгчид илүү өөртөө итгэж, өөрийгөө магтах, бусдыг өөртөө татах замаар улс төр, энтертайнмент салбарт хурдан амжилтад хүрэх хандлагатай.  Судалгаагаар хамгийн ухаалаг хар гурвалын төлөөлөгчид илүү өөртөө итгэж, өөрийгөө магтах, бусдыг өөртөө татах замаар улс төр, энтертайнмент салбарт хурдан амжилтад хүрэх хандлагатай.',
        {
          align: 'justify',
        },
      )
      .moveDown(0.5);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Ашигласан эх сурвалж');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Blair, R. James R., et al. "The development of psychopathy." Journal of child psychology and psychiatry 47.3-4 (2006): 262-276.\n\nCarter, Gregory Louis, Anne C. Campbell, and Steven Muncer. "The dark triad personality: Attractiveness to women." Personality and Individual Differences 56 (2014): 57-61.\n\nHare, R. D. (1999). Without conscience: The disturbing world of the psychopaths among us. Guilford Press.\n\nPaulhus, Delroy L., and Kevin M. Williams. "The dark triad of personality: Narcissism, Machiavellianism, and psychopathy." Journal of research in personality 36.6 (2002): 556-563.\n\nWilliams, Kevin M., Craig Nathanson, and Delroy L. Paulhus. "Structure and validity of the self-report psychopathy scale-III in normal populations." 111th annual convention of the American Psychological Association. 2003',
        {
          align: 'justify',
        },
      )
      .moveDown(0.5);
    footer(doc);
  }
}
