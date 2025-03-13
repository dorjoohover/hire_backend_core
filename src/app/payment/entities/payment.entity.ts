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
import { TransactionEntity } from './transaction.entity';

@Entity('payment')
export class PaymentEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  totalPrice: number;

  @CreateDateColumn()
  createdAt: Date;
  @Column()
  method: number;
  @Column({ nullable: true })
  message: string;

  @ManyToOne(() => UserEntity, (user) => user.payments, { nullable: true })
  user: UserEntity;
  @ManyToOne(() => UserEntity, (user) => user.charges)
  charger: UserEntity;
  @ManyToOne(() => AssessmentEntity, (user) => user.payments, {
    nullable: true,
  })
  assessment: AssessmentEntity;
  @OneToMany(() => TransactionEntity, (transaction) => transaction.payment, {
    nullable: true,
  })
  transactions: TransactionEntity[];
}
