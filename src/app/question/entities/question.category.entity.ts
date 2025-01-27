import { AssessmentCategoryEntity } from 'src/app/assessment.category/entities/assessment.category.entity';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionEntity } from './question.entity';
import { ExamDetailEntity } from 'src/app/exam/entities/exam.detail.entity';
import { QuestionCategoryType } from 'src/base/constants';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';

@Entity('questionCategory')
export class QuestionCategoryEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  name: string;
  @Column({ nullable: true })
  value: string;
  @Column({ default: 0, type: 'numeric', nullable: true })
  totalPoint: number;
  @Column({ nullable: true })
  duration: number;

  @Column({ nullable: true })
  orderNumber: number;
  // ene category heden asuult avch baigag haruulna
  @Column()
  questionCount: number;
  @Column({ default: QuestionCategoryType.CATEGORY })
  type: number;
  @Column({ nullable: true })
  url?: string;
  @Column()
  status: number;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column()
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
  @ManyToOne(
    () => AssessmentEntity,
    (assessment) => assessment.questionCategories,
    { onDelete: 'CASCADE' },
  )
  assessment: AssessmentEntity;
  @OneToMany(() => QuestionEntity, (question) => question.category, {
    nullable: true,
  })
  questions: QuestionEntity[];

  @OneToMany(() => ExamDetailEntity, (detail) => detail.questionCategory)
  examDetails: ExamDetailEntity[];
  @OneToMany(() => UserAnswerEntity, (user) => user.questionCategory)
  userAnswers: UserAnswerEntity[];

  setTotalPoint(value: number) {
    const point = parseFloat(`${this.totalPoint ?? 0}`);
    this.totalPoint = point + value;
  }
}
