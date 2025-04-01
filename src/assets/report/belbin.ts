import { Injectable } from '@nestjs/common';
import { color } from 'echarts';
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
  title,
} from 'src/app/exam/reports/formatter';
import { VisualizationService } from 'src/app/exam/visualization.service';

@Injectable()
export class Belbin {
  constructor(private vis: VisualizationService) {}
  static measure =
    'Энэхүү тест нь таны аливаа нэг бүлэг, ажлын багт гүйцэтгэдэг голлох үүрэг, багийн дүрийг тодорхойлно.\nБелбиний багийн дүрийг тодорхойлох тестэд 9 дүр байдаг бөгөөд таны хувьд давамгайлж буй дүрийг (эсвэл дүрүүдийг) уг тестээр тодорхойлох болно.\nӨөрийн багт гүйцэтгэх үүргийг тодорхойлсноор таны зүгээс багт оруулах хувь нэмрээ өсгөх, багийг зорилгодоо хүрч ажиллахад нь тусалж дэмжих, залах, багийн гүйцэтгэлийг сайжруулах зэрэг боломжууд бүрдэх юм.\n\nБагаар ажиллана гэдэг жинхэнэ утгаараа амаргүй байдаг. Багаар ажиллах үед ямар нэгэн асуудал, бэрхшээл заавал тохиолддог. Багийн гишүүдийн дунд арга барил, хандлага, темперамент болон зан чанарын ялгаатай байдлаас үүдэлтэй зөрчилдөөн, үл ойлголцол, үр ашиггүй байдал үүсэх тохиолдол бишгүй тохиолддог бөгөөд хувь хүмүүсийн ялгаатай байдлыг Белбиний багийн дүрийг тодорхойлох тестийн тусламжтайгаар тодорхойлсноор дээрх нөхцөл байдлаас зайлсхийхийн сацуу багийн хамтын ажиллагаа, уур амьсгал, гүйцэтгэлийг сайжруулж болох юм.';
  static about =
    'Энэхүү багт гүйцэтгэх үүргийг тодорхойлох тестийн тайлан нь таны үнэлгээний үр дүнд суурилсан болно. Энэ тайлангаас та дараах зүйлсийг мэдэх боломжтой.\nҮүнд:\n• Таны багт гүйцэтгэх голлох дүр\n• Багт оруулж буй хувь нэмэр, таны гүйцэтгэж буй багийн дүр';
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

