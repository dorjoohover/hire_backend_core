import * as QRCode from 'qrcode';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const LOGO_PATH = path.resolve(__dirname, '../assets/logo.png');

/**
 * URL-аас QR код үүсгэж, голд нь Hire лого (цагаан тойрог дотор) тавина.
 * Буцаах утга: data:image/png;base64,... string
 */
export async function generateQrWithLogo(url: string): Promise<string> {
  const qrSize = 400;

  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    width: qrSize,
    margin: 1,
    color: { dark: '#2d2d2d', light: '#ffffff' },
  });

  if (!fs.existsSync(LOGO_PATH)) {
    return `data:image/png;base64,${qrBuffer.toString('base64')}`;
  }

  try {
    const logoSize = 72;
    const circleSize = 100;
    const padding = (circleSize - logoSize) / 2;

    const logoResized = await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    const circleSvg = Buffer.from(
      `<svg width="${circleSize}" height="${circleSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${circleSize / 2}" cy="${circleSize / 2}" r="${circleSize / 2}" fill="white"/>
      </svg>`,
    );

    const logoOnCircle = await sharp(circleSvg)
      .composite([{ input: logoResized, top: padding, left: padding }])
      .png()
      .toBuffer();

    const top = Math.round((qrSize - circleSize) / 2);
    const left = Math.round((qrSize - circleSize) / 2);

    const finalQr = await sharp(qrBuffer)
      .composite([{ input: logoOnCircle, top, left }])
      .png()
      .toBuffer();

    return `data:image/png;base64,${finalQr.toString('base64')}`;
  } catch {
    return `data:image/png;base64,${qrBuffer.toString('base64')}`;
  }
}
