import { EmailLogStatus, EmailLogType } from 'src/base/constants';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { UserEntity } from '../user/entities/user.entity';

@Entity('email_logs')
export class EmailLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  toEmail: string;

  //   garchig
  @Column({ length: 255, nullable: true })
  subject: string;

  @Column({ type: 'text', nullable: true })
  code: string;

  @Column({
    type: 'enum',
    enum: EmailLogStatus,
    default: EmailLogStatus.PENDING,
  })
  status: EmailLogStatus;
  @Column({
    type: 'enum',
    enum: EmailLogType,
    default: EmailLogType.VERIFICATION,
  })
  type: EmailLogType;

  @Column({ length: 255, nullable: true })
  url: string;
  @ManyToOne(() => UserEntity, (user) => user.emailLogs, { nullable: true })
  user: UserEntity;
  @Column({ length: 100, nullable: true })
  action: string;

  @Column({ type: 'text', nullable: true })
  error: string;
  @Column({ type: 'text', nullable: true })
  firstname: string;
  @Column({ type: 'text', nullable: true })
  lastname: string;
  @Column({ type: 'text', nullable: true })
  phone: string;
  @Column({ nullable: true })
  visible: boolean;
  @Column({ nullable: true })
  attemps: number;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date;
}
