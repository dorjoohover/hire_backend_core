import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Нөхцөлт алгасах (branching) дүрэм.
// Жишээ: "Тамхи татдаггүй" (dependsOnAnswerId) гэж нэг асуултад (dependsOnQuestionId)
// хариулсан бол тамхитай холбоотой асуултуудыг (targetQuestionId) алгасна.
// ⚠️ Өмнө нь 'show' үйлдэл enum-д байсан ч client / server хоёул үл тоомсорлодог
// (зөвхөн 'skip' хэрэгждэг) байсан тул хассан. DB-д үлдсэн 'show' мөрүүд нөлөөгүй.
export const QuestionRuleAction = {
  SKIP: 'skip',
};

@Entity('questionRule')
export class QuestionRuleEntity {
  @PrimaryGeneratedColumn('increment')
  id?: number;

  // Энэ дүрэм нөлөөлөх (алгасах/харуулах) асуулт.
  @Index()
  @Column()
  targetQuestionId: number;

  // Нөхцөл шалгах асуулт (өмнө хариулсан байх ёстой).
  @Column()
  dependsOnQuestionId: number;

  // Нөхцөл биелэх хариултын id. null бол: dependsOnQuestion-д ямар ч хариулт
  // өгсөн л бол нөхцөл биеллээ гэж үзнэ.
  @Column({ nullable: true })
  dependsOnAnswerId: number;

  // 'skip' (default): нөхцөл биелвэл targetQuestion-г харуулахгүй алгасна.
  @Column({ default: QuestionRuleAction.SKIP })
  action: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
