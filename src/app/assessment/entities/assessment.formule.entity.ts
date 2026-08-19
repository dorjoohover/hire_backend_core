import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { FormulaEntity } from 'src/app/formule/formule.entity';
import { AssessmentEntity } from './assessment.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';

@Entity('assessment_formulas')
export class AssessmentFormulaEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @ManyToOne(() => AssessmentFormulaEntity, (user) => user.id, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  parent: AssessmentFormulaEntity;
  @Column({ nullable: true })
  type: number;
  @ManyToOne(() => FormulaEntity, (user) => user.assessment)
  formule: FormulaEntity;
  @ManyToOne(() => AssessmentEntity, (user) => user.formules, {
    onDelete: 'CASCADE',
  })
  assessment: AssessmentEntity;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.formulas, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  question_category: QuestionCategoryEntity;
}
