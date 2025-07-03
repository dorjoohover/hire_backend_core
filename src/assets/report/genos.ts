import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
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

export class Genos {
  constructor() {}

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
  };
}
