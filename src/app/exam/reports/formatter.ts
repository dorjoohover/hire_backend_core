import fs from 'fs';
import path from 'path';
export const colors = {
  black: '#231F20',
  orange: '#F36421',
  red: '#ED1C45',
  grey: '#ccc',
  light: '#e2e2e2',
};

export const assetPath = (p: string) => {
  const imagePath = path.join(__dirname, `../../../../src/assets/${p}.png`);
  return fs.readFileSync(imagePath);
};
export const header = (
  doc: PDFKit.PDFDocument,
  name: string,
  date: Date,
  assessment: string,
) => {
  doc.fontSize(10);
  doc.image(assetPath('logo'), marginX, marginY, {
    width: 70,
  });
  doc.image(assetPath('top'), 0, 0, {
    width: doc.page.width,
  });
  let y = doc.y;
  doc
    .font(fontNormal)
    .fontSize(14)
    .text('Шалгуулагч', doc.x, y + 80, {
      align: 'left',
    });
  doc.fontSize(14).text('Тест өгсөн огноо', doc.x, y + 80, {
    align: 'right',
  });
  doc.font(fontBold).fontSize(14).text(name, {
    align: 'left',
  });
  doc.moveUp(1);

  doc.fontSize(14).text(`${dateFormatter(date)}`, {
    align: 'right',
  });
  doc.moveDown(1);
  doc
    .font(fontBold)
    .fontSize(20)
    .fillColor(colors.orange)
    .text(firstLetterUpper(assessment));
  doc
    .moveTo(30, doc.y)
    .strokeColor(colors.orange)
    .lineTo(230, doc.y)
    .stroke()
    .moveDown();
};

export const home = (
  doc: PDFKit.PDFDocument,
  lastname: string,
  firstname: string,
  title: string,
) => {
  const y = doc.y;
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
    width: doc.page.width * 0.6,
  });

  doc.font(fontBold).fontSize(16).fillColor('#ffffff');
  doc.moveDown(3);
  doc
    .text(lastname, doc.x, doc.y + 100, {
      continued: true,
    })
    .font(fontNormal)
    .text(' овогтой ', {
      continued: true,
    })
    .font(fontBold)
    .text(firstname, {
      continued: true,
    })
    .font(fontNormal)
    .text(' таны')
    .moveDown(2);
  doc
    .font(fontBold)
    .fontSize(44)
    .lineGap(0.1)
    .text(title, doc.x, doc.y, {
      width: doc.page.width * 0.7,
    });
  doc.moveDown(2);
  doc.fontSize(16).text('Үр дүн');
  const date = new Date();

  doc.text(dateFormatter(date), marginX, doc.page.height - marginY - 16);

  doc.image(
    assetPath('icons/quarter'),
    doc.page.width * 0.2,
    doc.page.height - ((doc.page.width * 0.8) / 474) * 555,
    {
      width: doc.page.width * 0.8,
      height: ((doc.page.width * 0.8) / 474) * 555,
    },
  );
};

export const dateFormatter = (date: Date): string => {
  const year = date.getFullYear();
  let month = `${date.getMonth() + 1}`;
  parseInt(month) < 10 ? (month = `0${month}`) : null;
  let day = `${date.getDate()}`;
  parseInt(day) < 10 ? `0${day}` : null;
  return `${year}.${month}.${day}`;
};

export const firstLetterUpper = (text: string) => {
  return text.substring(0, 1).toUpperCase() + text.substring(1);
};

export const footer = (doc: PDFKit.PDFDocument) => {
  doc
    .font(fontNormal)
    .fillColor('#2f2d2d')
    .fontSize(10)
    .text(
      'Энэхүү тест, үнэлгээний тайлан нь зөвхөн шалгуулагч болон түүний ажил олгогчийн хэрэгцээнд зориулагдсан бөгөөд үнэлгээний тайланг ямар нэгэн байдлаар хуулбарлахыг хориглоно.',
      marginX,
      doc.page.height - marginY - 32,
    );
  doc.font(fontBold).text('© Hire.mn');
};

export const fontBold = 'Gilroy-Bold';
export const fontNormal = 'Gilroy';
export const marginX = 30;
export const marginY = 30;
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
