import { AssessmentCategoryEntity } from 'src/app/assessment.category/entities/assessment.category.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { AssessmentEntity } from './assessment.entity';

@Entity('assessmentLevel')
export class LevelEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column({ unique: true })
  name: string;
  @Column()
  description: string;

  @OneToMany(() => AssessmentEntity, (assessment) => assessment.level, {
    nullable: true,
  })
  assessments: AssessmentEntity[];
}
