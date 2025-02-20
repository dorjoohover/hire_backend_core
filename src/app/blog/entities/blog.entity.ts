import { FeedbackEntity } from 'src/app/feedback/entities/feedback.entity';
import { PaymentEntity } from 'src/app/payment/entities/payment.entity';
import { TransactionEntity } from 'src/app/payment/entities/transaction.entity';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { UserEntity } from 'src/app/user/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity('blog')
export class BlogEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  title: string;
  @Column({ nullable: true })
  image: string;
  @Column()
  content: string;
  @Column({ default: 0 })
  minutes: number;

  @Column()
  category: number;

  @Column({ default: false })
  pinned: boolean;
  @CreateDateColumn()
  createdAt?: Date;
  @ManyToOne(() => UserEntity, (payment) => payment.blogs)
  user: UserEntity;
}
