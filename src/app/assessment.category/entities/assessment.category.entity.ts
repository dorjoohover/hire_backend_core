import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assessmentCategory')
export class AssessmentCategoryEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({
    nullable: true,
  })
  index: number;
  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @Column()
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
  @ManyToOne(
    () => AssessmentCategoryEntity,
    (category) => category.subcategories,
    {
      nullable: true,
    },
  )
  parent: AssessmentCategoryEntity;

  @OneToMany(() => AssessmentCategoryEntity, (category) => category.parent)
  subcategories: AssessmentCategoryEntity[];

  @OneToMany(() => AssessmentEntity, (category) => category.category)
  assessments: AssessmentEntity[];
}
