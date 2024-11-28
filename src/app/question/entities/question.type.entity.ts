import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionEntity } from './question.entity';

@Entity('questionType')
export class QuestionTypeEntity {
  @PrimaryGeneratedColumn('increment', {})
  id?: number;

  @Column()
  name: string;
  @Column()
  description: string;
  @Column()
  createdUser: number;
  @Column({ nullable: true })
  updatedUser: number;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @OneToMany(() => QuestionEntity, (matrix) => matrix.type)
  questions: QuestionEntity[];
}
