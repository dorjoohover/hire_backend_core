import { UserServiceEntity } from 'src/app/user.service/entities/user.service.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExamEntity } from './exam.entity';
import { QuestionEntity } from 'src/app/question/entities/question.entity';
import { QuestionCategoryEntity } from 'src/app/question/entities/question.category.entity';
import { ResultEntity } from './result.entity';

@Entity('resultDetail')
export class ResultDetailEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;
  @ManyToOne(() => ResultEntity, (exam) => exam.details, {
    onDelete: 'CASCADE',
  })
  result: ResultEntity;

  //   in disc (Хувиа хичээгч, шулуухан)
  @Column({ nullable: true })
  value: string;

  // like key => in disc intensity(27.5)
  @Column({ nullable: true })
  cause: string;

  //   in disc d, c , i, s
  @Column({ nullable: true })
  category: string;
}
