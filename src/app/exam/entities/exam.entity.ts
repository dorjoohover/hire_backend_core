import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamDetailEntity } from './exam.detail.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';

@Entity('exam')
export class ExamEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  //   token|code|url|sequence
  @Column()
  code: number;
  // assessment name
  @Column()
  assessment: string;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;
  @Column({ nullable: true })
  userEndDate: Date;
  @Column({ nullable: true })
  userStartDate: Date;

  @ManyToOne(() => UserServiceEntity, (service) => service.exams)
  service: UserServiceEntity;
  @OneToMany(() => ExamDetailEntity, (detail) => detail.exam, {
    nullable: true,
  })
  details: ExamDetailEntity[];
  @OneToMany(() => UserAnswerEntity, (userAns) => userAns.exam)
  userAnswers: UserAnswerEntity[];
}
