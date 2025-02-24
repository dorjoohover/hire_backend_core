import { Injectable } from '@nestjs/common';
import { TextOptionsLight, jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { index, TableOptions, TextOptions } from './pdf.interface';
import PdfPrinter from 'pdfmake';
import { VisualizationService } from './visualization.service';
import path from 'path';
import fs from 'fs';
import nodeHtmlToImage from 'node-html-to-image';
import PDFDocument from 'pdfkit';
import {
  assetPath,
  colors,
  dateFormatter,
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

const fonts = {
  CIP: {
    bold: path.join(__dirname, '../../../src/assets/fonts/GIP-ExtraBold.woff'),
    boldItalics: path.join(
      __dirname,
      '../../../src/assets/fonts/GIP-ExtraBoldItalic.woff',
    ),
    normal: path.join(__dirname, '../../../src/assets/fonts/GIP-Medium.woff'),
    italics: path.join(
      __dirname,
      '../../../src/assets/fonts/GIP-MediumItalic.woff',
    ),
  },
};

@Injectable()
export class PdfService {
  constructor(
    private vis: VisualizationService,
    private single: SinglePdf,
  ) {}

  async singleTemplate(
    doc: PDFKit.PDFDocument,
    assessment: AssessmentEntity,
    exam: ExamEntity,
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

    await this.single.default(doc, assessment, exam);
    footer(doc);
    doc.addPage();
    header(doc, name, date, assessment.name);
    await this.single.examQuartile(doc, exam.assessment, +exam.result);
    footer(doc);
  }

  async discTemplate(
    doc: PDFKit.PDFDocument,
    assessment: AssessmentEntity,
    exam: ExamEntity,
    name: string,
    date: Date,
    res: any,
  ) {
    doc.font(fontBold).fontSize(16).fillColor(colors.orange).text('Оршил');
    doc
      .moveTo(30, doc.y)
      .strokeColor(colors.orange)
      .lineTo(75, doc.y)
      .stroke()
      .moveDown();
    doc
      .font(fontNormal)
      .fontSize(14)
      .fillColor(colors.black)
      .text(DISC.preface);
    doc.text(
      'Таны өгсөн хариултанд үндэслэн дискийн 4 төрлөөс танд давамгайлж буй хэв шинжийг доорх DiSC графикт харууллаа. Энэхүү тайлангийн бүлэг бүрийн тайлбарууд эдгээр оноонуудад суурилсан болно. Та уг тайлангаас өөрийн хамгийн өндөр үзүүлэлт бүхий дискийн төрөл, түүний боломжит давуу болон сул талууд, мөн таныг илэрхийлэх загварын Хувь хүний хэв шинжтэй танилцах болно. ',
    );
    doc.image(assetPath('report/disc/graph'));
    doc.font(fontBold).text('Таны хувь хүний хэв шинж: ', { continued: true });
    doc.fillColor(colors.orange).text(exam.result);
    footer(doc);
    header(doc, name, date, assessment.name);
    console.log(exam.result);
    // const style = Object.entries(DISC.pattern).find(([_, value]) => {
    //   return Object.keys(value).includes(exam.result);
    // });
    // console.log(style);
    const style = DISC.values.d;
    let result = style[0] ? DISC.values[style[0].toLowerCase()] : '';
    // let result = ''
    doc
      .font(fontNormal)
      .fontSize(14)
      .fillColor(colors.black)
      .text(
        'Ажлын орчны талаарх таны хандлага, түүнийг хяналтандаа байлгадаг түвшинг тодорхойлох асуумжид таны өгсөн хариултыг шинжлэхэд та' +
          result +
          'хэв маягтай хүн юм байна. Нягт нямбай шинжийг илэрхийлэх ерөнхий тайлбарыг уншиж таны зан төлөвтэй хэр тохирч байгааг сонирхоно уу. Бусад шинжүүдийн талаархи тайлбарыг 14-р хуудаснаас уншиж танилцахыг таньд зөвлөж байна. ',
      );
    doc.moveDown(2);
    doc.font(fontBold).fontSize(16).text(result);
    doc.moveDown();
    const character =
      DISC.characterDescription[
        (style?.[0] ?? '0').substring(0, 1).toLowerCase()
      ];
    doc
      .font(fontNormal)
      .fontSize(14)
      .text(
        exam.lastname +
          ' танд ' +
          result +
          ' шинж хүчтэй илэрсэн байна. ' +
          character,
      );
    footer(doc);

    const index: {
      [key: string]: string[];
    } = res.index;
    for (const [k, i] of Object.entries(index)) {
      header(doc, name, date, assessment.name);
      doc
        .font(fontBold)
        .fontSize(16)
        .text('Үе шат II: Таныг тодорхойлох онцлог шинжүүд');
      doc.text(k.toUpperCase() + ' шинж чанар');

      const value = DISC.values[k.toLowerCase()];

      doc
        .font(fontNormal)
        .fontSize(14)
        .text(
          `Асуумжинд өгсөн хариултанд үндэслэн таны ${firstLetterUpper(value)} ${k.toUpperCase()} байдлыг дараах тайлбаруудаар тодорхойлж болох юм. Та өөрийн санал нийлж буй давуу талуудаа харандаагаар дугуйлж, анхаарвал зохих зан төлөвүүдийг тодруулна уу.`,
        );

      for (const v of i) {
        doc.font(fontBold).text(`${v}:`, {
          continued: true,
        });
        const text = DISC.description[k][v];
        doc.font(fontNormal).text(text).moveDown();
      }
      footer(doc);
    }

    header(doc, name, date, assessment.name);
    doc
      .font(fontBold)
      .fontSize(16)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc
      .font(fontNormal)
      .fontSize(14)
      .text(
        'Давамгайлагч, Нөлөөлөгч, Нягт нямбай, Туйлбартай гэсэн үндсэн 4 шинжийн үзүүлэлтүүд нийлж хувь хүнийг тодорхойлох өвөрмөц хэв шинжийг бий болгодог. Судлаачид нийтлэг ажиглагддаг онцлог 15 хэв шинжийг илрүүлсэн. Онолын бөгөөд практикийн нэмэлт судалгааны дүнд тэдгээр хэв шинжүүдийн онцлогуудыг тодорхойлжээ. Эдгээр онцлогуудыг мэдсэнээр та өөрийгөө илүү ихээр танин мэдэх болно. \nАсуумжинд өгсөн хариултын дагуу та чиглүүлэгч хэв шинжийн бүлэгт хамаарч байна. Доорх тайлбаруудыг уншиж таны зан төлөвтэй тохирч буй хэсгүүдэд анхаарал хандуулна уу.',
      );
    doc.moveDown();
    doc
      .font(fontBold)
      .fontSize(16)
      .text('Хэв шинж: ' + exam.result.toUpperCase());
    doc.text(exam.lastname + ' таны мотиваци');
    // !
    doc
      .font(fontNormal)
      .text(
        exam.lastname +
          'Төгөлдөр та чиглүүлэгч хэв шинжтэй учраас бусдыг ятгах гайхамшигтай чадвартай байж магадгүй. Дийлэнх тохиолдолд та сэтгэл булаам байж бусдаар өөрийн хүссэн зүйлээ хийхийг ятгаж чаддаг. Харин хэн нэг нь таны саналтай зөрөлдвөл илт сүрдүүлэх замаар зорилгодоо хүрэх гэж хичээдэг байх магадлалтай. Ихэнх тохиолдолд та өөрийн ажлын орчин, хамтран ажиллагч нараа хянаж байх сонирхолтой.\nТа өөрийн хүсэн хүлээсэн үр дүнгээ бодол санаандаа маш тодорхой болгож чаддаг. Гэхдээ өөрийн энэхүү амбицаа бусдад үргэлж тайлбарлаад байдаггүй. Зорилгодоо хүрэхийн тулд та дийлэнхдээ хамтын ажиллагаа болон бусдыг ятгах чадварыг илүүд үздэг бөгөөд бусдыг дарангуйлахыг төдийлөн хүсдэггүй. \nТа бусдыг ятгах хандлагтай хэдий ч гэсэн бусад хүмүүс руу анхаарал халамж тавьдаггүй. Бусдаас зай барьдаг таны энэ байдал нь бусдын санаа бодол, үйлдлийг өөрчлөх гэсэн оролдлогтой чинь хамааралтай байж магадгүй. ',
      );
    footer(doc);
    header(doc, name, date, assessment.name);
    doc
      .font(fontBold)
      .fontSize(16)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc.text(exam.lastname + ' таны ажлын дадал зуршил');
    // !
    doc
      .font(fontNormal)
      .text(
        'Та ажлын байран дээрээ хүмүүсийг сэдэлжүүлэх болон шинэ зүйлийг санаачлахдаа бусдаас илүү байдаг. Аливаа асуудалтай тулгамдсан үед та өөрийн ярианы чадвар, бусдад заавар зөвлөгөө өгөх төрөлхийн чанараа ашигладаг.\nТа багтаа хэнийг багтаахыг хүсч байгаа эсэхээ ихэнх тохиолдолд мэдэж байдаг. Таны сонирхлыг байгууллагад нөлөөтэй хүмүүс үргэлж татдаг ба та хамтран ажиллагч нараа хувийн зан чанар, хэв маягын хүчтэй байдлаас нь хамааруулан дүгнэх хандлагтай байдаг.\nТаны хувьд хамтран ажиллагч нар таны зорилгыг хүлээн зөвшөөрөх нь чухал бөгөөд хүлээн зөвшөөрсний дараа л та хамтран ажиллах жинхэнэ төлөвлөгөөгөө танилцуулдаг.\nТа өөрийн хамтран ажиллагч нарынхаа хүсэл, сэдлийг тодорхойлохдоо гаргууд сайн байж магадгүй. Та өөрийн энэ чадвар  дээрээ суурилан өөрийн талд байгаа хүмүүстээ тохирсон шагнал урамшууллыг олгож чаддаг. Жишээлбэл та хүлээн зөвшөөрөгдөх сонирхолтой хамтрагч нартаа нөхөрлөлийг санал болгож, тогтвортой байдал хүссэн хамтрагч нартаа аюулгүй байдлыг амалдаг. Бүр цаашлаад та нөлөөтэй  байхыг хүссэн нэгэнд нь эрх мэдэл олгодог ч байж магадгүй.\nҮр ашигтай гэж үзвэл та зорилгын тань төлөө зүтгэж байгаа хамтрагч нараа магтаалаар булж эсвэл тэдэн дээр бүх зүйл тогтож байгаа гэж ойлгуулдаг. Таньд тусламж шаардлагтай үед та илүүтэйгээр бусдыг ятгадаг байх магадлалтай. Байнга хийгддэг, цаг үрсэн ажилбаруудыг хэн нэгнээр хийлгүүлэхийн тулд та бэлэг ч санал болгож магадгүй.\nЗорилгодоо хүрэх явцдаа та заримдаа яхир, түрэмгий зан авиртай болдог байх магадалтай. Учир нь та түрэмгий зан төлвийг өөрийн хүсэл эрмэлзэлээ илэрхийлэх байж болох хувилбаруудын нэг гэж үздэг байж магадгүй. Хэрвээ шаардлагтай гэж үзвэл та хамтран ажиллагч нарынхаа гаргасан шийдвэрийг үл хүндэтгэхээсээ сийхгүй  байж магадгүй юм. \nТа бусдын зүрхэнд айдас хуруулах чадвартай хэдий ч таны хамтран ажиллагч нар таныг хүндэтгэдэг байх магадлалтай.  Аль ч тохиолдолд нь та бусдын сэтгэлзүйн байдлыг үл тоон тэднийг өдөөхийн тулд сайтар  түншиж өгдөг. ',
      );
    footer(doc);
    header(doc, name, date, assessment.name);
    doc
      .font(fontBold)
      .fontSize(16)
      .text('Үе шат III: Таны хувь хүний хэв шинж ');
    doc.text(exam.lastname + ' таныг тольдвол;');
    // !
    doc
      .font(fontNormal)
      .text(
        `Та зорилго нь арга замаасаа илүү чухал гэдэгт итгэдэг төдийгүй  зорилгод хүрэх явцад бүрдсэн уур амьсгалыг хянаж байх нь таны хувьд чухал байж магадгүй. Таны баримталдаг иймэрхүү  шулуухан арга зам нь үүрэг  даалгавар гайхамшигтайгаар биелэгдэх, итгэмээргүй үр дүнд хүргэх магадлалтай. Гэхдээ таны баримтладаг энэ арга нь хамтран ажиллагч нарын  дунд үл итгэсэн, тааруу уур амьсгал бүрдүүлж болзошгүй байдаг. Зарим тохиолдолд хамтран ажиллагч нар чинь таньд өөрийгөө ашиглуулсан эсвэл тэдэнгүйгээр үүнийг та хийх боломжгүй байсан гэж боддог ч байж магадгүй. Хүмүүс таны харизма, сэтгэл татам байдалд чинь татагддаг хэдий ч заримдаа тэд таны “жинхэнэ дотор хүн” чинь хэн бэ гэдгийг мэддэггүй гэж боддог. Та энэхүү хөндий байдлыг засахын тулд бусад хүмүүсийг өсч дэвжихэд туслах  чин хүсэл эрмэлзэлтэйгээ харуулах хэрэгтэй байх. Ингэхийн тулд та өөрийнхөө хамтран ажиллагч нарыг ажлын нөөц гэж харахаас илүүтэй тэднийг илүүтэй сонирхох, ойлгохыг хичээх хэрэгтэй болов уу. \nХамтран ажиллагч нартайгаа хэт ойртохоос сэргийлдэг таны зан өөрийн статусыг алдах вий гэсэн айдсаас үүдэлтэй байж магадгүй. Хүмүүсийг ятгах, зааварлах таны чадвар нь ажлыг урагшлуулахад тус дөхөм болдог гэдэгт та итгэдэг. Түүнчлэн та өөрийгөө сул дорой харагдуулахыг хүсдэггүй төдийгүй  өөрийнхөө нөлөөлөх чадварыг хэвээр хадгалахыг үргэлж хичээдэг. Гэхдээ та бусад хүмүүсийг  ятгахын тулд заавал түрэмгий байдал үзүүлэх шаардлагагүй гэдгийг санахад илүүдэхгүй. \n${exam.lastname} та  бусдыг ятгах, баг удирдах  гайхамшигтай чадвартай нөлөө бүхий хүн байх магадалтай. `,
      );
    footer(doc);
    header(doc, name, date, assessment.name);
    doc.font(fontBold).fontSize(16).text('ДиСК загвар');
    doc
      .font(fontNormal)
      .fontSize(14)
      .text(
        'DiSC Давамгайлах (D), Нөлөөлөх (I), Туйлбартай (S), мөн Нягт нямбай (C) гэсэн дөрвөн  шинжийг дөрвөн талт хүснэгтэн загвараар тайлбарладаг. Зарим хүмүүст зөвхөн нэг төрлийн хэв шинж илэрдэг бол заримд хоёр, эсвэл бүр гурван хэв шинж ч  илэрч болно.\nТаны Диск загвар бусад хүмүүсийнхээс хэр их ялгаатай бол? Дискийн бусад загваруудтай адил төстэй ямар шинж байна вэ? Эдгээр асуултуудыг ойлгоход доорх Диск загвар танд туслана. Доорх хүснэгтэнд зэрэгцээ байрлах дискийн зан төлвийн төрлүүд нь өөр хоорондоо ямар нэгэн ижил төстэй шинжтэй. Таны харж байгаагаар C болон S төрлийн хүмүүс нь ажлын орчиндоо өөрсдийгөө нөлөөлөл багатай хэмээн үнэлдэг нь харагдаж байна. Тэд өөрийгөө бусдад нөлөөлөх чадвар багатай гэж боддог тул эргэн тойрныхоо хүмүүст илүү уусах хандлагатай байдаг. Нөгөө талдаа D болон I төрлийн хүмүүс нь өөрсдийгөө ажлын орчндоо нөлөөлөл ихтэй байдаг гэж үздэг тул илүү өөртөө итгэлтэй байх хандлагатай. Түүнчлэн, D болон C төрлийн хүмүүс ажлын орчиноо таагүй (хаалттай, эсэргүүцэж) хэмээн хүлээж авдаг бол I болон S төрлийн хүмүүс эсрэгээрээ илүү таатай (нөхөрсөг, дэмжлэг үзүүлдэг) хэмээн хүлээж авдаг.',
      );
    doc.text(' Өөрийгөө хүрээлэн буй орчноосоо илүү хүчирхэг гэж ойлгодог');
    doc.text('Хүрээлэн буй орчноо таагүй гэж ойлгодог');
    doc.text('Хүрээлэн буй орчноо таатай гэж ойлгодог');
    doc.text('Хүрээлэн буй орчныг өөрөөсөө илүү хүчирхэг гэж ойлгодог');
    doc.image(assetPath('report/disc/graph'));
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

  async createPdfInOneFile(
    assessment: AssessmentEntity,
    exam: ExamEntity,
    res: any,
  ) {
    const name = `${exam.lastname} ${exam.firstname}`;

    // const buffer2: any = await this.generateImage(htmlCode);
    // console.log(buffer2);
    const filePath = './chart.pdf';
    const out = fs.createWriteStream(filePath);
    const doc = await this.createDefaultPdf(
      exam.lastname,
      exam.firstname,
      assessment.name,
    );
    const date = new Date(exam.userStartDate);
    header(doc, name, date, assessment.name);
    doc
      .font(fontNormal)
      .fillColor(colors.black)
      .fontSize(14)
      .text(assessment.description)
      .moveDown();
    doc.font(fontBold).text('Хэмжих зүйлс').moveDown(1);

    doc.font(fontNormal).text(assessment.measure).moveDown(1);
    if (assessment.type == ReportType.CORRECT)
      await this.singleTemplate(doc, assessment, exam, name, date);
    if (assessment.type == ReportType.DISC) {
      await this.discTemplate(doc, assessment, exam, name, date, res);
    }
    doc.pipe(out);
    // doc.image(buffer2, 50, 400, { width: 260 });
    doc.end();

    await new Promise((resolve, reject) => {
      out.on('finish', resolve);
      out.on('error', reject);
    });

    return filePath;
  }

  async createSingleCorrect() {}
}
