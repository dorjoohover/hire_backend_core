import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { QuestionAnswerCategoryEntity } from 'src/app/question/entities/question.answer.category.entity';
import { QuestionAnswerEntity } from 'src/app/question/entities/question.answer.entity';
import { QuestionAnswerMatrixEntity } from 'src/app/question/entities/question.answer.matrix.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';
import { QuestionEntity } from 'src/app/question/entities/question.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('userAnswer')
export class UserAnswerEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  //   token|code|url|sequence
  @Column({ nullable: true })
  ip: string;
  @Column({ nullable: true })
  device: string;
  @Column()
  point: number;
  @Column({ nullable: true })
  flag: boolean;

  @ManyToOne(() => ExamEntity, (exam) => exam.userAnswers)
  exam: ExamEntity;
  @ManyToOne(() => QuestionEntity, (exam) => exam.userAnswers)
  question: QuestionEntity;
  @ManyToOne(
    () => QuestionAnswerCategoryEntity,
    (category) => category.userAnswers,
  )
  answerCategory: QuestionAnswerCategoryEntity;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.userAnswers)
  questionCategory: QuestionCategoryEntity;
  @ManyToOne(() => QuestionAnswerEntity, (exam) => exam.userAnswers)
  answer: QuestionAnswerEntity;
  @ManyToOne(() => QuestionAnswerMatrixEntity, (exam) => exam.userAnswers)
  matrix: QuestionAnswerMatrixEntity;
  res: { id: number; };
}
