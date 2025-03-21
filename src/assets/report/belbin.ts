import { Injectable } from '@nestjs/common';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ResultDetailEntity } from 'src/app/exam/entities/result.detail.entity';
import { ResultEntity } from 'src/app/exam/entities/result.entity';
import {
  assetPath,
  colors,
  firstLetterUpper,
  fontBold,
  fontNormal,
  footer,
  fz,
  header,
  marginX,
  marginY,
} from 'src/app/exam/reports/formatter';
import { VisualizationService } from 'src/app/exam/visualization.service';

@Injectable()
export class Belbin {
  constructor(private vis: VisualizationService) {}
  static about =
    'Энэхүү багт гүйцэтгэх үүргийг тодорхойлох тестийн тайлан нь таны үнэлгээний үр дүнд суурилсан болно. Энэ тайлангаас та дараах зүйлсийг мэдэх боломжтой.\nҮүнд:\n\tТаны багт гүйцэтгэх голлох дүр\n\tБагт оруулж буй хувь нэмэр, таны гүйцэтгэж буй багийн дүр';
  static advice =
    'Дан ганц зан төлөвийг тодорхойлох бус багт гүйцэтгэх үүргийг нь давхар бодолцож багийг бүрдүүлэх нь багийн хамтын ажиллагааг сайжруулахад чухал ач холбогдолтой. Белбиний багийн дүрийг тодорхойлох тестийн хувьд хувь хүний ажлын байран дээрх зан төлөв, хариу үйлдлүүдэд суурилан тухайн хүнд тохирох хамгийн тохиромжтой багийн дүрийг тодорхойлдгоороо Психометрик тестүүдээс ялгаатай юм.\n\nЭнэхүү тестийн үр дүнд сайн, муу, зөв, буруу хариулт гэж байхгүй болохыг анхаарна уу. Энэхүү тайлантай танилцсаны дараа багийн гишүүдээ ойлгох, хамтарч ажиллах чадвараа хөгжүүлэх гарын авлагатай ажиллаарай.';
  static values = [
    'Plant',
    'Monitor/Evaluator',
    'Specialist',
    'Shaper',
    'Implementer',
    'Completer/Finisher',
    'Coordinator',
    'Team Worker',
    'Resource Investigator',
  ];

  static agents = {};

