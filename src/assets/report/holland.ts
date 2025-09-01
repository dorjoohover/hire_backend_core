import { Injectable } from '@nestjs/common';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { ResultDetailEntity } from 'src/app/exam/entities/result.detail.entity';
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
import { VisualizationService } from 'src/app/exam/visualization.service';
@Injectable()
export class Holland {
  constructor(private vis: VisualizationService) {}
  static values = [
    'Realistic',
    'Investigative',
    'Artistic',
    'Social',
    'Enterprising',
    'Conventional',
  ];

  public result(v: string) {
    let res = {
      name: '',
      name_mn: '',
      key: '',
      description: '',
      color: '',
      fill: '',
      icon: '',
    };

    const value = v.toLowerCase();
    if (value == 'realistic') {
      res = {
        name: 'Realistic',
        name_mn: 'Гарын уртай',
        key: 'R',
        description:
          'Практик, бодит байдалд суурилсан, гар бие оролцсон, биеийн хүчний орсон ажил',
        color: colors.steel,
        fill: colors.steel,
        icon: 'implementer',
      };
    }
    if (value == 'investigative') {
      res = {
        name: 'Investigative',
        name_mn: 'Судлаач',
        key: 'I',
        description: 'Судалгаа шинжилгээ, оюуны хөдөлмөр илүү шаардсан ажил',
        color: colors.sun,
        fill: colors.sun,
        icon: 'plant',
      };
    }
    if (value == 'artistic') {
      res = {
        name: 'Artistic',
        name_mn: 'Уран бүтээлч',
        key: 'A',
        description: 'Урлаг, уран сайхан, бүтээлч сэтгэлгээ шаардсан ажил',
        color: colors.rust,
        fill: colors.rust,
        icon: 'shaper',
      };
    }
    if (value == 'social') {
      res = {
        name: 'Social',
        name_mn: 'Нийгмийн идэвхтэй',
        key: 'S',
        description:
          'Хүмүүс, олон нийтэд чиглэсэн ажилд сонирхолтой; бусдад туслах, үйлчлэх ажил',
        color: colors.leaf,
        fill: colors.leaf,
        icon: 'teamworker',
      };
    }
    if (value == 'enterprising') {
      res = {
        name: 'Enterprising',
        name_mn: 'Санаачлагч',
        key: 'E',
        description:
          'Удирдах, манлайлах, бусдад нөлөөлөл үзүүлэх чиглэлийн ажил',
        color: colors.brown,
        fill: colors.brown,
        icon: 'completer',
      };
    }
    if (value == 'conventional') {
      res = {
        name: 'Conventional',
        name_mn: 'Гүйцэтгэгч',
        key: 'C',
        description: 'Тогтсон, тодорхой, дэг журамтай ажил',
        color: colors.sky,
        fill: colors.sky,
        icon: 'coordinator',
      };
    }

    return res;
  }

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
    doc.font(fontBold).fontSize(13).text('Товч тайлбар').moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Хүмүүс танаас цаашид юу хийх эвсэл ямар мэргэжил сонгох тухай асуухад та үл ялиг инээмсэглээд, “-Одоогоор харж л байна, яарахгүй байгаа” гэж хариулаад өнгөрдөг үү? Яг үнэндээ та дотроо ирээдүйд хэн болох, юу хийх, ямар ажил хийхээ сайн шийдээгүй, эргэлзсээр байгаа юу?\n\nТа саяхан сургуулиа төгссөн байж магад. Таны хувьд сургуульд сурах нь тийм ч хэцүү байгаагүй, шинэ зүйл сурах, багшийн өгсөн даалгавруудыг хийх амархан байсан. Та хими, математик ч юм уу эсвэл зүгээр түүхийн хичээлд дуртай байсан байж магад. Харин одоо энэ бүхэн өөрчлөгдөж, та дахин дүн авахгүй, даалгавар хийхгүй, хичээлийн хуваарь дагахгүй. Бүх боломж, сонголтууд таны өмнө нээлттэй. Хэдийгээр эрх чөлөөтэй, асар том орон зай таны өмнө нээлттэй байх ч танд хааяа төөрсөн, эргэлзсэн, гайхсан мэдрэмж төрж байна уу? Магадгүй ямар мэргэжил сонгохоос илүү “Би хэн бэ?, Би юу хүсэж байна вэ? Би юу хийж чадах вэ?, Надад ямар ажил тохирох вэ?” гэдэг  нь илүү чухал асуултууд юм болов уу?\n\nХэрвээ та өөрөөсөө эдгээр асуултуудыг асууж байгаа бол та зөв газраа иржээ. Сэтгэл судлаачид олон арван жилийн туршид хүмүүсийн зан төрхийг судалж, хүмүүсийг дотор нь ажил мэргэжлийн сонирхлоор нь 6-н өөр хэв шинжид ангилах боломжтойг нээн илрүүлжээ. Хэрэв хүн өөрийн хэв шинжид тохирох ажил мэргэжлийг сонгосон бол хожим нь энэ мэргэжилдээ илүү дуртай, амжилт гаргах магадлал илүү өндөр байдгийг  мөн илрүүлсэн байна. Мэргэжил сонголтын тест буюу Холландын тест нь таны сонирхол, зан төрх, ажил хийх хэв маяг зэргийг үнэлж, танд тохирох ажлын орчин, төрлийг илүү тодорхой болгож өгдөг бөгөөд одоог хүртэл мэргэжил сонголт, карьер зөвлөгөөнд түгээмэл ашиглагдаж ирсэн юм.\n\nТанд ямар ажил мэргэжил тохирохыг одоо хамтдаа олж мэдэцгээе!',
        { align: 'justify' },
      )
      .moveDown(1);

    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Тестийн тухай');
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Энэхүү мэргэжил сонголтын тест нь таны ажил мэргэжлийн сонирхлыг үнэлж, таны сонирхолд хамгийн сайн тохирч буй хэв шинжийг илрүүлж, тохирох ажил мэргэжлүүдийн жагсаалтыг гаргаж өгнө. Сэтгэл судлаач доктор Холланд анх мэргэжлийн сонирхол дээр нь тулгуурлан хүмүүсийг 6 үндсэн хэв шинжид хувааж болохыг нээн илрүүлж, өөрийн онол, тестээ боловсруулжээ. Өдгөө энэхүү тестийг мэргэжил сонголт, карьер хөгжүүлэлтийн чиглэлд дэлхий даяар түгээмэл ашиглаж байна.\n\nХолландын онол нь дараах 4 үндсэн зарчим дээр тогтоно. Үүнд:',
        { align: 'justify' },
      )
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Мэргэжлийн сонирхлын дагуу хүмүүсийг үндсэн 6 хэв шинжид ангилах боломжтой.',
          'Ажил мэргэжлийн орчныг мөн адилхан 6 төрөлд ангилах боломжтой.',
          'Хүмүүс өөрсдийн хэв шинжид тохирсон ажлын байр, орчин нөхцөлийг хайж олохыг эрэлхийлж байдаг.',
          'Хувь хүний хэв шинж болон ажил мэргэжлийн орчин хоёрын хоорондын тохироо нь хүний зан төрх, үйл хөдлөлд нөлөөллөө үзүүлж байдаг.',
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
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Тиймээс Холландын онол, загвар нь мэргэжлийн сонирхол, чиглэлээс гадна ажлын байр, орчин нөхцөл, албан тушаал, сэтгэл ханамж, зан төрх тэдгээрийн хоорондын уялдааг холбоог олон талаас нь цогцоор авч үзэж, тайлбарладаг. Хүний эзэмшсэн мэргэжил болон тухайн хүний сонирхлын хэв шинж хоорондоо тохирч буй үед хүн илүү их сэтгэл ханамж авч, ирээдүйд карьерын хувьд өсөн хөгжих, амжилт гаргах магадлал нь ихэсдэг байна. ',
        marginX,
        doc.y,
        { align: 'justify' },
      )
      .moveDown(0.5);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Холландын 6 хэв шинж');
    const w = (doc.page.width - marginX * 2) / 3;
    let currentY = doc.y;
    const gap = 20;
    const itemsPerRow = 3;

    for (let row = 0; row < 2; row++) {
      let rowMaxHeight = 0;

      for (let col = 0; col < itemsPerRow; col++) {
        const i = row * itemsPerRow + col;
        if (i < Holland.values.length) {
          const value = this.result(Holland.values[i]);
          const image = value.icon;

          let ml = marginX + col * w;
          let mt = currentY;
          let initialMt = mt;

          doc.lineWidth(4);
          doc
            .moveTo(ml, mt)
            .strokeColor(value.fill)
            .lineTo(ml + w, mt)
            .stroke();

          mt += 11;
          doc.image(assetPath(`icons/belbin/${image}`), ml + 4, mt, {
            width: 26,
          });

          ml += 36;
          doc
            .font('fontBlack')
            .fontSize(12)
            .fillColor(value.color)
            .text(Holland.values[i], ml + 4, mt + 2, {
              width: w - 50,
            })
            .text(value.name_mn, ml + 4, mt + 15, {
              width: w - 50,
            });

          mt += 15;
          doc
            .font('fontMedium')
            .fontSize(11)
            .fillColor(colors.black)
            .text('Шинж чанар:', ml + 4, mt + 23);

          mt += 35;
          doc.font(fontNormal).text(value.description, ml + 4, mt + 2, {
            width: w - 40,
          });

          const characterHeight = doc.heightOfString(value.description, {
            width: w - 40,
          });

          mt += 10 + characterHeight;

          const itemHeight = mt - initialMt;
          rowMaxHeight = Math.max(rowMaxHeight, itemHeight);
        }
      }

      currentY += rowMaxHeight + gap;
    }

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Холландын тестийн үр дүнг тайлбарлахдаа 6 хэв шинж тус бүрийн англи нэрийн эхний үсгийг сонгон авч кодолж хэрэглэдэг. Үүнийг мөн Холландын код, RIASEC загвар (эхний үсгүүдийн нийлбэр) гэж бас нэрлэдэг. Дээрх 6 хэв шинж нь хүмүүст харилцан адилгүйгээр хэмжээгээр илэрдэг. Гэхдээ Холландын тест нь хамгийн сайн тохирох эхний гурван хэв шинжийн хослолыг ихэвчлэн сонгон авч ашигладаг. Жишээлбэл: тестийн үр дүнд таны хэв шинж SEA гэсэн Холландын кодоор илэрхийлэгдсэн бол танд хамгийн сайн тохирох хэв шинж нь “Нийгмийн идэвхтэй (Social)” хэв шинж, түүний дараагаар нь “Санаачлагч (Enterprising)”, тэгээд “Уран бүтээлч (Artistic)” хэв шинжүүд байна гэдгийг илэрхийлж буй хэрэг юм.\n\nАжил мэргэжлийн орчин ч мөн адил голдуу эдгээр 6 хэв шинж хосолсон хэлбэрийг агуулсан байх нь элбэг. Жишээлбэл: дунд сургуулийн математикийн багшийн мэргэжлийг авч үзвэл сурагчдад тусалдаг, хүмүүстэй ажилдаг талаас энэ мэргэжлийг “Нийгмийн идэвхтэй (Social)” хэв шинж, харин асуудлыг шийдвэрлэх, мэдээлэлтэй ажилладаг талаасаа “Судлаач (Investigative)” хэв шинжтэй мөн давхар холбож авч үзнэ.',
        marginX,
        doc.y + 50,
        { align: 'justify' },
      );
    doc.lineWidth(1);

    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Тестийн хэрэглээ, анхаарах зүйлс');
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Хөгжүүлэлт')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Холландын мэргэжил сонголтын хэв шинжийг илрүүлэх олон төрлийн тестийн хувилбаруудыг судлаач нар хөгжүүлсэн байдаг.  Бидний одоо ашиглаж буй тест нь доктор Холландын RIASEC загвар дээр суурилж, Америкийн Нэгдсэн Улсын Хөдөлмөрийн Яамнаас боловсруулсан гаргасан 60 асуулт бүхий олон улсад хамгийн түгээмэл хэрэглэгддэг, сайтар судлагдсан тестийн хувилбар юм.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Анхаарах зүйлс')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Эдгээр 6-н хэв шинжийн аль нэг нь сайн, эсвэл аль нэг нь муу гэсэн ойлголт огт байхгүй. Энэхүү тестийн гол зорилго нь таны мэргэжлийн сонирхлыг тодорхойлж, өөрийгөө илүү сайн, зөвөөр ойлгоход туслах юм. Энэхүү тайлантай танилцахдаа дараах зүйлсийг анхаарах хэрэгтэй.',
        { align: 'justify' },
      )
      .moveDown(1);
    doc
      .font(fontNormal)
      .fontSize(12)
      .list(
        [
          'Тайлантай танилцахдаа хэдийгээр бид хүмүүсийг энэхүү 6 хэв шинжийн аль нэгэнд ангилах боломжтой ч тодорхой хэв шинжид дурдсан зан төлөвүүд нэг хүнд заавал бүгд илрэх ёстой гэж ойлгож болохгүйг анхаарах хэрэгтэй.',
          'Зөвхөн тайланд үндэслэн өөртөө төгс тохирох ажил олно гэж найдаж, хүлээхгүй байх. Тестийн үр дүн нь таны сонирхолд нийцэх ажил мэргэжлийн ерөнхий чиглэл, зарим түгээмэл ажил мэргэжлүүдийг санал болгоно.',
          'Мэргэжил сонголтын тест нь зөвхөн таны мэргэжлийн сонирхол, чиглэлийг тодорхойлох бөгөөд харин таны мэргэжлийн ур чадвар, чадамжийг үнэлэхгүй! Тиймээс бид таныг цаашид ур чадвар, чадамжийн тестийг бөглөхийг зөвлөж байна.',
          'Та өөрийн ирээдүйн мэргэжил, ажлын карьерыг сонгохдоо аль болох олон мэдээ баримт цуглуулж, нухацтай хандах хэрэгтэй. Жишээлбэл, та Холландын тестээс гадна өөр бусад тест сорилуудыг бөглөх эсвэл сонирхож буй чиглэлээр тань ажиллаж буй хүмүүстэй холбогдож зөвлөгөө авах, тухайн ажил дээр богино хугацаагаар дадлага хийж, туршиж үзэх зэрэг аргуудыг ашиглаж болох юм.',
          'Гэр бүл, дотнын хүмүүстэйгээ тестийн үр дүн, цуглуулсан мэдээллээ хуваалцаж, зөвлөгөө аваарай.',
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
      .fillColor(colors.black)
      .fontSize(13)
      .text('Тестийн оноог зөв тайлбарлах', marginX, doc.y)
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Мэргэжлийн сонголтын тестийн үр дүнг тооцохдоо хэв шинж тус бүрд харгалзах асуултуудын оноонуудыг хооронд нь нэгтгэж, нийлбэр оноог ашигласан. Энэхүү тестийн гол зорилго нь та өөрийн мэргэжлийн сонирхлыг олж, тодорхойлох тул тестийн үр дүн, оноогоо бусад хүмүүсийн тест бөглөсөн үр дүн, оноотой харьцуулахгүй байх хэрэгтэй.',
        { align: 'justify' },
      )
      .moveDown(1);

    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Сорилын үр дүн');
    const code = result.result.substring(0, 3);
    const letters = code.split('');

    const namesMn = letters
      .map((l) => {
        return Holland.values
          .map((v) => this.result(v))
          .find((r) => r.key === l)?.name_mn;
      })
      .filter(Boolean)
      .join(', ');

    const value = this.result(result.value);

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text('Таны үндсэн мэргэжлийн сонирхол бол ');

    doc
      .font('fontBlack')
      .fontSize(16)
      .fillColor(colors.orange)
      .text(`${value.name_mn} (${value.name})`)
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text('Таны мэргэжлийн сонирхолд тохирох код бол');

    const baseX = doc.x;
    const baseY = doc.y;

    const codeWidth = doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor(colors.orange)
      .widthOfString(code.toString());

    const buyuuWidth = doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .widthOfString(' буюу ');

    doc
      .font('fontBlack')
      .fontSize(18)
      .fillColor(colors.orange)
      .text(code.toString(), baseX, baseY);

    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(' буюу ', baseX + codeWidth + 1, baseY + 4.5);

    doc
      .font('fontBlack')
      .fontSize(14)
      .fillColor(colors.orange)
      .text(namesMn, baseX + codeWidth + 1 + buyuuWidth, baseY + 3.5)
      .moveDown(1);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(
        'Сонирхлын хэв шинж тус бүрд харгалзах оноог тооцоолж графикт үзүүлэв. Хамгийн өндөр оноо бүхий хэв шинж нь танд давамгайлан илэрч буй үндсэн хэв шинж бол харин дараа дараагийн хамгийн өндөр оноо бүхий хэв шинж нь дараачийн тод илэрч буй хэв шинжүүд юм. Сонирхолын хэв шинж тус бүрд харгалзах оноог тооцоолж графикт үзүүлэв. Хамгийн өндөр оноо бүхий хэв шинж нь таньд давамгайлан илэрч буй үндсэн хэв шинж бол харин дараа дараагийн хамгийн өндөр оноо бүхий хэв шинж нь дараачийн тод илэрч буй хэв шинжүүд юм.',
        marginX,
        doc.y,
        { align: 'justify' },
      );
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
        max: 40,
      });
      data.push(+detail.cause);
      results.push({ ...result, point: +detail.cause, value: detail.value });
    }
    let y = doc.y;
    const pie = await this.vis.createRadar(indicator, data);
    doc.image(pie, 75, y - 10, {
      width: doc.page.width - 150,
    });
    doc.y += (doc.page.width / 425) * 310 - 150;
    footer(doc);
  }
}
