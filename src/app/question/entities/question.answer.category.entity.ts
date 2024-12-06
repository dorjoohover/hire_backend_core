import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { QuestionAnswerEntity } from './question.answer.entity';
import { UserAnswerEntity } from 'src/app/user.answer/entities/user.answer.entity';

@Entity('questionAnswerCategory')
export class QuestionAnswerCategoryEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  @Column({ unique: true })
  name: string;
  @Column({ nullable: true })
  description: string;

  @ManyToOne(
    () => QuestionAnswerCategoryEntity,
    (category) => category.subcategories,
    {
      nullable: true,
    },
  )
  parent?: QuestionAnswerCategoryEntity;

  @OneToMany(() => QuestionAnswerCategoryEntity, (category) => category.parent)
  subcategories: QuestionAnswerCategoryEntity[];

  @OneToMany(() => QuestionAnswerEntity, (category) => category.category)
  questionAnswers: QuestionAnswerEntity[];
  @OneToMany(() => UserAnswerEntity, (user) => user.answerCategory)
  userAnswers: UserAnswerEntity[];
}