  public result(v: string) {
    let res = {
      name: '',
      key: '',
      description: '',
      hobby: '',
      contribution: '',
      describe: '',
      character: '',
      color: '',
      fill: '',
      icon: '',
      agent: '',
    };

    const value = v.toLowerCase();
    if (value == 'plant') {
      res = {
        name: 'СЭТГЭГЧ',
        key: 'pl',
        character: 'Интроверт, сэтгэгч, мөрөөдөмтгий,философич',
        description:
          'Багийн бүтээлчээр сэтгэгч байдаг. Шинийг санаачилдаг, ажлын хамгийн эхний хар зураг, хувилбарыг ихэвчлэн санал болгодог. Чөлөөтэй, фантази сэтгэдэг, шинэ нөхцөлд ч асуудлыг цогцоор нь дүрслэн бодож бүтээлч хувилбар санал болгодог. Хэт практикал биш, заримдаа бусад хүмүүс өөрөөс нь юу шаардаж байгааг анзаарахгүйгээр ажиллах хандлагатай.',
        hobby:
          'Оюун ухаан сорьсон ажил, бүтээлч, тайван, нам гүм байдал, хүлээн зөвшөөрөгдөх байдал зэрэгт дуртай.',
        contribution:
          'Бүтээлч байдал, шинэлэг санааг авчирдаг. Хүнд асуудлуудын шийдлийг олдог.',
        describe:
          'Хэт бодитой биш, туршиж үзэлгүйгээр ба практик үр дүнг сайн бодолгүйгээр хийсвэр санааг сэтгэн гаргаж ирдэг.',
        color: colors.sun,
        fill: colors.sun,
        icon: 'plant',
        agent: 'Бодолд төвлөрсөн дүрүүд',
      };
    }
    if (value == 'monitor/evaluator')
      res = {
        name: 'ШИНЖЭЭЧ',
        key: 'me',
        character:
          'Ухаалгаар үнэлгээ өгдөг, асуудлыг задлан шинжилдэг, асуулт асууж логик учир шалтгааныг тодорхойлж гаргадаг.',
        description:
          'Эмзэг, мэдрэмтгий, болгоомжтой, шүүмжлэлтэй ханддаг. Багийн шинжээч нь байдаг. Тэрээр үргэлжнөхцөл байдлыг задлан шинжилдэг. Аливааг удаан, нягт нямбай хийдэг. Шийдэл нь барагтаа л бол буруу байдаггүй',
        contribution:
          'Аливааг тоймлон, үнэн зөв дүн шинжилгээ, дүгнэлтүүдийг гаргаж өгдөг. Стратегийн болон шүүмжлэлт чухал санааг багт оруулдаг.',
        describe:
          'Удаан байж магадгүй, хэтэрхий шүүмжлэлтэй хандаж магадгүй. Заримдаа тодорхойгүй, хүйтэн хөндий мэт харилцаатай.',
        hobby: 'Тоймлон дүн шинжилгээ хийх, нэгтгэн дүгнэж ойлгох дуртай.',
        color: colors.gray,
        fill: colors.gray,
        icon: 'monitor',
        agent: 'Бодолд төвлөрсөн дүрүүд',
      };
    if (value == 'specialist')
      res = {
        name: 'МЭРГЭЖИЛТЭН',
        key: 'sp',
        character:
          'Мэргэшсэн, чимээгүй, үүрэг даалгаварт хүчтэй төвлөрдөг, зөвлөгч байдаг.',
        contribution:
          'Нарийн мэргэшсэн чиглэлээрээ багтаа зөвлөх үүрэгтэй байдаг.',
        describe:
          'Нээлттэй хамтран ажиллах ур чадвар дутдагаас болж зарим хүмүүс таны зөвлөгөөг авахгүй байх магадлалтай.',
        hobby:
          'Бие даан ажиллах дуртай, тайван саад болохооргүй нөхцөлд ажиллахыг дэмждэг, мэдлэгээ гайхуулах боломж гарвал таатай ханддаг.',
        description:
          'Мэргэшсэн чиглэлдээ жинхэнэ мэдлэгийн уурхай байдаг. Зөвлөгөө өгөх дуртай. Өөрийнхөө мэргэшсэн чиглэлээрээ мэдлэгээ бусдад хуваалцаж, зарим тохиолдолд бардамнах дуртай. Техникийн ур чадвараараа багтаа ноёрхдог. Хамт олны нийтийг хамарсан албан бус үйл ажиллагааг хэр бараг тоодоггүй.',
        color: colors.moss,
        fill: colors.moss,
        icon: 'specialist',
        agent: 'Бодолд төвлөрсөн дүрүүд',
      };
    if (value == 'shaper')
      res = {
        key: 'sh',
        name: 'ХЭЛБЭРЖҮҮЛЭГЧ',
        character:
          'Хүсэл тэмүүлэлтэй, эрмэлзэлтэй, өрсөлдөөч, зоригтой, тэвчээргүй.',
        contribution:
          'Багийн ажлыг урагшлуулахад өндөр хувь нэмэр оруулдаг, үр дүнтэй бүтээмжтэй ажилладаг, асуудлын ард ямагт гардаг, зөрчилдөөнийг амархан шийддэг.',
        describe:
          'Хүмүүсийг заримдаа уурлуулах гомдоодог. Амбицгүй хүмүүст дургүй ханддаг.',
        hobby:
          'Өрсөлдөөч байдал, үр дүнд тулгуурласан хандлагад дуртай ба ямагт хожихыг хүсдэг.',
        description:
          'Хүсэл тэмүүлэлтэй, эрмэлзэлтэй, хурдан гүйцэтгэл хийх гэж яардаг. Хүч сорьсон сорилтууд хайдаг. Яг хугацаандаа багтааж дуусгах, зорилгодоо хүрэхийг эрмэлздэг. Заримдаа уцаарлах эсвэл сэтгэл хөдлөлөөрөө асуудалд хандах байдал гаргадаг.',
        color: colors.red,
        fill: colors.rust,
        icon: 'shaper',
        agent: 'Үйлдэлд төвлөрсөн дүрүүд',
      };
    if (value == 'implementer')
      res = {
        key: 'imp',
        name: 'ХЭРЭГЖҮҮЛЭГЧ',
        character:
          'Аливаад зохион байгуулалттай ханддаг, шаргуу хөдөлмөрч, амьдралд ойрхон бодитой, мэргэжлийн талаас ханддаг, ямар ажил юу болохгүй байна гэдгийг маш сайн олж хардаг.',
        contribution:
          'Багийн практик хэрэгжилтийг зохион байгуулалтаар хангадаг, төлөвлөгөө, үйл явцыг хянаж, түүнд санаа тавьдаг. Төлөвлөгөөний хэрэгжилтийг маш сайн хангаж гүйцэтгэдэг, системтэй, цэгцтэй ажиллагаагаар багт хувь нэмэр оруулдаг.',
        describe:
          'Бодож тооцоолохоосоо өмнө үйлдэл хийдэггүй, уян хатан бус байдаг, хэт хурдан шинэчлэлтийг хүлээн авдаггүй.',
        hobby:
          'Тодорхой нарийн заавар, тогтмол, хэмнэлтэй ажиллах, хоёрдмол санаагүй тодорхой тохиролцоотой байх.',
        description:
          'Хэрэгжүүлэгч нь баг доторх практик зохион байгуулагч байдаг. Сахилга баттай, зарчимч, эмх цэгцтэй ба даалгаварт төвлөрсөн байдаг. Үр дүн хурдан гардаг ажлуудад санаа нь илүү төвлөрч, түүнийг төлөвлөж ажилладаг. Шинэ санаачилга хэрэг болох үед хэтэрхий практик тал руу хандаж, хуучинсаг байдлаар ханддаг.',
        color: colors.steel,
        fill: colors.steel,
        icon: 'implementer',
        agent: 'Үйлдэлд төвлөрсөн дүрүүд',
      };
    if (value == 'completer/finisher')
      res = {
        name: 'ДУУСГАГЧ',
        key: 'cf',
        description:
          'Дуусгагч нь аливааг буруудаж магадгүй гэдгийг дандаа мэдэрдэг төрөлхийн авьяастай. Тийм ч утгаараа илүү деталь зүйлд анхаарлаа тавьдаг. Дахин дахин нягталж шалгадаг. Төгс байдлыг эрэлхийлдэг. Чанар болон аюулгүй байдалд анхаарлаа хандуулдаг. Заримдаа хэтэрхий хянамгай байдаг тул ажлаа бусдад итгэж шилжүүлдэггүй, ихэвчлэн өөрөө хийх гэж оролддог.',
        contribution:
          'Нарийн зүйлсийг олж харах байдал сайтай тул багийн ажлыг нягталж байдаг. Болзошгүй аюулыг урьдчилж хардаг, чанар, эрсдэлийг шинжилдэг.',
        hobby:
          'Аюулгүй, эрсдэлгүй байдал, чанартай байх, деталь хандах зэрэгт тааламжтай ханддаг.',
        describe:
          'Хэт их санаа зовомтгой, иймээс заримдаа зориг муутай, ажлаа шилжүүлэх дургүй, жижиг сажиг зүйлээр хөөцөлдөх хандлагатай байдаг.',
        character:
          'Ухамсартай, шударга, төгс байдлыг эрэлхийлэгч, детальд төвлөрдөг, хэтэрхий санаа зовомтгой, нягт нямбай.',
        color: colors.brown,
        fill: colors.brown,
        icon: 'completer',
        agent: 'Үйлдэлд төвлөрсөн дүрүүд',
      };
    if (value == 'coordinator')
      res = {
        name: 'ЗОХИЦУУЛАГЧ',
        key: 'co',
        description:
          'Багийн жинхэнэ зохицуулагч нь байдаг. Аливаа үйл ажиллагааны процедурыг нарийвчлан хянадаг. Багийн гишүүн бүрийн хүсэл зоригийг нэгтгэдэг. Хүмүүсийн ур чадвар, боломж, авьяасыг бүрэн дүүрэн ашигладаг, багийн гишүүддээ итгэл хүлээлгэж ажил шилжүүлдэг. Гэхдээ заримдаа бусдад хэт их ачаалал өгөх хандлагатай байдаг..',
        describe:
          'Зорилгодоо хүрэхийн тулд ямар ч хамаагүй арга хэрэглэдэг. Ажлуудаа бусдад итгэж шууд шилжүүлдэг.',
        hobby:
          'Процедур, шат дараалал, шийдвэр, хүчин чармайлт, зорилго тодорхойлсон байдал, хамтын ажиллагаа.',
        contribution:
          'Зорилгоо тодорхой болгодог, ажлыг бүтэцлэж, зохион байгуулалтанд оруулдаг. Бэрхшээлтэй, хүнд шийдвэрүүдтэй өөрөө тулж хариуцан шийдвэр гаргаж чаддаг.',
        character:
          'Жинхэнэ зохицуулагч, тайван, тэвчээртэй, эерэг, нээлттэй, сониуч',
        color: colors.sky,
        fill: colors.sky,
        icon: 'coordinator',
        agent: 'Хүмүүст төвлөрсөн дүрүүд',
      };

    if (value == 'team worker')
      res = {
        name: 'БАГИЙН ТОГЛОГЧ',
        key: 'tw',
        character:
          'Нийтэч, харилцаа сайтай, хүмүүст төвлөрдөг, зөөлөн, дипломатч, нийцтэй, үгэнд ордог, хөгжилтэй, мэдрэмжтэй.',
        contribution:
          'Харилцаа төвтэй, мэдрэмжтэй, халамжтай, хамтын ажиллагааг багт бий болгож чаддаг. Багт сэтгэлзүйн дулаан, таатай уур амьсгалыг бий болгодог.',
        describe:
          'Шийдэмгий биш, зөрчилдөөнөөс зайлсхийдэг, зөрчилдөөнтэй асуудалтай нүүр тулахаас зайлсхийдэг.',
        hobby:
          'Хамтач, уялдаа холбоотой, хүнтэй сайн харилцаа холбоотой байхад тааламжтай ханддаг.',
        description:
          'Багийн хамгийн мэдрэмтгий нь. Бусдадаа тусч, таатай уур амьсгалыг бүрдүүлэгч, хамтран ажиллахын ач тусыг чухалчилдаг. Хүмүүсийг эвтэй байх нөхцөлийг бүрдүүлэхийг хичээдэг. Хэцүү цаг үед шийдвэр гаргахдаа тааруу.',
        color: colors.leaf,
        fill: colors.leaf,
        icon: 'teamworker',
        agent: 'Хүмүүст төвлөрсөн дүрүүд',
      };
    if (value == 'resource investigator')
      res = {
        name: 'САНААЧЛАГЧ',
        key: 'ri',
        character:
          'Экстроверт, харилцаа сайтай, хөгжилтэй, алиа, урам зориг тэмүүлэлтэй, байгалиас заяасан санаачлагч, сониуч',
        contribution:
          'Олон тооны танилын хүрээ нь багт хэрэгтэй байдаг. Түүнчлэн шинэ санаа боломжуудыг багт авчирдаг. Маш сайн санаачлагч байдаг.',
        describe:
          'Хэт амархан хувирах, өөрчлөгдөх, хэт их урам зориг, хэт өөдрөг байдал, өмнөхөө дуусгаагүй байж өөр ажил эхлүүлдэг.',
        hobby:
          'Шинэчлэлд дуртай, хүмүүстэй тогтоосон харилцаа холбоо сайн байхыг дэмждэг, олон талт, адал явдалтай байдалд тааламжтай ханддаг.',
        description:
          'Гадагшаа чиглэсэн, баяр баясгалантай, олон хүмүүстэй харилцаатай, сайн найз нөхөр байдаг. Түүнчлэн багаас гадуур танилын хүрээ ихтэй. Хүмүүсийг дэмждэг, адал явдалд дуртай, нээлттэй сэтгэлгээтэй, шинэ санаа гаргахыг эрмэлздэг. Байгалиас заяасан сайн тал нь аливаа харилцааг тогтоох түүнийг авч үлдэх хадгалах шинжтэй.',
        color: colors.purple,
        fill: colors.purple,
        icon: 'resource',
        agent: 'Хүмүүст төвлөрсөн дүрүүд',
      };
    return res;
  }

