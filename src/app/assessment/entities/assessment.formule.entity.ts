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
  })
  parent: AssessmentFormulaEntity;
  @Column({ nullable: true })
  type: number;
  @ManyToOne(() => FormulaEntity, (user) => user.assessment)
  formule: FormulaEntity;
  @ManyToOne(() => AssessmentEntity, (user) => user.formules)
  assessment: AssessmentEntity;
  @ManyToOne(() => QuestionCategoryEntity, (category) => category.formulas)
  question_category: QuestionCategoryEntity;
}
