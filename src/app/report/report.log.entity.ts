import { REPORT_STATUS } from 'src/base/constants';
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('report_logs')
export class ReportLogEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  code: string;
  @Column({ nullable: true })
  result: string;

  @Column()
  role: number;

  @Column({
    type: 'enum',
    enum: REPORT_STATUS,
    default: REPORT_STATUS.STARTED,
  })
  status: REPORT_STATUS;

  @Column({ default: 0 })
  progress: number;

  @Column({ nullable: true })
  error?: string;

  // v1.3.0 (perf-bootstrap ADD COLUMN IF NOT EXISTS). select:false — DDL ажиллаагүй ч
  // энгийн уншилт эвдрэхгүй; бичилт/уншилт нь raw SQL-ээр (report-pipeline.service.ts).
  @Column({ type: 'jsonb', nullable: true, select: false })
  timings?: Record<string, number> | null;

  @Column({ type: 'int', default: 0, select: false })
  sweeps?: number;

  @Column({ type: 'varchar', length: 16, nullable: true, select: false })
  pipeline?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