  // template

  public async agent(
    doc: PDFKit.PDFDocument,
    value: {
      name: string;
      key: string;
      description: string;
      hobby: string;
      contribution: string;
      describe: string;
      character: string;
      color: string;
      fill: string;
      icon: string;
      agent: string;
      value: string;
    },
  ) {
    const image = value.icon;
    let y = doc.y;
    let x = doc.x + marginX;
    doc.lineWidth(5);
    doc
      .moveTo(x, y)
      .strokeColor(value.fill)
      .lineTo(doc.page.width - marginX, y)
      .stroke();
    y += 12;
    doc.image(assetPath(`icons/belbin/${image}`), x, y, {
      width: 30,
    });
    x += 36;

    doc
      .font(fontBold)
      .fontSize(fz.sm)
      .fillColor(value.color)
      .text(value.value, x, y);
    doc.text(firstLetterUpper(value.name), x, y + 14);
    doc.y = y;
    const agentWidth = doc.text(value.agent, {
      align: 'right',
      width: 200,
    });
    x = marginX;
    doc.y += 10;
    doc.font(fontNormal).fillColor(colors.black).text(value.description);
    doc
      .font(fontBold)
      .text('Шинж чанар: ', {
        continued: true,
      })
      .font(fontNormal)
      .text(value.character);
    doc
      .font(fontBold)
      .text('Дуртай зүйлс: ', {
        continued: true,
      })
      .font(fontNormal)
      .text(value.hobby);
    doc
      .font(fontBold)
      .text('Багт оруулах хувь нэмэр: ', {
        continued: true,
      })
      .font(fontNormal)
      .text(value.contribution);
    doc
      .font(fontBold)
      .text('Бусад хүмүүс таныг тодорхойлохдоо: ', {
        continued: true,
      })
      .font(fontNormal)
      .text(value.describe);
  }

