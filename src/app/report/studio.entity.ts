import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('studio')
@Index('IDX_studio_assessment_report_type', ['assessmentId', 'reportType'])
export class StudioEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column({ unique: true })
  key: string;

  @Column({ nullable: true })
  assessmentId?: number | null;

  @ManyToOne(() => AssessmentEntity, (assessment) => assessment.studios, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assessmentId' })
  assessment?: AssessmentEntity;

  @Column()
  reportType: string;

  @Column({ nullable: true })
  reportTypeCode?: number | null;

  @Column({ default: 1 })
  version: number;

  @Column({ default: 'absolute-html-v2' })
  renderer: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  canvas?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  pages?: Record<string, unknown>[] | null;

  @Column({ type: 'text', nullable: true })
  defaultBody?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detailGrouping?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  logicNotes?: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  variables?: Record<string, unknown>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  elements?: Record<string, unknown>[] | null;

  @Column({ type: 'jsonb', nullable: true })
  previewData?: Record<string, unknown> | null;

  @Column({ default: 1 })
  status: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column()
  createdUser: number;

  @Column({ nullable: true })
  updatedUser?: number | null;
}
