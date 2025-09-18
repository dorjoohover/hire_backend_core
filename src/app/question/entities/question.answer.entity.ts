import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { QuestionEntity } from './question.entity';
import { QuestionAnswerCategoryEntity } from './question.answer.category.entity';
import { QuestionAnswerMatrixEntity } from './question.answer.matrix.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';

@Entity('questionAnswer')
export class QuestionAnswerEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  value: string;
  @Column({ nullable: true, type: 'numeric' })
  point: number;
  @Column()
  orderNumber: number;
  @Column({ nullable: true })
  file: string;
  @Column({ default: false })
  correct: boolean;
  @Column({ default: false })
  negative: boolean;
  @Column({ default: false })
  reverse: boolean;

  @ManyToOne(() => QuestionEntity, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;
  @ManyToOne(
    () => QuestionAnswerCategoryEntity,
    (category) => category.questionAnswers,
    { nullable: true },
  )
  category: QuestionAnswerCategoryEntity;
  @OneToMany(() => QuestionAnswerMatrixEntity, (matrix) => matrix.answer)
  matrix: QuestionAnswerMatrixEntity[];
  @OneToMany(() => UserAnswerEntity, (userAns) => userAns.answer)
  userAnswers: UserAnswerEntity[];
}
