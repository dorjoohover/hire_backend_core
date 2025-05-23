import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { QuestionEntity } from './question.entity';
import { QuestionAnswerCategoryEntity } from './question.answer.category.entity';
import { QuestionAnswerEntity } from './question.answer.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';

@Entity('questionAnswerMatrix')
export class QuestionAnswerMatrixEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  value: string;
  @Column({ nullable: true, type: 'numeric' })
  point: number;
  @Column({ nullable: true })
  orderNumber: number;

  @ManyToOne(() => QuestionEntity, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;
  @ManyToOne(
    () => QuestionAnswerCategoryEntity,
    (category) => category.questionAnswers,
  )
  category: QuestionAnswerCategoryEntity;

  @ManyToOne(() => QuestionAnswerEntity, (answer) => answer.matrix, {
    onDelete: 'CASCADE',
  })
  answer: QuestionAnswerEntity;
  @OneToMany(() => UserAnswerEntity, (userAns) => userAns.matrix)
  userAnswers: UserAnswerEntity[];
}
