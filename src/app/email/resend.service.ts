import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private resend = new Resend(process.env.RESEND_API_KEY);

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
    const res = await this.resend.emails.send({
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
