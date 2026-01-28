import { REPORT_STATUS } from 'src/base/constants';

export class ReportLogDto {
  code?: string;
  id: string;

  role?: number;

  status?: REPORT_STATUS;

  progress?: number;
  result?: string
  error?: string;
}
