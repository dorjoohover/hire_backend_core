import { AssessmentCategoryEntity } from 'src/app/assessment.category/entities/assessment.category.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LevelEntity } from './assessment.level.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { QuestionAnswerCategoryEntity } from 'src/app/question/entities/question.answer.category.entity';
import { FeedbackEntity } from 'src/app/feedback/entities/feedback.entity';
import { PaymentEntity } from 'src/app/payment/entities/payment.entity';
import { AssessmentAudience } from 'src/base/constants';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { AssessmentFormulaEntity } from './assessment.formule.entity';

@Entity('assessment')
export class AssessmentEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column({ unique: true })
  name: string;
  @Column()
  description: string;
  @Column()
  usage: string;
  @Column()
  measure: string;
  @Column()
  price: number;
  @Column({ nullable: true })
  exampleReport: string;
  @Column({ nullable: true })
  status: number;
  @Column({ nullable: true })
  classificationCode: string;
  @Column({ default: false })
  timeout: boolean;
  @Column()
  duration: number;
  @Column({ nullable: true })
  icons: string;
  @Column({ nullable: true })
  author: string;
  @Column({ nullable: true })
  formule: number;
  @Column({ nullable: true })
  advice: string;
  @Column()
  questionCount: number;
  @Column({ default: false })
  questionShuffle: boolean;
  @Column({ default: false })
  categoryShuffle: boolean;
  @Column({ default: false })
  answerShuffle: boolean;
  @Column({ nullable: true })
  page: number;
  /** Шалгалт дуусмагц шалгуулагч өөрийн хариуг харж болох эсэх */
  @Column({ default: true })
  showResultOnComplete: boolean;
  /** Шалгалтын блокуудын хооронд чөлөөтэй шилжих боломжтой эсэх */
  @Column({ default: false })
  blockNavigation: boolean;

  @Column({ nullable: true })
  totalPoint: number;

  @Column()
  type: number;
  @Column({ default: AssessmentAudience.DEFAULT })
  audience: number;
  @Column({ nullable: true })
  report: number;
  @Column({ nullable: true, default: false })
  partialScore: boolean;

  // ---------------------------------------------------------------------
  // Тайлангийн monetization (paywall) — тест бүрээр admin-аас тохируулна.
  // ---------------------------------------------------------------------
  /**
   * Тайланг үнэгүй харах эрхийн тоо.
   * 0 = харах paywall унтраалттай (хязгааргүй үнэгүй).
   * 1 = зөвхөн НЭГ удаа үнэгүй, дараа нь төлбөртэй.
   */
  @Column({ default: 0 })
  reportFreeViews: number;

  /** true бол дэлгэц дээр харах үнэгүй, харин PDF татахад төлбөртэй. */
  @Column({ default: false })
  reportPdfPaid: boolean;

  /**
   * Тайланг нэг удаа "нээх"-ийн үнэ (₮). 0 бол paywall идэвхгүй.
   * Нэг удаа төлөхөд тухайн exam code дээр хязгааргүй харах + PDF нээгдэнэ.
   */
  @Column({ default: 0 })
  reportPrice: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
  @Column()
  createdUser: number;
  @ManyToOne(() => UserEntity, (user) => user.assessments)
  owner: UserEntity;
  @Column({ nullable: true })
  updatedUser: number;
  @ManyToOne(() => AssessmentCategoryEntity, (category) => category.assessments)
  category: AssessmentCategoryEntity;

  @ManyToOne(() => LevelEntity, (level) => level.assessments, {
    nullable: true,
  })
  level: LevelEntity;
  @OneToMany(() => QuestionCategoryEntity, (question) => question.assessment, {
    nullable: true,
  })
  questionCategories: QuestionCategoryEntity[];
  @OneToMany(
    () => QuestionAnswerCategoryEntity,
    (question) => question.assessment,
    {
      nullable: true,
    },
  )
  answerCategories: QuestionAnswerCategoryEntity[];
  @OneToMany(() => PaymentEntity, (question) => question.assessment, {
    nullable: true,
  })
  payments: PaymentEntity[];
  @OneToMany(() => ExamEntity, (question) => question.assessment, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  exams: ExamEntity[];
  @OneToMany(() => UserServiceEntity, (service) => service.assessment, {
    nullable: true,
  })
  services: UserServiceEntity[];
  @OneToMany(() => FeedbackEntity, (service) => service.assessment, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  feedbacks: FeedbackEntity[];
  @OneToMany(() => AssessmentFormulaEntity, (service) => service.assessment, {
    nullable: true,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  formules: AssessmentFormulaEntity[];
}
