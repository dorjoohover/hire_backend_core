import { AssessmentCategoryEntity } from 'src/app/assessment.category/entities/assessment.category.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LevelEntity } from './assessment.level.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';
import { UserService } from 'src/app/user/user.service';
import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { ExamEntity } from 'src/app/exam/entities/exam.entity';
import { QuestionAnswerCategoryEntity } from 'src/app/question/entities/question.answer.category.entity';

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
  @Column({nullable: true})
  status: number;
  @Column()
  duration: number;
  @Column({ nullable: true })
  icons: string;
  @Column({ nullable: true })
  author: string;
  @Column({ nullable: true })
  function: string;
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

  @Column()
  type: number;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column()
  createdUser: number;
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
  @OneToMany(() => ExamEntity, (question) => question.assessment, {
    nullable: true,
  })
  exams: ExamEntity[];
  @OneToMany(() => UserServiceEntity, (service) => service.assessment, {
    nullable: true,
  })
  services: QuestionCategoryEntity[];
}
