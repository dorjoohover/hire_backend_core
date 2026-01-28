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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
