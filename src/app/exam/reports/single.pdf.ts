import { Injectable } from '@nestjs/common';
import { colors, fontBold, fontNormal, marginX } from './formatter';

@Injectable()
export class SinglePdf {
  section(doc: PDFKit.PDFDocument, name: string, max: number, value: number) {
    const x = doc.x;
    const y = doc.y;
    const center = doc.page.width / 2;
    doc
      .font(fontBold)
      .fillColor(colors.black)
      .fontSize(14)
      .text(name, marginX, y, { align: 'left' });

    doc.font(fontBold).fontSize(20).fillColor(colors.black);
    const widthOfMax = doc.widthOfString(`/${max}`);
    doc.text(`/${max}`, x - marginX, y - 3, {
      align: 'right',
    });

    const widthOfValue = doc.widthOfString(`${value}`);
    doc
      .fontSize(24)
      .fillColor(colors.orange)
      .text(
        `${value}`,
        doc.page.width - widthOfMax - widthOfValue - 4 - marginX,
        y - 5,
        {
          // align: 'right',
        },
      );
    doc
      .roundedRect(doc.page.width - 150 - marginX, y + 3, 80, 8, 10)
      .fill(colors.grey);
    doc
      .roundedRect(
        doc.page.width - 150 - marginX,
        y + 3,
        (80 / max) * value,
        8,
        10,
      )
      .fill(colors.orange);
    doc
      .moveTo(marginX, doc.y)
      .strokeColor(colors.light)
      .lineTo(doc.page.width - marginX, doc.y)
      .stroke();

    doc.fontSize(14).moveDown();
    return;
  }

  list(doc: PDFKit.PDFDocument, title: string, value: string) {
    doc.font(fontNormal).fillColor(colors.black).fontSize(14);
    const y = doc.y;
    doc.text(title, doc.x, y, {
      bulletRadius: 0.01,
      listType: 'bullet',
    });
    doc.text(value, doc.x, y, {
      align: 'right',
      listType: 'bullet',
      bulletRadius: 0.01,
    });
    return;
  }
}
