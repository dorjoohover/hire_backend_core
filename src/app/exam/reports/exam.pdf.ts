import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { Formatter } from './formatter';

const top: Content = {
  image: 'src/assets/top.png',
  // width: ,
  absolutePosition: {
    x: 0,
    y: 0,
  },
};

const logo: Content = {
  image: 'src/assets/logo.png',
  width: 69,
  marginTop: -15,
  alignment: 'left',
};
const icons = {
  result: 'src/assets/icons/result.png',
  time: 'src/assets/icons/time.png',
};

// const location = 'Улаанбаатар хот, ХанУул дүүрэг, 11-р хороо, Жардин хотхон';
// const town = 'Jardin хотхон';
// const type = 'Орон сууц';
// const value = {
//   min: 1200000,
//   max: 2500000,
//   avg: 1950000,
//   area: 80,
// };
const oronSuutsniiUniinOsolt = 12;
const hunAminOsoltHugjil = 3;
const heregleeniiUniinIndex = 8;
// const user = {
//   name: 'Алтангэрэл ЭРДЭМСАЙХАН',
//   email: 'erdemsaikhan.dev@gmail.com',
//   phone: '+976-8899-2864',
// };

// const text =
//   'Таны Улаанбаатар хот, Хан уул дүүрэг, 11-р хороо, 17020, Жардин хотхон, 120-р байр, 6 дугаар давхарын 3 өрөө 80м.кв орон сууцны өнөөгийн зах зээлийн үнэ 160,950,000.00 төгрөг орчмын үнэтэй байна.';
const colors = {
  main: '#F36421',
  black: '#231F20',
};
const styles: StyleDictionary = {
  h1: {
    fontSize: 32,
    bold: true,
    color: colors.main,
  },
  h2: {
    fontSize: 24,
    bold: true,
  },
  h3: {
    fontSize: 20,
    bold: true,
    color: '#F36421',
  },
  h4: {
    fontSize: 18,
    bold: true,
  },
  h5: {
    fontSize: 16,
    bold: true,
  },
  h6: {
    fontSize: 14,
    color: '#1D1E44',
  },
};
const size = (size: number): Content => {
  return {
    text: '',
    margin: size,
  };
};
export const ImageReport = ({
  name,
  date,
  point,
  max,
  percent,
  duration,
  maxDuration,
}: {
  name: string;
  duration: number;
  maxDuration: number;
  date: string;
  point: number;
  max: number;
  percent: number;
}): TDocumentDefinitions => {
  // const date = new Date();

  return {
    defaultStyle: {
      // fontSize: 8,
      font: 'CIP',
    },
    pageSize: 'A4',
    footer: {
      text: 'Энэхүү тест, үнэлгээний тайлан нь зөвхөн шалгуулагч болон түүний ажил олгогчийн хэрэгцээнд зориулагдсан болно. Үнэлгээний тайланг хуулбарлахыг хориглоно. Hire.mn ',
      marginLeft: 40,
      marginRight: 40,
    },
    content: [
      {
        alignment: 'left',
        columns: [logo, top],
      },
      size(32),
      {
        alignment: 'justify',
        columns: [
          {
            text: `Шалгуулагч`,
            style: 'h6',
            bold: false,
            color: colors.black,
          },
          {
            bold: false,
            alignment: 'right',
            text: 'Тест өгсөн огноо',
            style: 'h6',
            color: colors.black,
          },
        ],
      },
      {
        alignment: 'justify',
        columns: [
          {
            text: name,
            style: 'h6',
            bold: true,
            color: colors.black,
          },
          {
            bold: true,
            alignment: 'right',
            text: date,
            style: 'h6',
            color: colors.black,
          },
        ],
      },
      size(20),
      {
        alignment: 'justify',

        columns: [
          {
            alignment: 'left',
            text: 'ДҮРСЭН МЭДЭЭЛЭЛТЭЙ АЖИЛЛАХ ЧАДВАРЫН ТЕСТ',
            width: '60%',
            bold: true,
            style: 'h3',
          },
          {
            width: '25%',
            text: '',
          },
          {
            alignment: 'right',
            marginLeft: 5,
            marginTop: 25,
            columns: [
              {
                alignment: 'center',
                image: icons.result,
                width: 18,
                marginLeft: 2,
              },
              {
                text: 'Үр дүн',
                style: 'h6',
                bold: true,
              },
            ],
          },
        ],
      },
      size(5),
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 198,
            y2: 5,
            lineColor: colors.main,
            lineWidth: 1,
          },

          {
            type: 'line',
            lineColor: colors.main,
            x1: 515,
            y1: 5,
            x2: 431,
            y2: 5,
            lineWidth: 1,
          },
        ],
      },
      size(10),
      {
        alignment: 'justify',
        columns: [
          {
            alignment: 'left',
            text: 'Багт оруулж буй хувь нэмрээ таньж мэдсэнээр багийн гүйцэтгэлийг нэмэгдүүлэх, сайжруулах, багийн үйл ажиллагааг төгөлдөржүүлэх боломжийг олгоно.',
            width: '55%',
            style: 'h6',
            color: colors.black,
            bold: false,
          },
          [
            {
              alignment: 'right',
              marginLeft: 150,
              columns: [
                {
                  text: `${point}`,
                  style: 'h1',
                  color: colors.main,
                  bold: true,
                  marginRight: -10,
                  alignment: 'right',
                },

                {
                  text: `/${max}`,
                  alignment: 'right',
                  style: 'h2',
                  color: colors.black,
                  bold: true,
                  marginTop: 8,
                },
              ],
            },
            {
              text: 'Нийт тест гүйцэтгэгчдийн',
              style: 'h6',
              bold: false,
              alignment: 'right',
            },
            {
              alignment: 'right',
              marginLeft: 72,
              columns: [
                {
                  text: `${percent}%`,
                  style: 'h3',
                  bold: true,
                  marginRight: -10,
                  alignment: 'right',
                },
                {
                  marginTop: 4,
                  text: '-ийг давсан',
                  style: 'h6',
                  bold: false,
                  alignment: 'right',
                },
              ],
            },
            {
              alignment: 'right',
              marginLeft: 170,
              columns: [
                {
                  alignment: 'right',
                  image: icons.time,
                  width: 18,
                  marginRight: -2,
                },
                {
                  alignment: 'right',
                  text: 'Хугацаа',
                  style: 'h6',
                  bold: false,
                },
              ],
            },
            [
              {
                alignment: 'right',
                marginLeft: 120,
                columns: [
                  {
                    text: `${duration}`,
                    style: 'h4',
                    color: colors.main,
                    bold: true,
                    alignment: 'right',
                    marginRight: -5,
                  },

                  {
                    text: `/${maxDuration}`,
                    alignment: 'right',
                    style: 'h4',
                    color: colors.black,
                    bold: true,
                    marginRight: 4,
                  },
                  {
                    text: ` минут`,
                    alignment: 'right',
                    style: 'h5',
                    marginTop: 2,
                    color: colors.black,
                    bold: false,
                  },
                ],
              },
            ],
          ],
        ],
      },
      {
        canvas: [
          // Base axis line
          // {
          //   type: 'line',
          //   x1: 20,
          //   y1: 220,
          //   x2: 380,
          //   y2: 220,
          //   lineColor: 'black',
          //   lineWidth: 1,
          // },
          // Filled region under curve (Approximated with multiple polylines)
          // {
          //   type: 'polyline',
          //   points: [
          //     { x: 20, y: 220 },
          //     { x: 50, y: 200 },
          //     { x: 90, y: 150 },
          //     { x: 140, y: 100 },
          //     { x: 190, y: 80 },
          //     { x: 240, y: 100 },
          //     { x: 290, y: 150 },
          //     { x: 330, y: 200 },
          //     { x: 380, y: 220 },
          //   ],
          //   color: colors.main,
          //   lineWidth: 0,
          // },
          // Curve outline
          // {
          //   type: 'polyline',
          //   points: [
          //     { x: 20, y: 220 },
          //     { x: 50, y: 200 },
          //     { x: 90, y: 150 },
          //     { x: 140, y: 100 },
          //     { x: 190, y: 80 },
          //     { x: 240, y: 100 },
          //     { x: 290, y: 150 },
          //     { x: 330, y: 200 },
          //     { x: 380, y: 220 },
          //   ],
          //   lineColor: 'red',
          //   lineWidth: 2,
          // },
          // Percent labels
          // { type: 'text', text: '25%', x: 90, y: 225, fontSize: 10 },
          // { type: 'text', text: '50%', x: 180, y: 225, fontSize: 10 },
          // { type: 'text', text: '75%', x: 270, y: 225, fontSize: 10 },
          // { type: 'text', text: '100%', x: 350, y: 225, fontSize: 10 },
        ],
      },
    ],
    styles: styles,
  };
};
