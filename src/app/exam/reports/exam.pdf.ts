import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

const top: Content = {
  image: 'src/assets/top.png',
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

const colors = {
  main: '#F36421',
  green: '#518138',
  red: '#D6483E',
  yellow: '#EDA600',
  blue: '#2DA9FF',
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
        canvas: [],
      },
    ],
    styles: styles,
  };
};
