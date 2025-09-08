import { EmailLogStatus } from 'src/base/constants';
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

  @Column({ length: 255, nullable: true })
  url: string;
  @ManyToOne(() => UserEntity, (user) => user.emailLogs, { nullable: true })
  user: UserEntity;
  @Column({ length: 100, nullable: true })
  action: string;

  @Column({ type: 'text', nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;
}
