import fs from 'fs';
import path from 'path';
export const colors = {
  black: '#231F20',
  orange: '#F36421',
  red: '#ED1C45',
  redSecondary: '#F9372A',
  grey: '#ccc',
  light: '#e2e2e2',
  green: '#409414',
  yellow: '#EDA600',
  blue: '#008AEA',
  purple: '#A93D73',
  brown: '#834731',
  sky: '#91AFD2',
  steel: '#466499',
  sun: '#FFD54E',
  gray: '#AAA5B4',
  moss: '#BFBB98',
  rust: '#C24533',
  leaf: '#82B465',
  lime: '#36B445',
  tangerine: '#F05A27',
  circlebg: '#fbd0bf',
  nonprogress: '#f2f2f2',
};

export const fz = {
  xs: 12,
  md: 14,
  sm: 13,
  lg: 16,
  xl: 20,
  xl2: 44,
};

export const lh = {
  md: 1.2,
};

export const assetPath = (p: string) => {
  const imagePath = path.join(__dirname, `../../../../src/assets/${p}.png`);
  return fs.readFileSync(imagePath);
};

export const header = (
  doc: PDFKit.PDFDocument,
  firstname: string,
  lastname: string,
  // date: Date,
  assessment?: string,
) => {
  doc.fontSize(10);

  doc.image(assetPath('logo'), marginX + 1, marginY, {
    width: 70,
  });
  doc.image(assetPath('top'), 0, 0, {
    width: doc.page.width,
  });
  let grad = doc.linearGradient(0, 0, doc.page.height, doc.page.height);
  grad.stop(0, colors.orange).stop(1, colors.red);
  doc.rect(marginX + 70 + 15, marginY - 5, 1, 26);
  doc.fill(grad);
  // icons

  doc.circle(marginX + 85 + 32, marginY + 9, 16);
  doc.fill(colors.circlebg);

  const char =
    firstname && firstname.length > 0 ? firstname.charAt(0).toUpperCase() : '';

  doc
    .fillColor(colors.orange)
    .font(fontBold)
    .fontSize(16)
    .text(char, marginX + 85 + 32 - 6, marginY + 2, {
      width: 12,
      align: 'center',
    });

  doc
    .fillColor(colors.black)
    .font(fontNormal)
    .fontSize(fz.sm)
    .text(lastname ?? '', marginX + 145, marginY - 3 + (firstname ? 0 : 12));

  doc
    .fillColor(colors.black)
    .fontSize(fz.sm)
    .font(fontBold)
    .text(firstname ?? '', marginX + 145, marginY + 11 - (lastname ? 0 : 12));
  doc.x = marginX;
  doc.y = doc.y + 40;

  // let y = doc.y;
  // doc
  //   .font(fontNormal)
  //   .fontSize(14)
  //   .text('Шалгуулагч', doc.x, y + 80, {
  //     align: 'left',
  //   });
  // doc.fontSize(14).text('Тест өгсөн огноо', doc.x, y + 80, {
  //   align: 'right',
  // });
  // doc.font(fontBold).fontSize(14).text(name, {
  //   align: 'left',
  // });
  // doc.moveUp(1);

  // doc.fontSize(14).text(`${dateFormatter(date)}`, {
  //   align: 'right',
  // });
  // doc.moveDown(1);

  if (assessment) {
    doc.font('fontBold').fontSize(16).fillColor(colors.orange).text(assessment);
    doc
      .moveTo(40, doc.y + 2)
      .strokeColor(colors.orange)
      .lineTo(100, doc.y + 2)
      .stroke()
      .moveDown();
  }
};

export const title = (
  doc: PDFKit.PDFDocument,
  // date: Date,
  assessment?: string,
  author?: string,
) => {
  if (assessment) {
    const textX = doc.x;
    const textY = doc.y + 5;
    const textWidth = doc.widthOfString(assessment);

    const textGrad = doc.linearGradient(textX, textY, textX + textWidth, textY);
    textGrad.stop(0, colors.orange).stop(1, colors.red);

    doc
      .font('fontBlack')
      .fontSize(22)
      .fillColor(textGrad)
      .text(assessment, textX, textY);

    doc
      .moveTo(40, doc.y)
      .strokeColor(colors.orange)
      .lineTo(180, doc.y)
      .stroke();

    if (author) {
      const iconSize = 16;
      const currentY = doc.y + 16;

      doc.image(assetPath('icons/author'), textX, currentY, {
        width: iconSize,
      });

      doc
        .fillColor(colors.orange)
        .font('fontBold')
        .fontSize(14)
        .text(author, textX + iconSize + 6, currentY + 1)
        .moveDown(1);

      doc.x = textX;
      doc.y = currentY + 40;
    }
  }
};