  public async template(
    doc: PDFKit.PDFDocument,
    result: ResultEntity,
    date: Date,
    firstname: string,
    lastname: string,
    assessment: AssessmentEntity,
  ) {
    // doc.addPage();
    const name = firstname ?? lastname ?? '';
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
    for (let i = 0; i < Belbin.values.length; i++) {
      const value = this.result(Belbin.values[i]);
      const image = value.icon;
      let ml = marginX + (i % 3) * w;
      let mt = v + Math.floor(i / 3) * height;
      doc.lineWidth(5);
      doc
        .moveTo(ml, mt)
        .strokeColor(value.fill)
        .lineTo(ml + w, mt)
        .stroke();
      mt += 12;
      doc.image(assetPath(`icons/belbin/${image}`), ml, mt, {
        width: 30,
      });
      ml += 36;
      doc
        .font(fontBold)
        .fontSize(fz.sm)
        .fillColor(value.color)
        .text(Belbin.values[i], ml, mt, {
          width: w - 30,
        })
        .text(firstLetterUpper(value.name), ml, mt + 13, {
          width: w - 30,
        });
      mt += 15;
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
      doc.text(value.key.toUpperCase(), ml + 25 - keyWidth / 2, mt + 6);
    }

    doc.lineWidth(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үр дүн');

    doc
      .font(fontBold)
      .fontSize(fz.sm)
      .text(firstLetterUpper(name))
      .font(fontNormal)
      .text(' таны багт гүйцэтгэдэг дүр')
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
      const result = this.result(detail.value);
      indicator.push({
        name: result.name,
        max: +max.cause,
      });
      data.push(+detail.cause);
      results.push({ ...result, point: +detail.cause, value: detail.value });
    }
    let y = doc.y;
    const pie = await this.vis.createRadar(indicator, data);
    doc.image(pie, marginX / 2 + doc.page.width / 8, y - 10, {
      width: (doc.page.width * 3) / 4 - marginX * 2,
    });
    const width = (doc.page.width / 8) * 5;
    let x = doc.x + (doc.page.width / 8) * 1.5 - marginX;
    y = doc.y;
    const pointSize = (width / 20) * 7;
    const indexSize = (width / 20) * 1;
    const nameSize = (width / 20) * 12;
    doc.rect(x, doc.y, width, 16).fill(colors.orange).fillColor(colors.black);
    doc.font(fontBold).fillColor(colors.black).text(`№`, x, y);

    const nameWidth = doc.widthOfString('9 дүр');
    doc.text(name, x + indexSize + nameSize / 2 - nameWidth / 2, y);
    const pointWidth = doc.widthOfString(`Оноо`);
    doc.text(
      `Оноо`,
      x + indexSize + nameSize + pointSize / 2 - pointWidth / 2,
      y,
    );
    const points = [...new Set(results.map((res) => +res.point))].slice(0, 2);
    const agents = [];
    results.map((res, i) => {
      y = doc.y;
      console.log(points.includes(+res.point));
      const bold = points.includes(+res.point);

      if (bold) agents.push(res);
      const color = bold ? colors.orange : colors.black;

      doc
        .font(bold ? fontBold : fontNormal)
        .fillColor(color)
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
    doc.addPage();
    header(doc, firstname, lastname, 'Таны багт гүйцэтгэдэг дүрүүд');
    for (const agent of agents) {
      console.log(agent);
      this.agent(doc, agent);
    }

    footer(doc);
  }
}
