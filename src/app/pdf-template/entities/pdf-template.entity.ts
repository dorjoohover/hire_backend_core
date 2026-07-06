import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Studio (PDF builder) template — бүх хуудас/блокийн бүтэц pages (jsonb) дотор
// хадгалагдана. Frontend талын PdfTemplate type-той (studio/lib/types.ts)
// талбар бүрээр тохирсон.
@Entity('pdf_template')
export class PdfTemplateEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  key?: string;

  @Column({ nullable: true })
  assessmentId?: number;

  @Column({ nullable: true })
  assessmentTypeCode?: string;

  @Column({ nullable: true })
  context?: string;

  @Column({ type: 'jsonb', nullable: true })
  content?: string[];

  @Column({ default: false })
  internalView?: boolean;

  @Column({ nullable: true })
  fontFamily?: string;

  @Column({ nullable: true })
  fontSize?: number;

  @Column({ nullable: true })
  color?: string;

  @Column({ nullable: true, default: 'start' })
  logoPosition?: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  pages: any[];

  @Column({ type: 'jsonb', nullable: true })
  aiConfig?: Record<string, any>;

  @Column({ default: false })
  demoMode?: boolean;

  @Column({ type: 'jsonb', nullable: true })
  demoData?: Record<string, any>;

  // "AI Data" tab-ийн JSON input feature — хэрэглэгч бичсэн/paste хийсэн,
  // тухайн тестийн жинхэнэ AI тайлангийн бүтэцтэй тохирсон JSON (жиш нь
  // hire_mn_mapping.docx-ийн mapping schema). Зөвхөн Studio-ийн ДОТООД
  // preview/token эх сурвалж — жинхэнэ generate (createPdfInOneFile) руу
  // автоматаар холбогдоогүй, зөвхөн "PDF-ээр урьдчилан харах"
  // (createPreviewPdf) дээр л ашиглагдана.
  @Column({ type: 'jsonb', nullable: true })
  aiJsonData?: Record<string, any>;

  // Тухайн assessment дээр олон report (pages/blocks-ийн хувилбар) хадгалагдаж
  // болно, гэхдээ тэдгээрээс ГАНЦ нь л report generation-д ашиглагдана.
  // isActive=true бол тухайн assessmentId-н "идэвхтэй" report гэсэн үг —
  // нэг assessmentId дээр нэгэн зэрэг зөвхөн 1 мөр true байна
  // (pdf-template.dao.ts-ийн setActive() үүнийг transaction дотор баталгаажуулна).
  @Column({ default: false })
  isActive?: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt?: Date;
}
