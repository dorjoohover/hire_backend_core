import { isNumber } from 'class-validator';
import * as xl from 'excel4node';

export class AppExcel {
  getExcelBuilder(sheeName: string) {
    const wb = new xl.Workbook();
    const ws = wb.addWorksheet(sheeName);

    const style = wb.createStyle({
      font: {
        color: '#000000',
        size: 12,
      },
      numberFormat: '#,##0.00; ($#,##0.00); -',
    });

    return { wb, ws, style };
  }
  addSheet(wb: any, sheeName: string) {
    const ws = wb.addWorksheet(sheeName);

    const style = wb.createStyle({
      font: {
        color: '#000000',
        size: 12,
      },
      numberFormat: '#,##0.00; ($#,##0.00); -',
    });

    return { wb, ws, style };
  }

  async render(
    rows: any,
    sheeName = 'Sheet 1',
  ): Promise<{
    wb: any;
    ws: any;
  }> {
    const { wb, ws, style } = this.getExcelBuilder(sheeName);
    rows.forEach((row, rowIndex) => {
      row.forEach((item, colIndex) => {
        const cell = ws.cell(rowIndex + 1, colIndex + 1).style(style);
        if (isNumber(item)) {
          cell.number(item);
        } else {
          if (item !== undefined && item !== null) {
            cell.string(item);
          }
        }
      });
    });

    return {
      wb,
      ws,
    };
  }

  async renderSheet(
    wb: any,
    rows: any,
    sheeName = 'Sheet 1',
  ): Promise<{
    wb: any;
    ws: any;
  }> {
    const { ws, style } = this.addSheet(wb, sheeName);
    rows.forEach((row, rowIndex) => {
      row.forEach((item, colIndex) => {
        const cell = ws.cell(rowIndex + 1, colIndex + 1).style(style);
        if (isNumber(item)) {
          cell.number(item);
        } else {
          if (item !== undefined && item !== null) {
            cell.string(item);
          }
        }
      });
    });

    return {
      wb,
      ws,
    };
  }
}
