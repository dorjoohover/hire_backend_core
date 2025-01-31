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

  @ManyToOne(() => UserEntity, (user) => user.payments)
  user: UserEntity;
  @ManyToOne(() => UserEntity, (user) => user.charges)
  charger: UserEntity;
  @OneToMany(() => TransactionEntity, (transaction) => transaction.payment, {
    nullable: true,
  })
  transactions: TransactionEntity[];
}
