import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { TransactionEntity } from 'src/app/payment/entities/transaction.entity';
import { UserEntity } from 'src/app/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('userService')
export class UserServiceEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  price: number;

  @Column()
  count: number;
  @Column()
  usedUserCount: number;

  @ManyToOne(() => UserEntity, (user) => user.services)
  user: UserEntity;
  @ManyToOne(() => AssessmentEntity, (assessment) => assessment.services, {
    onDelete: 'CASCADE',
  })
  assessment: AssessmentEntity;
  @CreateDateColumn()
  createdAt: Date;
  @OneToMany(() => ExamEntity, (exam) => exam.service, {
    nullable: true,
  })
  exams: ExamEntity[];
  @OneToMany(() => TransactionEntity, (transaction) => transaction.service, {
    nullable: true,
  })
  transactions: TransactionEntity[];
}
