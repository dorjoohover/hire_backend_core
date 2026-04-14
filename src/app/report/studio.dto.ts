export class StudioDto {
  id?: number;
  key: string;
  assessmentId?: number | null;
  reportType: string;
  reportTypeCode?: number | null;
  version?: number;
  renderer?: string;
  name: string;
  description?: string | null;
  canvas?: Record<string, unknown> | null;
  pages?: Record<string, unknown>[] | null;
  defaultBody?: string | null;
  detailGrouping?: Record<string, unknown> | null;
  logicNotes?: string[] | null;
  variables?: Record<string, unknown>[] | null;
  elements?: Record<string, unknown>[] | null;
  previewData?: Record<string, unknown> | null;
  status?: number;
  createdUser: number;
  updatedUser?: number | null;
}
