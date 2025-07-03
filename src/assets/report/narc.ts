import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
  header,
  marginX,
  fontNormal,
  lh,
  colors,
  footer,
  fontBold,
  assetPath,
  title,
  info,
} from 'src/app/exam/reports/formatter';
import { VisualizationService } from 'src/app/exam/visualization.service';

export class Narc {
  constructor(private vis: VisualizationService) {}

  template = async (
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    assessment: AssessmentEntity,
  ) => {
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
        'Нарциссизм нь нэршлийн хувьд эртний Грекийн домгоос үүдэлтэй бөгөөд Нарциссус (Narcissus) гэх нэгэн үзэсгэлэн төгөлдөр эр өөрийн төрхийг усны тусгалд харж дурласан гэх түүх байдаг. Үүнээс үүдэлтэйгээр нарцисизмын үзэл бий болсон түүхтэй.\n\nНарциссизм буюу өөрийгөө хэт их хайрлах, дөвийлгөж үзэх үзлийг нийтээр буруу гэж хүлээн зөвшөөрөх хандлага түгээмэл байдаг. Харин сүүлийн жилүүдэд “аливаа нэг хүнд, ялангуяа удирдах албан тушаалтанд тодорхой хэмжээний нарциссизм байх нь оновчтой” гэсэн асуудлыг дэвшүүлэх болжээ.\n\nАливаа хүний нарциссизмын үзэл 7 зан төлөвийн хүчин зүйлээс үүдэлтэй болохыг аналитик сэтгэл судлалын гол төлөөлөгч Карл Густав Юунг судалж тодорхойлсон байдаг. Карл Юунг (Carl Jung) нь дан ганц нарциссизмын оноог авч үзэхээс гадна бие хүний зан төлөвийн хүчин зүйл тус бүрээр нь салгаж шинжлэх нь илүү оновчтой болохыг тодорхойлж "Ашигч байдал", "Сэтгэл хөдлөл, дутагдлаа нууж чаддаггүй байдал", "Нэр хүнд, бүрэн эрх", "Ямба, эрх мэдэл", "Бусдаас давуу байдал", "Өөртөө сэтгэл ханамжтай байдал", "Бардам зан, хийрхэл" хэмээх 7 зан төлөвийн хүчин зүйлсийг боловсруулжээ.',
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

    let levelLabel = '';

    if (Number(result.value) <= 9) {
      levelLabel = 'Бага түвшин';
    } else if (Number(result.value) <= 15) {
      levelLabel = 'Дундаж түвшин';
    } else if (Number(result.value) <= 20) {
      levelLabel = 'Харьцангуй өндөр түвшин';
    } else {
      levelLabel = 'Үнэмлэхүй өндөр түвшин';
    }

    doc.font('fontBlack').fontSize(28);
    doc.fillColor(colors.orange).text(`${result.value ?? ''}`, {
      continued: true,
    });
    doc
      .fontSize(21)
      .fillColor(colors.black)
      .text(`/${result.total}` + ' ~ ', doc.x, doc.y + 5, {
        continued: true,
      });
    doc
      .fontSize(21)
      .font('fontBlack')
      .fillColor(colors.orange)
      .text(
        `${(parseInt(result.value) / result.total).toFixed(2)}%`,
        doc.x,
        doc.y,
        { continued: true },
      )
      .fontSize(12)
      .font(fontNormal)
      .fillColor(colors.black)
      .text('  буюу  ', doc.x, doc.y + 6.25, {
        continued: true,
      })
      .font('fontBlack')
      .fontSize(16);
    doc
      .fillColor(colors.orange)
      .text(levelLabel.toUpperCase(), doc.x, doc.y - 3.25)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Карл Юунгийн боловсруулсан 7 хүчин зүйл тус бүрээр таны нарциссизмын оноог хүн амын нийтлэг дундажтай харьцуулахад:',
        { align: 'justify' },
      )
      .moveDown(1);

    const categories = result.details.map((detail) => detail.value);
    const numberedCategories = result.details.map(
      (detail, index) => `${index + 1}. ${detail.value}`,
    );

    const values = result.details.map((detail) => Number(detail.cause));
    const divisors = [8, 7, 6, 6, 5, 5, 3];
    const averages = [4.16, 2.21, 2.09, 1.67, 1.47, 2.54, 1.37];

    for (let index = 0; index < numberedCategories.length; index++) {
      const category = numberedCategories[index];

      if (index > 0) {
        doc.moveDown(3.2);
      }

      doc
        .font(fontBold)
        .fontSize(12)
        .fillColor(colors.black)
        .text(category + ' ', { continued: true })
        .font('fontBlack')
        .fillColor(colors.orange)
        .text(String(values[index]) + '/', { continued: true })
        .fillColor(colors.black)
        .text(String(divisors[index]));

      doc.moveDown(-0.8);

      const buffer = await this.vis.bar(
        values[index],
        divisors[index],
        averages[index],
      );

      doc.image(buffer, {
        width: doc.page.width - marginX * 2,
        height: (130 / 1800) * (doc.page.width - marginX * 2),
      });
    }

    let descriptionText =
      'Дээрх график нь танд буй дээрх 7 хүчин зүйлс хэр их нарциссизмд автаж буйг харуулж байгаа бөгөөд ';

    const numericValues = values.map((val) =>
      typeof val === 'string' ? parseFloat(val) : val,
    );
    const categoryStates = [];

    categories.forEach((category, index) => {
      const value = numericValues[index];
      const average = averages[index];
      let state;

      if (value === 0) {
        state = 'огт автаагүй';
      } else if (value < average - 0.6) {
        state = 'автсан байдал бага';
      } else if (value <= average + 0.6) {
        state = 'дундаж хэмжээтэй';
      } else {
        state = 'автсан байдал их';
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
      .text('Графикийн тайлбар', marginX, doc.y + 58)
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
          'Шүүмжлэлийг эмзэгээр хүлээж авах хандлагатай.',
          'Тэд бол муу сонсогчид.',
          'Бусдыг хайхардаггүй. Нарциссист удирдагчид бизнесийн шийдвэр гаргахдаа хувийн амьдрал, өрөвч сэтгэл зэргийг ажил, үүргээсээ сайтар ялгаж, салгаж чаддаг.',
          'Ментор хийхдээ дурамжхан.',
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
      .fillColor(colors.black)
      .fontSize(13)
      .text('Нарциссизмын эргэлзээтэй талууд', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Өрсөлдөх хүсэл, тэмүүлэлтэй.',
          'Тэд өөр өнцгөөс харахдаа гарамгай.',
          'Нөгөө талаас нарциссизм ихтэй хүмүүс эхэн үедээ бусдад мундагаар ойлгогдож сайшаагдах боловч цаг өнгөрөх тусам нарциссизм ихтэй хүмүүс эргэн тойрноо залхааж эхлэх хандлага байдаг.',
        ],
        doc.x,
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
    doc.image(assetPath(`icons/narc1`), marginX, doc.y + 220, {
      width: doc.page.width - marginX * 2,
    });
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Уг тестийг бөглөсөн нийт хүмүүсийн ерөнхий дундаж оноо 15.3 байдаг бол харин алдартан, олны танил хүмүүсийн дундаж оноо 17.8 байдаг ажээ.',
        marginX,
        doc.y + 400,
        { align: 'justify' },
      )
      .moveDown(1);
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
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
        },
      );
    footer(doc);
  };
}
