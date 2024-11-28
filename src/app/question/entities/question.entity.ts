import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionCategoryEntity } from './question.category.entity';
import { QuestionAnswerEntity } from './question.answer.entity';
import { ExamDetailEntity } from 'src/app/exam/entities/exam.detail.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';
import { QuestionTypeEntity } from './question.type.entity';
@Entity('question')
export class QuestionEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  name: string;
  @ManyToOne(() => QuestionTypeEntity, (type) => type.questions)
  type: QuestionTypeEntity;
  @Column()
  status: number;
  @Column()
  minValue: number;
  @Column()
  maxValue: number;
  @Column({nullable: true})
  point: number;
  @Column()
  orderNumber: number;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updateAt: Date;
  @Column({ nullable: true })
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
  @Column({ nullable: true })
  file: string;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.questions)
  category: QuestionCategoryEntity;
  @OneToMany(() => QuestionAnswerEntity, (answer) => answer.question)
  answers: QuestionAnswerEntity[];
  @OneToMany(() => ExamDetailEntity, (detail) => detail.question)
  examDetails: ExamDetailEntity[];
  @OneToMany(() => UserAnswerEntity, (userAns) => userAns.answer)
  userAnswers: UserAnswerEntity[];
}
