import { FeedbackEntity } from 'src/app/feedback/entities/feedback.entity';
import { PaymentEntity } from 'src/app/payment/entities/payment.entity';
import { TransactionEntity } from 'src/app/payment/entities/transaction.entity';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ unique: true })
  email: string;
  @Column({ nullable: true })
  lastname: string;
  @Column({ nullable: true })
  firstname: string;

  @Column({ nullable: true })
  password: string;
  @Column({ nullable: true })
  profile?: string;
  @Column()
  role: number;
  @Column({ nullable: true })
  phone?: string;
  @Column({ nullable: true })
  organizationPhone?: string;
  @Column({ nullable: true })
  organizationName?: string;
  @Column({ nullable: true })
  organizationRegisterNumber?: string;
  @Column({ nullable: true })
  position?: string;
  @CreateDateColumn()
  createdAt?: Date;
  @Column({ default: 0 })
  wallet: number;
  @Column({ default: false })
  emailVerified?: boolean;
  @OneToMany(() => PaymentEntity, (payment) => payment.user, {
    nullable: true,
  })
  payments?: PaymentEntity[];
  @OneToMany(() => PaymentEntity, (payment) => payment.user, {
    nullable: true,
  })
  charges?: PaymentEntity[];
  @OneToMany(() => UserServiceEntity, (service) => service.user, {
    nullable: true,
  })
  services?: UserServiceEntity[];
  @OneToMany(() => FeedbackEntity, (feedback) => feedback.user, {
    nullable: true,
  })
  feedbacks?: FeedbackEntity[];
}
