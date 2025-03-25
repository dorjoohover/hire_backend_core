import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  message: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  stack?: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ nullable: true })
  method?: string;

  @Column({ nullable: true })
  ip?: string;
  
  @Column({ nullable: true })
  device?: string;

  @CreateDateColumn()
  timestamp: Date;
}
