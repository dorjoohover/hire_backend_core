import { EmailLogType } from 'src/base/constants';

export interface EmailJobPayload {
  logId?: number;
  type: EmailLogType;
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  meta?: Record<string, any>;
}