export const title10 = (
  doc: PDFKit.PDFDocument,
  // date: Date,
  firstname: string,
  lastname: string,
  assessment?: string,
) => {
  doc.fontSize(10);

  // Logo and top image
  doc.image(assetPath('logo'), marginX + 1, marginY, {
    width: 70,
  });
  doc.image(assetPath('top'), 0, 0, {
    width: doc.page.width,
  });

  doc.x = marginX;
  doc.y = doc.y + 40;

  const circleX = marginX + 16;
  const circleY = marginY + 85;
  const circleRadius = 16;

  doc.circle(circleX, circleY, circleRadius);
  doc.fill(colors.circlebg);

  const char =
    firstname && firstname.length > 0 ? firstname.charAt(0).toUpperCase() : '';

  doc
    .fillColor(colors.orange)
    .font(fontBold)
    .fontSize(16)
    .text(char, circleX - 10, circleY - 6, {
      width: 10,
      align: 'center',
    });

  const nameX = circleX + circleRadius + 10;

  doc
    .fillColor(colors.black)
    .font(fontNormal)
    .fontSize(fz.sm)
    .text('Шалгуулагч', nameX, marginY + 73);

  doc
    .fillColor(colors.black)
    .fontSize(fz.sm)
    .font(fontBold)
    .text(`${firstname || ''} ${lastname || ''}`, nameX, marginY + 87);

  doc.x = marginX;
  doc.y = doc.y + 40;

  if (assessment) {
    const textX = doc.x;
    const textY = marginY + 60 + 70;
    const textWidth = doc.widthOfString(assessment);

    const textGrad = doc.linearGradient(textX, textY, textX + textWidth, textY);
    textGrad.stop(0, colors.orange).stop(1, colors.red);

    doc
      .font('fontBlack')
      .fontSize(22)
      .fillColor(textGrad)
      .text(assessment, textX, textY);

    doc
      .moveTo(40, doc.y)
      .strokeColor(colors.orange)
      .lineTo(180, doc.y)
      .stroke();
  }
};

export const info = (
  doc: PDFKit.PDFDocument,
  author?: string,
  description?: string,
  measure?: string,
  usage?: string,
) => {
  let y = doc.y;
  let x = doc.x;
  let iconSize = 16;

  const currentY = doc.y + 16;

  doc.image(assetPath('icons/author'), x, currentY, {
    width: iconSize,
  });
  doc
    .fillColor(colors.orange)
    .font('fontBold')
    .fontSize(14)
    .text(author, x + iconSize + 6, currentY + 1)
    .moveDown(1);

  doc.y = currentY + 40;
  doc
    .fillColor(colors.black)
    .fontSize(12)
    .font(fontNormal)
    .text(description, x, doc.y, {
      align: 'justify',
      width: doc.page.width - marginX * 2,
    })
    .moveDown(1);
  y = doc.y;
  doc
    .font(fontBold)
    .fillColor(colors.black)
    .fontSize(13)
    .text('Хэмжих зүйлс', x, y)
    .moveDown(0.5);
  doc
    .fontSize(12)
    .font(fontNormal)
    .text(measure, x, doc.y, {
      align: 'justify',
      width: doc.page.width - marginX * 2,
    })
    .moveDown(1);
  y = doc.y;
  doc
    .font(fontBold)
    .fillColor(colors.black)
    .fontSize(13)
    .text('Хэрэглээ', x, y)
    .moveDown(0.5);
  doc
    .fontSize(12)
    .font(fontNormal)
    .text(usage, x, doc.y, {
      align: 'justify',
      width: doc.page.width - marginX * 2,
    });
  doc.moveDown(1);
};

export const home = (
  doc: PDFKit.PDFDocument,
  lastname: string,
  firstname: string,
  title: string,
) => {
  let grad = doc.linearGradient(0, 0, doc.page.height, doc.page.height);
  grad.stop(0, colors.orange).stop(1, '#EF3638');

  doc.rect(0, 0, doc.page.width, doc.page.height);
  doc.fill(grad);
  // const grad = doc.linearGradient(0, 0, doc.page.width, doc.page.height);
  // grad.stop(0, colors.orange);
  // grad.stop(1, colors.red);
  // doc.rect(0, 0, doc.page.width, doc.page.height);
  // doc.fillColor(grad);

  doc.image(assetPath('logo-white'), doc.page.width - marginX - 100, marginY, {
    width: 100,
  });
  doc.image(assetPath('icons/header-top-white'), 0, 0, {
    width: doc.page.width * 0.65,
  });

  doc.font(fontBold).fontSize(16).fillColor('#ffffff');
  let y = doc.y + 200;

  if (lastname != '')
    doc
      .text(lastname, doc.x, y, {
        continued: true,
      })
      .font(fontNormal)
      .text(' овогтой ', {
        continued: true,
      });
  doc
    .font(fontBold)
    .text(firstname, doc.x, y, {
      continued: true,
    })
    .font(fontNormal)
    .text(' таны')
    .moveDown(2);
  doc
    .font('fontBlack')
    .fontSize(44)
    .lineGap(-10)
    .text(title, {
      width: doc.page.width * 0.7,
    });
  doc.moveDown(1);
  doc.lineGap(0.15).fontSize(16).font('fontMedium').text('Үр дүн');
  const date = new Date();

  doc
    .font('fontMedium')
    .text(dateFormatter(date), marginX, doc.page.height - marginY - 20);

  doc.image(
    assetPath('icons/quarter'),
    doc.page.width * 0.2,
    doc.page.height - ((doc.page.width * 0.8) / 474) * 500,
    {
      width: doc.page.width * 0.8,
      height: ((doc.page.width * 0.8) / 474) * 500,
    },
  );
};

