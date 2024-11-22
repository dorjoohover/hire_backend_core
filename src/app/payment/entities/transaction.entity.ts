import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { UserEntity } from 'src/app/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentEntity } from './payment.entity';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';

@Entity('transaction')
export class TransactionEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  price: number;

  @Column()
  count: number;

  @CreateDateColumn()
  createdAt: Date;
  @ManyToOne(() => PaymentEntity, (exam) => exam.transactions)
  payment: PaymentEntity;
  @ManyToOne(() => UserServiceEntity, (service) => service.transactions)
  service: UserServiceEntity;
}
