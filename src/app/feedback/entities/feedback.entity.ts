import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import { UserEntity } from 'src/app/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('feedback')
export class FeedbackEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;
  @Column()
  type: number;
  @Column({ nullable: true })
  message: string;
  @Column({ nullable: true })
  status: number;
  @ManyToOne(() => UserEntity, (service) => service.feedbacks)
  user: UserEntity;
  @ManyToOne(() => AssessmentEntity, (service) => service.feedbacks, {
    onDelete: 'CASCADE',
  })
  assessment: AssessmentEntity;
}