export const dateFormatter = (date: Date): string => {
  const year = date.getFullYear();
  let month = `${date.getMonth() + 1}`;
  parseInt(month) < 10 ? (month = `0${month}`) : null;
  let day = `${date.getDate()}`;
  parseInt(day) < 10 ? (day = `0${day}`) : null;
  return `${year}.${month}.${day}`;
};

export const firstLetterUpper = (text: string) => {
  return text.substring(0, 1).toUpperCase() + text.substring(1).toLowerCase();
};

export const footer = (doc: PDFKit.PDFDocument) => {
  doc
    .moveTo(marginX, doc.page.height - marginY - 60)
    .strokeColor(colors.light)
    .lineTo(doc.page.width - marginX, doc.page.height - marginY - 60)
    .stroke()
    .moveDown();

  const date = new Date();

  doc
    .font('fontMedium')
    .fillColor('#000')
    .fontSize(10)
    .text(
      `Тайлан боловсруулсан огноо: ${dateFormatter(date)}`,
      marginX,
      doc.page.height - marginY - 40,
    );

  doc
    .font(fontNormal)
    .fillColor('#7C7A7B')
    .fontSize(10)
    .text(
      'Энэхүү тест, үнэлгээний тайлан нь зөвхөн шалгуулагч болон түүний ажил олгогчийн хэрэгцээнд зориулагдсан бөгөөд үнэлгээний тайланг ямар нэгэн байдлаар хуулбарлахыг хориглоно. ',
      marginX,
      doc.page.height - marginY - 26,
      {
        continued: true,
        align: 'justify',
        width: doc.page.width - marginX * 2,
      },
    )
    .font('fontMedium')
    .text('© 2025 Hire.mn', { continued: true })
    .font(fontNormal)
    .text('.');
};

export const fontBold = 'Gilroy-Bold';
export const fontNormal = 'Gilroy';
export const marginX = 40;
export const marginY = 25;
export class Formatter {
  static money(value: string, currency = ''): string {
    return `${currency}${value
      .replaceAll(',', '')
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  }
  static location(
    city: string,
    district: string,
    town: string,
    khoroo: number,
  ): string {
    const include = town.toLowerCase().includes('хотхон');
    return `${city} хот, ${district} дүүрэг, ${khoroo}-р хороо, ${town} ${include ? '' : 'хотхон'}`;
  }

  static userName(name: string, lastname?: string, firstname?: string): string {
    return `${lastname ?? ''} ${firstname ?? ''} ${!lastname && !firstname && name}`;
  }
  //   'Таны Улаанбаатар хот, Хан уул дүүрэг, 11-р хороо, 17020, Жардин хотхон, 120-р байр, 6 дугаар давхарын 3 өрөө 80м.кв орон сууцны өнөөгийн зах зээлийн үнэ 160,950,000.00 төгрөг орчмын үнэтэй байна.';
  static text(
    city: string,
    district: string,
    khoroo: number,
    zipcode: number,
    town: string,
    price: number,
    area: number,
    room?: number,
    floor?: number,
    no?: string,
  ): string {
    const include = town.toLowerCase().includes('хотхон');
    return `Таны ${city} хот, ${district} дүүрэг, ${khoroo}-р хороо, ${zipcode}, ${town} ${include ? '' : 'хотхон'}, ${no ?? ''}${no && '-р байр,'} ${floor} ${floor && ' дугаар давхарын'} ${room}${room && ' өрөө'} ${area}м.кв орон сууцны өнөөгийн зах зээлийн үнэ ${this.money(`${price}`, '')} төгрөг орчим үнэтэй байна. Энэхүү тооцоолол нь өгөгдөлд суурилж тооцоолсон бөгөөд ±5%-ийн хооронд хэлбэлзэх боломжтой.`;
  }
}
