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

  async setgelTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    date: Date,
    exam: ExamEntity,
  ) {
    header(doc, firstname, lastname);
    title(doc, result.assessmentName);
    info(doc, exam.assessment.author, exam.assessment.description);
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

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Таны сэтгэл ханамж, амьдралын идэвх, нойр, хоолны дуршил, анхаарал төвлөрөл, өөрийгөө үнэлэх байдал зэрэг сэтгэл гутралын 9 үндсэн шинж тэмдгийг хэмжин оноо өгвөл:',
        { align: 'justify' },
      )
      .moveDown(1);

    let levelLabel = '';

    if (Number(result.point) <= 4) {
      levelLabel = 'Бараг байхгүй';
    } else if (Number(result.point) <= 9) {
      levelLabel = 'Энгийн, сэтгэл гутрал бараг үгүй';
    } else if (Number(result.point) <= 14) {
      levelLabel = 'Хөнгөн сэтгэл гутрал';
    } else if (Number(result.point) <= 19) {
      levelLabel = 'Дунд зэргийн сэтгэл гутрал';
    } else {
      levelLabel = 'Дундаас дээш зэргийн сэтгэл гутрал';
    }

    doc
      .fillColor(colors.orange)
      .font('fontBlack')
      .fontSize(28)
      .text(`${result.point ?? ''}`, doc.x, doc.y, { continued: true })
      .fontSize(12)
      .font(fontNormal)
      .fillColor(colors.black)
      .text('  оноо буюу  ', doc.x, doc.y + 11.35, {
        continued: true,
      })
      .font('fontBlack')
      .fontSize(16);
    doc
      .fillColor(colors.orange)
      .text(levelLabel.toUpperCase(), doc.x, doc.y - 2.5)
      .moveDown(-0.5);

    await this.single.examQuartileGraph(doc, result);
    doc
      .font(fontBold)
      .fontSize(13)
      .text('Зөвлөмж', marginX, doc.y)
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хэрэв та 10-с дээш оноо авсан бол мэргэжлийн тусламж, үйлчилгээнд хамрагдахыг зөвлөж байна.',
        { align: 'justify' },
      );
    footer(doc);
  }

  async empathyTemplate(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    firstname: string,
    lastname: string,
    date: Date,
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
      .text('Товч мэдээлэл', marginX, doc.y + 10);
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(100, doc.y + 2)
      .stroke()
      .moveDown();

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Эмпатик харилцааг ойлгохын тулд эхлээд эмпати гэж юу болох талаар ойлголттой болох хэрэгтэй юм.\n\n"Агшин зуурт бие биеийнхээ харцанд гүн нэвтрэхээс илүү гайхамшиг бий гэж үү?"\n- Хенри Девид Торо, яруу найрагч, эсээ бичээч\n\nЭмпатийн оноо нь хувь хүн болгонд ялгаатай илэрч болох ба зарим хүмүүс төрөлхийн эмпатийн түвшин өнөр, зарим нь эмпатийн түвшин сул байдгийг харуулна. Гэвч эмпати нь хөгжиж болох чадвар тул бага оноо авсан хүн ч гэсэн зөв аргачлалаар ажилласнаар өөрийн эмпатийн түвшинг дээшлүүлэх бүрэн боломжтой юм.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үр дүн');

    let levelLabel = '';

    if (Number(result.point) <= 44) {
      levelLabel = 'Эмпатийн түвшин сул';
    } else if (Number(result.point) <= 54) {
      levelLabel = 'Эмпатийн оноо тогтвортой түвшинд';
    } else {
      levelLabel = 'Өндөр түвшний эмпатийн мэдрэмжтэй';
    }

    doc
      .fillColor(colors.orange)
      .font('fontBlack')
      .fontSize(28)
      .text(`${result.point ?? ''}`, doc.x, doc.y, { continued: true })
      .fontSize(12)
      .font(fontNormal)
      .fillColor(colors.black)
      .text('  оноо буюу  ', doc.x, doc.y + 11.35, {
        continued: true,
      })
      .font('fontBlack')
      .fontSize(16);
    doc
      .fillColor(colors.orange)
      .text(levelLabel.toUpperCase(), doc.x, doc.y - 2.5)
      .moveDown(-0.5);

    await this.single.examQuartileGraph(doc, result);
    // doc
    //   .font(fontBold)
    //   .fontSize(13)
    //   .text(levelLabel, marginX, doc.y)
    //   .moveDown(0.5);

    let messageText =
      'Таны авсан дундажаас ялимгүй доогуур байна. Энэ нь та бусдын сэтгэл хөдлөл, дотоод мэдрэмжийг анзаарах, мэдрэх, хуваалцах тал дээр зарим тохиолдолд төдийлөн хүчтэй хариу үзүүлдэггүй байж магадгүй гэсэн үг. Та бусдын баяр хөөр, гуниг зовлонг мэдэрч байгаа ч түүнийгээ шууд илэрхийлэх эсвэл тэр мэдрэмжийг өөрийнхөөрөө хуваалцах нь амаргүй байж болох юм. Үүний улмаас зарим нөхцөл байдалд бусдын сэтгэлийн байдлыг анзаарахгүй өнгөрөх, эсвэл яаж зөв хариу үзүүлэхээ мэдэхгүй үлдэх нь элбэг байдаг.\n\nЖишээлбэл, найз тань сэтгэлээр унасан үед та түүнд санаа зовж болох ч яг ямар үг хэлэх, хэрхэн тайвшруулах нь дээр вэ гэдгээ мэдэхгүй байх магадлалтай. Эсвэл тухайн мэдрэмжийг нь бүрэн ойлгож амжаагүй байхад өөр сэдэв рүү хазайх хандлага ажиглагдаж болох юм.\n\nТаны авсан оноо “дандаа ийм л байна” гэсэн шүүлт биш – харин хаанаас хөгжлөө эхлүүлж болохыг зааж буй гарц юм. Эмпати бол төрмөл шинжээс гадна сургуулилт, ажиглалт, ухамсартай хандлагаар хөгжиж болох чадвар юм.';

    if (result.point >= 45 && result.point <= 54) {
      messageText =
        'Таны эмпатийн оноо дундаж тогтвортой төвшинд байна. Энэ нь та бусдын сэтгэл хөдлөлийг ойлгож, мэдэрч чаддаг ч зарим нөхцөлд тийм ч хүчтэй, хурц хариу мэдрэмж илэрдэггүй байж болохыг илтгэж байна.\n\nТа ойр дотныхоо хүнийг гунигтай, баяртай байгааг анзаарч, зохих хариу үйлдэл үзүүлэхдээ тэнцвэртэй ханддаг хүн юм. Бусдын мэдрэмжийг шууд тусгаж авахын оронд нөхцөл байдлыг ажиглаж, ойлгож, бодож байж хариу илэрхийлэх нь таны хувьд түгээмэл арга мэт харагдаж байна.\n\nТаны авсан оноо бол суурь оноо юм. Учир нь та аливаа мэдрэмж, үйл явдлыг нэг бол сэтгэл хөдлөлөөр шууд дагаж, нөгөө бол хэт хөндий хандах албан ёсны аль алинаас ангид — тэнцвэртэй байр суурьтай байна гэсэн үг.';
    } else if (result.point >= 55 && result.point <= 64) {
      messageText =
        'Таны авсан оноо таныг өндөр түвшний эмпатийн мэдрэмжтэй хүн болохыг харуулж байна. Та бусдын баяр баясгалан, уйтгар гунигийг өөрийн сэтгэл зүрхээрээ мэдэрч, тэр мэдрэмжид хариу үйлдэл үзүүлдэг гүн мэдрэмжтэй хүн юм.\n\nИйм түвшний эмпати нь бусдыг зөвхөн ойлгохоос гадна — тэдэнд хариу үйлдэл үзүүлж, дэм болж, сэтгэлээрээ хамт байх чадварыг илтгэнэ. Та өөрийн оронд бусдыг тавьж бодох, тэдний мэдрэмжийг хуваалцаж, халамж дүүрэн ханддаг өрөвч сэтгэлтэй, энэрэнгүй хүн байна. Ийм хүмүүс бусдад амархан итгэл төрүүлдэг, ярилцахад тайвшрал авчирдаг, бусдын дэргэд байхад тухтай мэдрэмж төрүүлдэг. Та амьдралдаа аль хэдийн олон хүний итгэл, хүндэтгэлийг хүлээж, өөрийн дотоод дулаан энергиэрээ бусдын сэтгэлийг тэтгэж ирсэн байх магадлалтай.\n\nГэхдээ таны эмпати бол зүгээр нэг мэдрэмж биш — энэ бол чадвар. Та үүнийг мэдрээд зогсохгүй, амьдрал дээр хэрэгжүүлж, бодит үйлдэл болгож чаддаг. Таны тусалсан, анхаарсан, хуваалцсан мөчүүд хэн нэгний хувьд үнэтэй дурсамж болон үлдсэн байх нь гарцаагүй.';
    }

    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(messageText, marginX, doc.y, { align: 'justify' });
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Эмпати гэж юу вэ?');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Харилцааны хичээл заадаг сургалт бүрт "Эмпати” буюу бусдын оронд өөрийгөө тавьж, нөхцөл байдлыг тэдний харж буй өнцгөөс харж, ойлгож чадах нарийн мэдрэмж шаардсан ур чадварын талаар дурддаг.\n\nХүмүүс ихэвчлэн "Симпати” буюу бусдыг өрөвдөж хайрлах гэдэг үгийг сайн мэддэг. Учир нь голдуу хэн нэгнээ эсвэл ямар нэгэн зүйлээ алдсан хүмүүстэй учрах үед бидэнд ийм мэдрэмж төрдөг билээ. Харин эмпати, симпати хоёр нь хоорондоо нэлээд ялгаатай ойлголтууд юм. Оксфордын толь бичигт "Эмпати”-г "Бусдын бодол, мэдрэмжийг өөр дээрээ хүлээн авч, ойлгох чадвар” хэмээн тайлбарласан байна. Өөрөөр хэлбэл, бусдыг ойлгох, сэтгэлийн гүнд нь нэвтрэх буюу харилцагч талууд бие биетэйгээ хүчтэй холбогдож буй нөлөөллийг хэлдэг аж.\n\nЭмпати нь хэдийгээр оюун санааны хүчирхэг төлөв боловч бид түүнийг зүрх сэтгэлдээ хүчээр суулгачих зүйл биш агаад үүний үрийг өөртөө суулгаж, бусдад түтээх, өрөөл бусдыг ойлгож, энэрэх нигүүлсэнгүй сэтгэлийн тэнхээ билээ. Эмпати гэдэг нь хүн өөрийнхөө болоод бусдын сайн сайхны төлөө чин сэтгэлээсээ санаа тавьдаг, хүнлэг, хүмүүнлэг нэгэн болгох хамгийн чухал дотоод хөдөлгөгч хүч юм.',
        { align: 'justify' },
      )
      .moveDown(1);

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Эмпати (Empathy)', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Бусад хүний сэтгэлийн хөдөлгөөн, сэтгэл санааны байдлыг танин мэдэж ойлгох, түүний байр сууринд өөрийгөө тавьж үзэх, өрөвдөж хайрлах чадвар, бусдад тохиолдсон аливаа явдлыг өөрт тохиолдсон мэтээр хүлээн авах, мэдрэх, үүнийгээ илэрхийлэх чадвар юм.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(0.5);

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Симпати (Sympathy)', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Бусдад нааштай сайн сэтгэлээр, дотночлон хандах дотоод сэтгэлийн тогтвортой мэдрэмж.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Эмпати гэх хэллэг нь Англи хэлнээ анх 1909 онд орж ирсэн ба Edward Bradford Titchener анх Герман хэлний Einfühlung гэх үгнээс буулгажээ. Өнөө цагт “Эмпати” нь бусдыг ойлгож, бусдын сэтгэл хөдлөлийг (мэдрэмжийг) хуваалцах гэх байдлаар тодорхойлогдох болсон юм.\n\nҮүний дагуу эмпатик харилцаа нь нөгөө хүнийхээ мэдрэмжийг ойлгож, тэдний байгаа нөхцөл байдлыг ойлгохын тулд харилцаж буй харилцааны чадвар юм. Британи гаралтай Америк зохиолч, илтгэгч Саймон Синек (Simon Sinek) эмпати, бусдыг ойлгох чадвар нь хүчирхэг удирдагчдын гол чанар хэмээжээ. Энэхүү тодорхойлолтыг улам өргөжүүлж, эмпатик харилцаа гэж юу болохыг илүү сайн ойлгохын тулд хэд хэдэн мэргэжилтнүүдийн ойлголтыг дор тусгалаа.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Эмпатик харилцааны тухай');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text(
        'Тодорхойлолт #1: Эмпатик харилцаа нь тухайн цаг мөчид байж, нөгөө хүнээ анхаарч сонсох явдал юм.',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Human Leader director, Burnout Researcher and Expert, Салли Кларкын хувьд эмпатик харилцаа нь тайлбарлахад амархан зүйл бөгөөд тэрээр эмпатик харилцааг тухайн цаг мөчид байж, нөгөө хүнээ анхаарч сонсон бусдыг дэмжих явдал юм хэмээн тодорхойлсон бөгөөд бусдад ойлгогдсон, сонсогдсон мэдрэмж төрүүлэх нь чухал гэжээ.\n\nIgnite 360-ын гүйцэтгэх захирал Роб Волфе нь эмпатик харилцаа нь харилцаж буй хүндээ ойлгогдож, сонсогдсон имэдрэмж авахад нь туслах явдал юм гэж үзжээ.\n\nТэрээр "Эмпатик харилцаа бол та харилцаж буй хүнийхээ үзэл бодлыг ойлгож, анхааралдаа авч байгаа гэдгээ мэдрүүлэх чадвартай байх явдал юм гэжээ. Масловын хэрэгцээний шатлалын үндсэн түвшинг хангах нь нөгөө хүн таны хэлэх зүйлийг илүү хүлээн авч, илүү утга учиртай байдлаар оролцох нөхцөлийг бүрдүүлдэг."\n\nМөн тэрээр 2 төрлийн эмпатиг ойлгохын чухлыг онцолсон байна. Эдгээр нь:',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        ['Танин мэдэхүйн (Cognitive)', 'Сэтгэл хөдлөлийн (Emotional)'],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          align: 'justify',
          bulletIndent: 20,
        },
      )
      .moveDown(1);
    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Танин мэдэхүйн эмпати', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Танин мэдэхүйн эмпати гэдэг нь бусдын сэтгэл хөдлөлийн байдлыг мэдэх явдал юм. Энэ нь бидэнд хүмүүстэй уулзаж, яагаад гунигтай, яагаад урам хугарах болсныг ойлгох боломжийг олгодог. Энэ нь бидэнд бусдын өнцгөөс аливаа зүйлийг харах боломжийг олгодог.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(0.5);

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Сэтгэл хөдлөлийн эмпати', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Сэтгэл хөдлөлийн эмпати гэдэг нь бусад хүмүүс аливаа сэтгэл хөдлөлийг хэрхэн мэдэрч, хуваалцаж байгааг ойлгох явдал юм. Энэ нь танин мэдэхүйн эмпатигаас давж, тухайн хүнтэй сэтгэл хөдлөлийн туршлагаа хуваалцах боломжийг бидэнд олгодог. Сэтгэл хөдлөлийн эмпатигийн ачаар бид бусдад өвдөж зовсон үед нь туслахад илүү бэлэн байдаг.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc.text(
      'Волпегийн хэлснээр танин мэдэхүйн эмпати болон сэтгэл хөдлөлийн эмпати нь ажлын байран дээрээ болон амьдрал дээр илүү дээр харилцаа үүсгэхэд чухал үүрэгтэй юм.',
      { align: 'justify' },
    );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Эмпатик харилцааны тухай');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Өөрөөр хэлбэл сэтгэл хөдлөлийн эмпати нь бусдын аливаа мэдрэмжийг тэдэнтэй хамт мэдрэхийг хэлдэг бол танин мэдрэхүйн эмпати нь бусдын харах өнцгөөс аливаа асуудлыг харах юм. Танин мэдэхүйн эмпатиг бид ажлын орчинд болон өдөр тутмын амьдралд ихээхэн ашигладаг ба сэтгэл хөдлөлийн эмпатиг бид илүү ойр дотны хүмүүстэйгээ буюу гэр бүл, найз нөхөдтэйгөө харилцах тохиолдолд ихэвчлэн ашигладаг байна. Зарим хүмүүсийн хувьд сэтгэл хөдлөлөө нээх, сэтгэл хөдлөлөө илэрхийлэх, сэтгэл хөдлөлийн төлөв байдлаа тунгааж боловсруулахад хүндрэлтэй байдаг ба энэ нь тэднийг эмпатик байхаас айлгаж холдуулдаг байна. Гэвч сэтгэл хөдлөлийн эмпатигийн танин мэдэхүйн талыг таньж мэдсэнээр ажлын эсвэл ямарваа нэгэн харилцаанд эмпатик байхад илүү хялбар болгодог байна.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text(
        'Тодорхойлолт #2: Эмпатик харилцаа нь аливаа санааг хэрхэн хүргэх тухай',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Бид эмпатик харилцааг тодорхойлохыг хичээж байгаа учир энэхүү хэсэгт хүмүүс хоорондын мэдээлэл солилцох тухайд авч үзье. Be Brown Brave LLC-ын гүйцэтгэх захирал Мишел Стар эмпатик харилцааг тодорхойлохдоо: Эмпатик харилцаа нь хүмүүс хоорондоо харилцахдаа нэгнийхээ таагүй байдал болон өвдөлт, шаналалыг аман болон бичгийн харилцаанаас мэдрэх явдал юм хэмээн тодорхойлсон байна.\n\nFactorum Consulting-ын үүсгэн байгуулагч, захирал Доминик К.Хавкинс эмпатик харилцаа нь аливаа агуулгыг хэрхэн хүргэх талаар юм хэмээжээ. Тэрээр эмпатик харилцааг аливаа санаа болон мэдээллийг бусадтай хуваалцахдаа бусдын ойлголт, харах өнцөг болон сэтгэл хөдлөлийг харгалзан хуваалцах явдал хэмээн үздэг байна. Энэ нь аливаа заавар болон мэдээллийг түгээхдээ харилцаж буй хүнийхээ оронд өөрийгөө тавьж үзэх гэсэн үг юм. Ерөнхийдөө эмпатик харилцаа нь төвөгтэй үед аливаа агуулгыг хэрхэн хүргэх талаар юм.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text(
        'Тодорхойлолт #3: Эмпатик харилцаа нь бусдыг ойлгож, нөгөө хүнийхээ нөхцөл байдалд өөрийгөө тавьж авч үзэх харилцаа юм.',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Human Leaders-ын үүсгэн байгуулагч, захирал Алексис Захнер эмпатик харилцаа бол бусдын оронд өөрийгөө тавьж үзэн өрөвдөх сэтгэлтэйгээр харилцах явдал юм гэж тодорхойлжээ.\n\nЭмпатик байх нь бусдыг ойлгож, бусдын оронд өөрийгөө тавьж үзэх явдал бөгөөд бусадтай эмпатик байдлаар харилцахын тулд дан ганц өөрийн харах өнцгөөр бус бусдын байр сууринд өөрийгөө тавьж үзэн өрөвч сэтгэлээр хандаж, тэднийг ойлгож харилцах явдал юм.',
        { align: 'justify' },
      );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Зөвлөмж');
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text(
        'Та өөрийн авсан оноог өсгөх – Эмпатик байдлаа хөгжүүлэх зөвлөмж:',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Дараах арга зам, дадлуудыг өдөр тутмын амьдралдаа хэвшүүлснээр TEQ-ийн оноог өсгөх буюу таны эмпатийн чадварыг сайжруулах боломжтой:',
        { align: 'justify' },
      )
      .moveDown(1);

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text(
        'Бусдын сэтгэл санааг анзаарч, “нийгмийн мэдрэмж”-ээ хөгжүүлэх',
        doc.x,
        doc.y,
      )
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Өдөр тутамдаа бусдын нүүрний хувирал, дохио зангаа, дууны өнгө зэрэг вербал бус дохиог анхааралтай ажиглах дадалтай болоорой. Энэ нь таны нийгмийн мэдрэмж (social sensitivity)-ийг дээшлүүлэх үндсэн арга зам юм. Хүн ярьж байх үед зөвхөн хэлж буй үгсийг нь сонсоод зогсохгүй биеийн хэлэмж, царайны илэрхийллээс нь тэр хүний мэдрэмжийг уншихыг хичээх нь эмпатийг нэмэгдүүлдэг. Жишээ нь, хамтран ажиллагч тань ядруу байдалтай бол зөвхөн “би зүгээр” гэсэн үгийг нь авч үзэлгүй, царай зүс, хоолойны өнгөнд нь анхаарал хандуул. Ингэснээр та тухайн хүний үнэн төрх сэтгэл хөдлөлийг ойлгож, хэрэгтэй үед нь туслах боломжийг олж харах болно. Нөгөөтэйгүүр, “өөрийгөө бусдын оронд тавих” буюу тухайн хүний нөхцөл байдал, мэдрэмжийг өөр дээрээ төсөөлөн бодох дасгал хийж заншаарай. Энэ нь таны танин мэдэхүйн эмпати (perspective-taking)-ийг сайжруулж, цаашлаад сэтгэл хөдлөлийн түвшинд бусдыг мэдрэхэд нэмэр болдог. Өдөр тутам тааралдах хүмүүсийн талаар “Хэрэв би энэ хүний нөхцөлд байсан бол юу мэдрэх байсан бол?” гэж дотроо нэг асуугаад үзэхэд илүүдэхгүй.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);
    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Идэвхтэй сонсох дадлыг эзэмших', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Идэвхтэй сонсох нь эмпатийг хөгжүүлэх хамгийн хүчтэй хэрэгслүүдийн нэг юм. Хэн нэгний ярьж буйг анхааран төвлөрч, ярьж дуусахаас нь өмнө хариуг бэлдэхгүйгээр, үнэхээр ойлгохыг зорьж сонсоорой. Сонсож байх үедээ тохиромжтой дохих, нүдээр харилцах, шаардлагатай үед зөөлөн асуулт асуух зэргээр өөрийгөө сонсож буйгаа илэрхийлээрэй. Ингэж ухамсартайгаар сонсох үйл явц нь ярьж буй хүндээ “үнэлэгдэж, ойлгогдож байна” гэсэн мэдрэмж төрүүлдэг төдийгүй сонсож буй таны хувьд тэр хүний сэтгэл хөдлөлийг илүү сайн хуваалцах боломжийг бүрдүүлдэг canr.msu.edu. Судлаачдын үзэж байгаагаар идэвхтэй сонсох болон эмпати хосолсон үед харилцааны холбоос илүү бат бөх болж, хүмүүсийн хоорондын итгэлцэл нэмэгддэг байна canr.msu.edu. Иймээс өдөр тутам энгийн яриан дээрээс эхлэн гэр бүл, найз нөхөд, хамт олноо чин сэтгэлээсээ сонсох дадлыг хэвшүүлснээр таны эмпатийн чадвар аяндаа дээшлэх болно.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Зөвлөмж');

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .fontSize(12)
      .text('Өөрийн сэтгэл хөдлөлийг танин мэдэх, зохицуулах', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Эмпатийн үндэс нь өөрийн мэдрэмжээ ойлгож, удирдаж сурах явдал юм. Та өөрийн сэтгэл хөдлөлийг сайн таньж мэддэг бол бусдынхаас ялган ойлгоход хялбар болно. Өдөр бүрийн туршид төрсөн мэдрэмжээ ажиглах, нэрлэх (жишээ нь, “би одоо уурлаж байна”, “би сэтгэл гонсойж эхэллээ” гэх мэт) дадлыг өөртөө суулгаарай. Мөн сэтгэл хөдлөлөө илэрхийлэх аргуудыг (бичих, дүрслэх, найздаа ярих зэргээр)  өөрийгөө илүү сайн ойлгохыг хичээх хэрэгтэй. Өөрийгөө ойлгох нь өрөөлийг ойлгох эхлэл тул энэ алхмыг хийснээр та бусдын мэдрэмжийг тольдох суурь чадамжаа дээшлүүлнэ.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);

    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text('Өрөвч сэтгэл, энэрэнгүй байдлыг дадлагажуулах', doc.x, doc.y)
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Бусдад туслах жижиг үйлдлүүдийг ч болов санаачилж хийх нь таны өрөөлд хандах сэтгэл, энэрэнгүй занг хөгжүүлдэг. Өдөр бүр санамсаргүй ч бай, санаатайгаар ч бай өрөөлд тусалж баярлуулах нэг үйлдэл хийхийг зорих хэрэгтэй. Жишээлбэл: Танихгүй хүнд зам зааж өгөх, автобусанд өндөр настанг суулгах, сэтгэлээр унасан найзыгаа тайвшруулах зэргээр ензим үйлдэл ч байсан таны дотор бусдын төлөө гэсэн өгөөмөр сэтгэлийг тэтгэдэг. Энэ нь аажмаар таны эмпатийн “булчинг” ажиллуулж буйтай адил бөгөөд цаг хугацааны явцад өрөвдөх, энэрэх мэдрэмж тань илүү хурдан автоматаар төрдөг болохыг анзаарах болно. Мөн өрөвч сэтгэлийг хөгжүүлэх нэг арга нь сайн дурын ажилд оролцох явдал юм – бусдад туслах үйлсэд гар бие оролцсоноор та бусдын оронд өөрийгөө тавьж, зовлон жаргалыг нь хуваалцаж сурах дадалтай болно.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);
    doc.image(assetPath('icons/author'), doc.x, doc.y - 2, {
      width: 16,
      height: 16,
    });
    doc.x += 21;
    doc
      .font(fontBold)
      .fillColor(colors.orange)
      .text(
        'Эмпатийг хөгжүүлэх тусгай дасгал, сургалтад хамрагдах',
        doc.x,
        doc.y,
      )
      .moveDown(0.5);

    doc.x -= 21;
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Хэрэв та илүү зорилготойгоор эмпатийг нэмэгдүүлэхийг хүсвэл сэтгэл судлал, хувь хүний хөгжлийн чиглэлээрх сургалт, дасгалуудыг ашиглаж болно. Өөрийгөө илүү өрөвч байхад сургах бясалгал хийх (жишээ нь, loving-kindness буюу нигүүлсэнгүй сэтгэлийн бясалгал хийх), эмпати дэмжих role-play буюу дүрд хувирч бусдын нөхцөл байдлыг мэдрэх дасгал хийх зэрэг аргууд үр дүнтэй. Мөн ном зохиол унших нь (ялангуяа уран зохиол, хүүрнэл зохиолууд) бусдын дотоод ертөнцөд нэвтрэх нэг арга болдог гэсэн судалгаа байдаг. Жишээлбэл: Та өгүүллэг, туужийн дүрүүдийн оронд өөрийгөө тавьж унших нь бусдын мэдрэмжийг тольдох чадварт эерэгээр нөлөөлж мэдэх юм. Түүнчлэн эмпатийн талаар онолын мэдлэгийг нэмэгдүүлэх (сэтгэл судлалын ном, нийтлэл унших, сургалтанд суух) нь өөрийн хандлага, ойлголтыг гүнзгийрүүлж, аливаа нөхцөлд илүү энэрэнгүй хандах сэдэл төрүүлэх боломжтой.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Зөвлөмж');
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.md)
      .fillColor(colors.black)
      .text(
        'Дээрх зөвлөмжүүдийг тууштай хэрэгжүүлснээр таны TEQ оноо аажмаар нэмэгдэж, энэ нь бодит амьдрал дээр бусдыг ойлгон тэдэнд дэм тус болох чадвар дээшилж буйн илрэл болох юм. Эмпати хөгжих нь нэг өдрийн ажил биш ч өдөр бүрийн жижиг өөрчлөлт, хүчин чармайлт таныг улам өрөвч, энэрэнгүй, бусдад эерэгээр нөлөөлдөг хүн болоход хүргэнэ. \n\nБусдын сэтгэл хөдлөлийг ойлгож, илүү дулаан уур амьсгалыг бүрдүүлэхэд туслах дараах 20 хэллэгийг өдөр тутмын ажил,  харилцаандаа хэрэглээд нэг үзээрэй.',
        doc.x,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text('Ажлын байран дээрээ эмпатик байдлаа илэрхийлэх 20 хэллэг', {
        align: 'justify',
      })
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .lineGap(lh.lg)
      .list(
        [
          'Чамд ямар санагдаж байгааг ойлгож байна.',
          'Энэ нөхцөл байдал чамд хэцүү/чухал/гайхалтай санагдаж байгаа байх, тийм үү?',
          'Энэ төсөл/даалгавар чамд хүндхэн санагдаж байгааг мэдэрч байна.',
          'Тийм ээ, би чиний хэлсэнтэй санал нийлж байна.',
          'Би чиний талд байна.',
          'Би яаж тусалж чадах вэ?',
          'Би чамд хэрэгтэй зүйлийг хийж өгч чадна шүү.',
          'Чамд яг одоо ямар санагдаж байна?',
          'Ийм зүйл тохиолдсонд үнэхээр харамсаж байна.',
          'Надад ийм зүйл тохиолдсон бол бас л хэцүү байх байсан.',
          'Чамайг ахиц дэвшил гаргаж байгааг харахад үнэхээр таатай байна.',
          'Сайн ажилласан байна.',
          'Надад сэтгэлээ нээж, хуваалцсанд баярлалаа.',
          'Чиний хэлэх гэсэн санаа чинь… энэ үү?',
          'Чиний өмнөөс баярлаж байна.',
          'Энэ асуудлын талаар чи юу гэж бодож байна?',
          'Чи энэ нөхцөл байдалд хэр удаж байгаа вэ?',
          'Яг ямар асуудал тулгарсан бэ?',
          'Хэрвээ тусламж хэрэгтэй бол надад хэзээд хэлээрэй.',
          'Чиний санаа зовниж байгааг/баярлаж байгааг ойлгож байна.',
        ],
        doc.x,
        doc.y,
        {
          bulletRadius: 1.5,
          listType: 'numbered',
          align: 'justify',
          bulletIndent: 20,
        },
      );
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
    console.log(result.result.toLowerCase());
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
        `${firstLetterUpper(style?.text)} (${result.result.toUpperCase()}) `,
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
    console.log(result);
    // console.log(buffer2);
    const doc = await this.createDefaultPdf(
      result?.lastname ?? '',
      result?.firstname ?? '',
      result?.assessmentName,
      result.code,
    );
    try {
      const date = new Date(exam.userStartDate);
      if (exam.assessment.report == ReportType.CORRECT)
        await this.singleTemplate(doc, result, firstname, lastname, date, exam);
      if (exam.assessment.report == ReportType.SETGEL)
        await this.setgelTemplate(doc, result, firstname, lastname, date, exam);
      if (exam.assessment.report == ReportType.EMPATHY)
        await this.empathyTemplate(
          doc,
          result,
          firstname,
          lastname,
          date,
          exam,
        );
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
