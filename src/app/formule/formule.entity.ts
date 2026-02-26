import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AssessmentFormulaEntity } from '../assessment/entities/assessment.formule.entity';

@Entity('formule')
export class FormulaEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  formula: string;

  @Column('simple-array', { nullable: true })
  variables: number[]; // Variables like ['a', 'b', 'c']

  @Column('simple-array', { nullable: true })
  groupBy: string[];

  @Column({ nullable: true })
  limit: number;
  @Column({ default: true })
  sort: boolean;

  @Column({ nullable: true })
  order: string;

  @Column('json', { nullable: true })
  aggregations: {
    field: string;
    operation: string;
    // operation: 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';
  }[];

  @Column('json', { nullable: true })
  filters?: {
    [key: string]: any;
  };
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
  @Column({ nullable: true })
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
  @OneToMany(
    () => AssessmentFormulaEntity,
    (assessment) => assessment.formule,
    {
      nullable: true,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  )
  assessment: AssessmentFormulaEntity[];
}
