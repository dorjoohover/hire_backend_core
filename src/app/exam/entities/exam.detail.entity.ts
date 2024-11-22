import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExamEntity } from './exam.entity';
import { QuestionEntity } from 'src/app/question/entities/question.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';

@Entity('examDetail')
export class ExamDetailEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  pageNumber: number;
  @Column({ nullable: true })
  questionCategoryName: string;

  @ManyToOne(() => ExamEntity, (exam) => exam.details)
  exam: ExamEntity;
  @ManyToOne(() => QuestionEntity, (question) => question.examDetails)
  question: QuestionEntity;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.examDetails)
  questionCategory: QuestionCategoryEntity;

  @ManyToOne(() => UserServiceEntity, (service) => service.exams)
  service: UserServiceEntity;
}
