import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { isSafeMode, safeLog } from '../../utils/safe-mode';

@Injectable()
export class ResendService {
  // SAFE_MODE-д Resend клиент ҮҮСГЭХГҮЙ (түлхүүр байхгүй ч, байсан ч гадагш явахгүй).
  private resend = isSafeMode() ? null : new Resend(process.env.RESEND_API_KEY);

  async sendMail(input: {
    to: string;
    subject: string;
    html: string;
    attachments?: {
      filename: string;
      content: string;
      contentType?: string;
    }[];
  }) {
    if (isSafeMode()) {
      // Линкүүдийг (урилга / баталгаажуулалт / тайлан) лог-д гаргана — local-д
      // тухайн урсгалыг гараар үргэлжлүүлэхэд хэрэгтэй.
      const links = [...`${input.html}`.matchAll(/href=["']([^"']+)["']/g)]
        .map((m) => m[1])
        .filter((u) => /^https?:/i.test(u))
        .slice(0, 5);
      safeLog(
        'и-мэйл илгээгээгүй',
        `to=${input.to} subject="${input.subject}" attachments=${input.attachments?.length ?? 0}` +
          (links.length ? ` links=${links.join(' ')}` : ''),
      );
      return { data: { id: 'safe-mode' }, error: null } as any;
    }
    const res = await this.resend!.emails.send({
      from: `Hire.mn <noreply@hire.mn>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
      replyTo: process.env.EMAIL_FROM!,
    });
    return res;
  }
}
