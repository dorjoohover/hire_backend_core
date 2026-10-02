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

  return `data:image/png;base64,${qrBuffer.toString('base64')}`;
}
