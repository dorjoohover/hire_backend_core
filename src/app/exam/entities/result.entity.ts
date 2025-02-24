import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExamEntity } from './exam.entity';
import { QuestionEntity } from 'src/app/question/entities/question.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';

@Entity('result')
export class ResultEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ nullable: true })
  questionCategoryName: string;

  @ManyToOne(() => ExamEntity, (exam) => exam.details, { onDelete: 'CASCADE' })
  exam: ExamEntity;
  @ManyToOne(() => QuestionEntity, (question) => question.examDetails, {
    onDelete: 'CASCADE',
  })
  question: QuestionEntity;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.examDetails, {
    onDelete: 'CASCADE',
  })
  questionCategory: QuestionCategoryEntity;

  @ManyToOne(() => UserServiceEntity, (service) => service.exams, {
    onDelete: 'CASCADE',
  })
  service: UserServiceEntity;
}