  static crewValues = [
    {
      title: 'Бодолд төвлөрсөн дүрүүд',
      values: {
        PL: 'Сэтгэгч',
        ME: 'Шинжээч',
        SP: 'Мэргэжилтэн',
      },
      color: colors.purple,
    },
    {
      title: 'Үйлдэлд төвлөрсөн дүрүүд',
      values: {
        SH: 'Хэлбэржүүлэгч',
        IMP: 'Хэрэгжүүлэгч',
        CF: 'Дуусгагч',
      },
      color: colors.tangerine,
    },
    {
      title: 'Хүмүүст төвлөрсөн дүрүүд',
      values: {
        CO: 'Зохицуулагч',
        TW: 'Багийн тоглогч',
        RI: 'Санаачлагч',
      },
      color: colors.lime,
    },
  ];
  static successShort = {
    pl: {
      name: 'сэтгэгч',
      color: colors.sun,
    },
    sh: {
      name: 'хэлбэржүүлэгч',
      color: colors.rust,
    },
    co: {
      name: 'зохицуулагч',
      color: colors.sky,
    },
    me: {
      name: 'шинжээч',
      color: colors.gray,
    },
    imp: {
      name: 'хэрэгжүүлэгч',
      color: colors.steel,
    },
    tw: {
      name: 'багийн тоглогч',
      color: colors.leaf,
    },
    sp: {
      name: 'мэргэжилтэн',
      color: colors.moss,
    },
    cf: {
      name: 'дуусгагч',
      color: colors.brown,
    },
    ri: {
      name: 'санаачлагч',
      color: colors.purple,
    },
  };
  static success = [
    {
      title: 'Хэрэгцээг тодорхойлох',
      agents: {
        sh: {
          icon: 'shaper',
          color: colors.rust,
        },
        co: {
          icon: 'coordinator',
          color: colors.sky,
        },
      },
    },
    {
      title: 'Санаа олох',
      agents: {
        pl: {
          icon: 'plant',
          color: colors.sun,
        },
        ri: {
          icon: 'resource',
          color: colors.purple,
        },
      },
    },
    {
      title: 'Төлөвлөгөө боловсруулах',
      agents: {
        me: {
          icon: 'monitor',
          color: colors.gray,
        },
        sp: {
          icon: 'specialist',
          color: colors.moss,
        },
      },
    },
    {
      title: 'Холбоо тогтоох',
      agents: {
        ri: {
          icon: 'resource',
          color: colors.purple,
        },
        tw: {
          icon: 'teamworker',
          color: colors.leaf,
        },
      },
    },
    {
      title: 'Байгууллага бүрдүүлэх',
      agents: {
        co: {
          icon: 'coordinator',
          color: colors.sky,
        },
        imp: {
          icon: 'implementer',
          color: colors.steel,
        },
      },
    },
    {
      title: 'Байлдан дагуулах',
      agents: {
        cf: {
          icon: 'completer',
          color: colors.brown,
        },
        imp: {
          icon: 'implementer',
          color: colors.steel,
        },
      },
    },
  ];

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
        name: 'Сэтгэгч',
        key: 'pl',
        character: 'Интроверт, сэтгэгч, мөрөөдөмтгий, философич',
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
        agent: 'Бодолд төвлөрсөн дүр',
      };
    }
    if (value == 'monitor/evaluator')
      res = {
        name: 'Шинжээч',
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
        agent: 'Бодолд төвлөрсөн дүр',
      };
    if (value == 'specialist')
      res = {
        name: 'Мэргэжилтэн',
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
        agent: 'Бодолд төвлөрсөн дүр',
      };
    if (value == 'shaper')
      res = {
        key: 'sh',
        name: 'Хэлбэржүүлэгч',
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
        agent: 'Үйлдэлд төвлөрсөн дүр',
      };
    if (value == 'implementer')
      res = {
        key: 'imp',
        name: 'Хэрэгжүүлэгч',
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
        agent: 'Үйлдэлд төвлөрсөн дүр',
      };
    if (value == 'completer/finisher')
      res = {
        name: 'Дуусгагч',
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
        agent: 'Үйлдэлд төвлөрсөн дүр',
      };
    if (value == 'coordinator')
      res = {
        name: 'Зохицуулагч',
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
        agent: 'Хүмүүст төвлөрсөн дүр',
      };

    if (value == 'team worker')
      res = {
        name: 'Багийн тоглогч',
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
        agent: 'Хүмүүст төвлөрсөн дүр',
      };
    if (value == 'resource investigator')
      res = {
        name: 'Санаачлагч',
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
        agent: 'Хүмүүст төвлөрсөн дүр',
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
    firstname: string,
    lastname: string,
    page = false,
  ) {
    const height = (doc.page.height - marginY * 2 - 150) / 2 - 25;
    if (doc.page.height - doc.y < height || page) {
      footer(doc);
      doc.addPage();
      header(doc, firstname, lastname, value.agent);
    }
    const image = value.icon;
    let y = doc.y;
    let x = marginX;
    doc.lineWidth(4);
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
      .font('fontBlack')
      .fontSize(13)
      .fillColor(value.color)
      .text(value.value, x + 2, y + 3);
    doc.text(firstLetterUpper(value.name), x + 2, y + 17);
    doc.y = y;
    doc
      .text(value.agent, doc.page.width - 120 - marginX, doc.y, {
        align: 'right',
        width: 120,
      })
      .lineGap(-10);
    x = marginX;
    doc.y += 16;
    doc.x = marginX;
    doc.lineWidth(1);
    doc
      .lineGap(0.1)
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(value.description, {
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .moveDown(1);
    doc
      .font(fontBold)
      .text('• Шинж чанар: ', {
        continued: true,
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .font(fontNormal)
      .text(value.character)
      .moveDown(0.25);
    doc
      .font(fontBold)
      .text('• Дуртай зүйлс: ', {
        continued: true,
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .font(fontNormal)
      .text(value.hobby)
      .moveDown(0.25);
    doc
      .font(fontBold)
      .text('• Багт оруулах хувь нэмэр: ', {
        continued: true,
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .font(fontNormal)
      .text(value.contribution)
      .moveDown(0.25);
    doc
      .font(fontBold)
      .text('• Бусад хүмүүс таныг тодорхойлохдоо: ', {
        continued: true,
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .font(fontNormal)
      .text(value.describe)
      .moveDown(0.25);
    doc.y += 25;
  }

  public async crew(doc: PDFKit.PDFDocument) {
    let y = doc.y;
    const width = (doc.page.width - marginX * 2 - 44) / 3;
    let x = marginX;
    for (let i = 0; i < Belbin.crewValues.length; i++) {
      const value = Belbin.crewValues[i];
      const title = value.title;
      doc.fontSize(fz.sm).font('fontBlack').fillColor(value.color);
      const titleWidth = doc.widthOfString(title);
      doc.text(
        title,
        x + i * width + i * 22 - (titleWidth - 44) / 2 + width / 2,
        y,
        {
          width: width - 40,
          align: 'center',
        },
      );

      doc
        .moveTo(x + i * width + i * 22 + marginX + 11, y + 36)
        .strokeColor(value.color)
        .lineTo(x + i * width + i * 22 + marginX + width - 66, y + 36)
        .stroke();
      let h = y + 44;
      for (const [k, v] of Object.entries(value.values)) {
        const textWidth = doc.widthOfString(`${k.toUpperCase()} ${v}`);
        doc
          .font(fontBold)
          .fontSize(12)
          .text(
            k.toUpperCase(),
            x + i * width + i * 22 - textWidth / 2 + width / 2,
            h,
            {
              continued: true,
            },
          )
          .font(fontNormal)
          .text(` ${v}`);
        h += 15;
      }
      if (i < 2) {
        doc
          .fontSize(24)
          .fillColor(colors.black)
          .font(fontBold)
          .text('+', (i + 1) * width + i * 22 + marginX, y + 30);
      }
    }

    doc.y += 12;
    doc.x = marginX;
    doc.font(fontBold).fillColor(colors.black).fontSize(24);
    doc.text('=', {
      align: 'center',
    });
    doc.y += 8;
    doc.fontSize(fz.sm).text('Өндөр бүтээмж, чанартай гүйцэтгэл', {
      align: 'center',
    });
    doc.y += 15;
    doc
      .fontSize(12)
      .font(fontNormal)
      .text(
        '• Багийн гүйцэтгэлийг ялгарахуйц үр дүнтэй, үр ашигтай байлгахын тулд 9 дүрүүдийн тэнцвэртэй байдлыг хангах эсвэл тохиромжтой хольцыг бүрдүүлэх нь хамгийн чухал.\n• Аль нэг дүрийг бусдаас нь чухалчилж үзэх, эсвэл нэг дүрийг нөгөө дүрээр орлуулах зэрэг нь буруу бөгөөд үр дүнтэй багийн ажиллагааг бий болгож чадахгүй. Тиймээс 9 дүр тус бүрийг чухалчлан авч үзэх нь оновчтой.',
        {
          align: 'justify',
          width: doc.page.width - marginX * 2,
        },
      );
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
    header(doc, firstname, lastname);
    title(doc, result.assessmentName, assessment.author);
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(13)
      .text('Юуг хэмжих вэ?')
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(13)
      .fillColor(colors.black)
      .text(Belbin.measure, {
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .moveDown(1);
    doc.font(fontBold).fontSize(13).text('Тайлангийн тухайд').moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(Belbin.about, {
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .moveDown(1);
    doc.font(fontBold).fontSize(13).text('Зөвлөмж, тодруулга').moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .fillColor(colors.black)
      .text(Belbin.advice, {
        align: 'justify',
        width: doc.page.width - marginX * 2,
      })
      .moveDown(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Белбиний багийн 9 дүр');

    const w = (doc.page.width - marginX * 2) / 3;
    let currentY = doc.y;
    const gap = 20;
    const itemsPerRow = 3;

    for (let row = 0; row < 3; row++) {
      let rowMaxHeight = 0;

      for (let col = 0; col < itemsPerRow; col++) {
        const i = row * itemsPerRow + col;
        if (i < Belbin.values.length) {
          const value = this.result(Belbin.values[i]);
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
            .text(Belbin.values[i], ml + 4, mt + 2, {
              width: w - 50,
            })
            .text(firstLetterUpper(value.name), ml + 4, mt + 15, {
              width: w - 50,
            });

          mt += 15;
          doc
            .font('fontMedium')
            .fontSize(11)
            .fillColor(colors.black)
            .text('Шинж чанар:', ml + 4, mt + 23);

          mt += 35;
          doc.font(fontNormal).text(value.character, ml + 4, mt + 2, {
            width: w - 40,
          });

          const characterHeight = doc.heightOfString(value.character, {
            width: w - 40,
          });

          mt += 10 + characterHeight;
          const rectWidth = 35;
          const rectHeight = 20;
          const rectX = ml + 4;
          const rectY = mt;

          doc
            .roundedRect(rectX, rectY, rectWidth, rectHeight, 20)
            .fill(value.fill);

          doc.font('fontBlack').fillColor('#ffffff');
          const text = value.key.toUpperCase();
          const textWidth = doc.widthOfString(text);
          const textHeight = doc.currentLineHeight();

          const textX = rectX + rectWidth / 2 - textWidth / 2;
          const textY = rectY + rectHeight / 2 - textHeight / 2;

          doc.text(text, textX, textY, {
            width: textWidth,
            align: 'center',
          });

          const itemHeight = mt + rectHeight - initialMt;
          rowMaxHeight = Math.max(rowMaxHeight, itemHeight);
        }
      }

      currentY += rowMaxHeight + gap;
    }

    doc.lineWidth(1);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Үр дүн');

    doc
      .font(fontBold)
      .fontSize(13)
      .fillColor(colors.black)
      .text(firstLetterUpper(name), { continued: true })
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
    doc.image(pie, 75, y - 10, {
      width: doc.page.width - 150,
    });
    doc.y += (doc.page.width / 425) * 310 - 150;

    const width = (doc.page.width / 8) * 5;
    let x = doc.x + (doc.page.width / 8) * 1.75 - marginX;

    y = doc.y + 40;
    const pointSize = (width / 20) * 7;
    const indexSize = (width / 20) * 1;
    const nameSize = (width / 20) * 12;
    doc.font(fontBold).fillColor(colors.black).text(`№`, x, y);
    doc.text('9 дүр', x + indexSize * 3, y);
    const pointWidth = doc.widthOfString(`Оноо`);
    doc.text(
      `Оноо`,
      x + indexSize + nameSize + pointSize / 2 - pointWidth / 2,
      y,
    );
    doc.y += 7;
    doc
      .moveTo(x, doc.y)
      .strokeColor(colors.orange)
      .lineTo(x + indexSize + nameSize + pointSize / 2 + pointWidth / 2, doc.y)
      .stroke();
    doc.y += 9;
    const points = [...new Set(results.map((res) => +res.point))].slice(0, 2);
    const agents = [];
    results.map((res, i) => {
      y = doc.y;
      const bold = points.includes(+res.point);
      if (bold) agents.push(res);
      const color = bold ? colors.orange : colors.black;

      doc
        .font(bold ? fontBold : fontNormal)
        .fillColor(color)
        .text(`${i + 1}.`, x, y);
      const name = `${res.key.toUpperCase()} - ${firstLetterUpper(res.name)}`;
      doc.text(name, x + indexSize * 3, y);
      const pointWidth = doc.widthOfString(`${res.point}`);
      doc.text(
        `${res.point}`,
        x + indexSize + nameSize + pointSize / 2 - pointWidth / 2,
        y,
      );
      doc.y += 5;
    });
    doc.fillColor(colors.black);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Таны багт гүйцэтгэдэг дүрүүд');
    for (const agent of agents) {
      this.agent(doc, agent, firstname, lastname);
    }
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Баг доторх дүрүүд');
    doc
      .fillColor(colors.black)
      .fontSize(fz.sm)
      .font(fontNormal)
      .text('Белбиний 9 дүрийг дараах 3 ангилалд авч үздэг.');
    doc.y += 20;
    doc.image(assetPath('icons/belbin/agent'), 125, doc.y, {
      width: doc.page.width - 250,
    });
    doc.y += ((doc.page.width - 250) / 340) * 258;
    doc.y += 22;
    this.crew(doc);
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Белбиний тестийг ашигласнаар...');
    doc
      .fillColor(colors.black)
      .font(fontBold)
      .fontSize(fz.sm)
      .text('Багт авчрах үр дүн')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .text(
        'Багийн ажиллагаа гэдэг дан ганц үр дүнд чиглэсэн бус багийн гишүүдийг хувь хүн талаас нь хөгжүүлэх механизм бүхий бүлэглэл байх хэрэгтэй. Өөрийн болон бусад багийн гишүүдийн багт гүйцэтгэх үүрэг, багийн дүрийг тодорхойлсноор багийн гишүүдийг хөгжүүлэх, гүйцэтгэлийг сайжруулах боломж бүрдэнэ.',
        { align: 'justify', width: doc.page.width - marginX * 2 },
      )
      .moveDown(1);
    doc.text(
      '• Багийн гүйцэтгэл хамгийн үр дүнтэй, өндөр хэмжээнд байхаар багаа бүрдүүлэх.\n• Одоогийн багийн гишүүдийг хөгжүүлэх, чиглүүлэх.\n• Мултифункционал буюу тал талын чадвар бүхий баг бүрдэнэ.',
      { align: 'justify', width: doc.page.width - marginX * 2 },
    );
    doc.y += 25;

    const iconWidth = (doc.page.width - marginX * 2) / 9;
    [
      'plant',
      'monitor',
      'specialist',
      'shaper',
      'implementer',
      'completer',
      'coordinator',
      'teamworker',
      'resource',
    ].map((icon, i) =>
      doc.image(
        assetPath(`icons/belbin/${icon}`),
        marginX + i * iconWidth,
        doc.y,
        {
          width: iconWidth - 15,
        },
      ),
    );
    doc.y = doc.y + 10 + iconWidth;
    doc
      .fillColor(colors.black)
      .font(fontBold)
      .fontSize(fz.sm)
      .text('Ажилтны оролцоо, ажлын идэвхийг сайжруулна')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .text(
        'Хувь хүмүүст ажлын байран дах зан төлөвийн давуу талыг тодорхойлж өгнө. Хүн бүрт чадвар, мэдлэг, туршлагын хувьд өөрийн гэсэн давуу тал байдаг. Түүнийгээ ажлын байранд давуу талаа болгон ашиглаж чаддаг байх нь чухал. Судалгаагаар өөрийн онцлог, давуу талаа ашиглаж чаддаг ажилтнууд давуу талаа ашиглаж чаддаггүй ажилтнуудаас 6 дахин илүүтэй ажилдаа дурлаж ажилладаг болохыг тогтоосон байдаг. Белбиний тестийг ашигласнаар:',
        { align: 'justify', width: doc.page.width - marginX * 2 },
      )
      .moveDown(1);
    doc.text(
      '• Хүмүүст давуу талаа олж мэдэхэд нь тусална.\n• Ажлын байран дээрх дүр болон хувийн давуу талаа хоршуулан ашиглах боломжтой гэдгийг ойлгоно.\n• Бусдын давуу талыг багийн гүйцэтгэлийг сайжруулахад хэрхэн ашиглаж болохыг ойлгоно.\n• Ажил, үүрэг даалгавар оноож өгөхдөө багийн гишүүдийн онцлог, давуу талуудыг бодитойгоор үнэлж тохирох дүрийг хуваарилах боломжийг олгоно.\n• Хүмүүсийн давуу талыг ашиглахын ач холбогдлыг ойлгож, хэрэгжүүлдэг болно.',
      { align: 'justify', width: doc.page.width - marginX * 2 },
    );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Белбиний тестийг ашигласнаар...');
    doc
      .fillColor(colors.black)
      .font(fontBold)
      .fontSize(fz.sm)
      .text('Зөрчилдөөний удирдлага')
      .moveDown(0.5);

    doc
      .font(fontNormal)
      .fontSize(12)
      .text(
        'Аливаа зөрчилдөөн үүсэх хамгийн гол шалтгаан нь хүмүүс хоорондын үл ойлголцол байдаг бөгөөд уг зөрчилдөөн төрөл бүрийн хэлбэрээр илэрдэг. Ёс суртахуунгүй үйлдэл гаргах, ажлын бүтээмж буурах, ажил таслалт ихсэх зэрэг нь цөм зөрчилдөөний хэлбэрүүд юм. Белбиний тестээр дамжуулан багийн дүрүүдийг тодорхойлсноор тухайн багийн гишүүнтэй холбоотой хувийн асуудлыг хөндөх, нөхцөл байдлыг муутгах зэрэг эрсдэлүүдээс сэргийлэх боломжтой юм.',
        { align: 'justify', width: doc.page.width - marginX * 2 },
      )
      .moveDown(1);
    doc.text(
      '• Белбин болон хүмүүс хоорондын зөрчилдөөн – Хувь хүмүүс тус бүрийн дүрийг тодорхойлсноор багт үүсч болох үл ойлголцол, зөрчилдөөн зэргийг урьдчилан таамаглаж, сэргийлэх боломжтой болно.\n• Белбин болон баг хоорондын зөрчилдөөн – Заримдаа багийн гишүүд хэт их деталчилсан мэдээлэлд анхаараад том зургаа мартах гээд байдаг хандлага ажиглагддаг. Мөн багууд хоорондоо хэт их өрсөлдөж бие биенийхээ гүйцэтгэл, үр дүнг үл ойшоох, няцаах тохиолдол цөөнгүй байдаг бөгөөд энэ нь баг, газар, хэлтэс хооронд үйл ойлголцол, зөрчилдөөн үүсгээд зогсохгүй байгууллагын үр дүнтэй, бүтээмжтэй байдалд сөргөөр нөлөөлдөг аюултай.',
      { align: 'justify', width: doc.page.width - marginX * 2 },
    );
    doc.y += 25;

    [
      'plant',
      'monitor',
      'specialist',
      'shaper',
      'implementer',
      'completer',
      'coordinator',
      'teamworker',
      'resource',
    ].map((icon, i) =>
      doc.image(
        assetPath(`icons/belbin/${icon}`),
        marginX + i * iconWidth,
        doc.y,
        {
          width: iconWidth - 15,
        },
      ),
    );
    doc.y = doc.y + 10 + iconWidth;
    doc
      .fillColor(colors.black)
      .font(fontBold)
      .fontSize(fz.sm)
      .text('Манлайллыг хөгжүүлнэ')
      .moveDown(0.5);
    doc
      .font(fontNormal)
      .fontSize(12)
      .text(
        '“Өөрийн бусдаас ялгарах хувь хүний шинж чанаруудаа таньж мэдсэн удирдагчид хамгийн итгэл даахуйц манлайлагч, удирдагчид байдаг. Тэд сул талаасаа айж ичдэггүй учраас өөрсдийн арга барилаа тухайн нөхцөл байдалд хэрхэн тааруулж дасан зохицохоо мэддэг, ойлгодог хүмүүс юм”. Лондонгийн бизнесийн сургуулийн Байгууллагын зан төлөвийн профессор: Роб Гофи',
        { align: 'justify', width: doc.page.width - marginX * 2 },
      )
      .moveDown(1);
    doc.text(
      '• Белбиний багийн дүрийг тодорхойлох тестээр дамжуулан давуу болон сул талаа тодорхойлох боломжтой бөгөөд ингэснээр тухайн ажилтан үүссэн нөхцөл байдал, ажлын орчинд дасан зохицож үр дүнтэй, өндөр бүтээмжтэй ажиллах боломж бүрдэх юм.',
      { align: 'justify', width: doc.page.width - marginX * 2 },
    );
    footer(doc);
    doc.addPage();
    header(doc, firstname, lastname, 'Дүрүүдийг ашиглан амжилтад хүрэх нь');
    doc
      .fillColor(colors.black)
      .fontSize(12)
      .font(fontNormal)
      .text(
        '• Ажилчдын албан тушаалд бус багт оруулж буй хувь нэмэрт үндэслэн багийг бүрдүүлэх боломж бүрдэнэ\n• Багийн гишүүд өөрийн зан төлөвөө таньж мэдэх, түүнийгээ бизнесийн хэрэгцээ, шаардлага болон нөхцөл байдалд нийцүүлэх\n• Тухайн ажил, үүрэг даалгаврыг зөв буюу зохих чадвар, зан төлөв бүхий ажилтан гүйцэтгэснээрээ багийн гүйцэтгэл, ажиллагаа сайжрах\n• Багийн гишүүд хоорондын харилцаа хэт хувийн бус багийн үр дүнд чиглэсэн болно\n• Баримтанд суурилсан мэдээлэлтэй шийдвэр гаргалт нь зөн совин эсвэл таамаглал дээр тулгуурлахаас илүү дээр байдаг\n• Хувь хүмүүсийн зан төлөвийн давуу болон сул талуудыг илүү нарийвчлан судлах, тодорхойлох боломж бүрдэнэ.',
        { align: 'justify', width: doc.page.width - marginX * 2 },
      );

    // gap 16

    const resultWidth = (doc.page.width - marginX * 2) / 3;
    doc.y += 20;
    y = doc.y;
    for (let i = 0; i < Belbin.success.length; i++) {
      doc.x = marginX;
      let x = doc.x;
      Object.entries(Belbin.success[i].agents).map(([k, v], index) => {
        doc.image(
          assetPath('icons/belbin/' + v.icon),
          x + resultWidth * (i % 3) + resultWidth / 2 + (index == 0 ? -56 : 9),
          y,
          {
            width: 47,
          },
        );
        doc.font('fontBlack').fontSize(fz.sm).fillColor(v.color);
        const keyWidth = doc.widthOfString(`${k.toUpperCase()}`);
        doc.text(
          k.toUpperCase(),
          x +
            resultWidth * (i % 3) +
            resultWidth / 2 -
            keyWidth / 2 +
            (index == 0 ? -32.5 : 32.5),
          y + 57,
        );
        if (index == 0) {
          doc
            .font(fontBold)
            .fontSize(12)
            .fillColor(colors.black)
            .text('+', x + resultWidth * (i % 3) + resultWidth / 2 - 9, y + 49);
        }
      });
      doc
        .moveTo(x + resultWidth * (i % 3) + resultWidth / 2 - 42, y + 80)
        .strokeColor(colors.orange)
        .lineTo(x + resultWidth * (i % 3) + resultWidth / 2 + 42, y + 80)
        .stroke();

      doc
        .font('fontMedium')
        .fillColor(colors.black)
        .text(
          Belbin.success[i].title,
          x + resultWidth * (i % 3) + resultWidth / 2 - 50,
          y + 90,
          {
            align: 'center',
            width: 100,
            lineBreak: true,
          },
        );
      if (i % 3 == 2) y = doc.y + 25;
    }
    doc.x = marginX;
    doc.y += 20;
    doc
      .moveTo(doc.x, doc.y)
      .strokeColor('#E2E2E2')
      .lineTo(doc.page.width - marginX, doc.y)
      .stroke();
    doc.y += 20;
    y = doc.y + (doc.page.height - doc.y - 154) / 2;
    x = marginX;
    await Promise.all(
      Object.entries(Belbin.successShort).map(([k, v], i) => {
        doc.font(fontBold).fontSize(fz.sm);
        let h = y + Math.floor(i / 3) * fz.lg;
        const text = `${k.toUpperCase()} ${firstLetterUpper(v.name)}`;
        const textWidth = doc.widthOfString(text);

        doc
          .fillColor(v.color)
          .text(
            `${k.toUpperCase()} `,
            x + resultWidth * (i % 3) + resultWidth / 2 - textWidth / 2,
            h,
            {
              continued: true,
            },
          );
        doc.font(fontNormal).text(`${firstLetterUpper(v.name)}`);
      }),
    );
    footer(doc);
  }
}
