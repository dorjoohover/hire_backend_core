import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionAnswerMatrixEntity } from './question.answer.matrix.entity';
import { QuestionEntity } from './question.entity';

@Entity('questionType')
export class QuestionTypeEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  name: string;
  @Column()
  description: number;
  @Column()
  createdUser: number;
  @Column()
  updatedUser: number;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @ManyToOne(() => QuestionTypeEntity, (category) => category.subCategories, {
    nullable: true,
  })
  parent: QuestionTypeEntity;
  @OneToMany(() => QuestionTypeEntity, (matrix) => matrix.parent)
  subCategories: QuestionTypeEntity[];
  @OneToMany(() => QuestionEntity, (matrix) => matrix.type)
  questions: QuestionEntity[];
}
