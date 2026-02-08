import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExamEntity } from './exam.entity';
import { QuestionEntity } from 'src/app/question/entities/question.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';

@Entity('examDetail')
export class ExamDetailEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ nullable: true })
  questionCategoryName: string;

  @ManyToOne(() => ExamEntity, (exam) => exam.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: ExamEntity;

  @ManyToOne(() => QuestionEntity, (question) => question.examDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: QuestionEntity;

  @ManyToOne(() => QuestionCategoryEntity, (category) => category.examDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionCategoryId' })
  questionCategory: QuestionCategoryEntity;

  @ManyToOne(() => UserServiceEntity, (service) => service.exams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'serviceId' })
  service: UserServiceEntity;
}
