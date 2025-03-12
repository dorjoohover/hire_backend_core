import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamDetailEntity } from './exam.detail.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';

@Entity('exam')
export class ExamEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  //   token|code|url|sequence
  @Column({ type: 'bigint' })
  code: number;
  // assessment name
  @Column()
  assessmentName: string;
  // @Column({ nullable: true })
  // result: string;
  @Column({ nullable: true })
  email: string;
  @Column({ nullable: true })
  firstname: string;
  @Column({ nullable: true })
  lastname: string;
  @Column({ nullable: true })
  phone: string;
  @Column({ default: true, nullable: true })
  visible: boolean;

  @Column({ nullable: true })
  startDate: Date;
  @CreateDateColumn()
  createdAt: Date;
  @Column({ nullable: true })
  endDate: Date;
  @Column({ nullable: true })
  userEndDate: Date;
  @Column({ nullable: true })
  userStartDate: Date;

  @ManyToOne(() => UserServiceEntity, (service) => service.exams, {
    onDelete: 'CASCADE',
  })
  service: UserServiceEntity;
  @ManyToOne(() => AssessmentEntity, (service) => service.exams, {
    onDelete: 'CASCADE',
  })
  assessment: AssessmentEntity;
  @OneToMany(() => ExamDetailEntity, (detail) => detail.exam, {
    nullable: true,
  })
  details: ExamDetailEntity[];
  @OneToMany(() => UserAnswerEntity, (userAns) => userAns.exam)
  userAnswers: UserAnswerEntity[];
}
