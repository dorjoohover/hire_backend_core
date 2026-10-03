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

  // MATRIX нөхцөл асуултад: сонгосон НҮД (questionAnswerMatrix.id) — dependsOnAnswerId
  // нь мөр (жиш: "Тамхи"), энэ нь тэр мөрийн багана ("Үгүй"). Хоёулаа таарвал нөхцөл биелнэ.
  // null бол (MATRIX биш, эсвэл мөрөнд ямар ч хариулт өгсөн л бол).
  @Column({ nullable: true })
  dependsOnMatrixId: number;

  // MATRIX алгасах асуултад: бүтэн асуултыг биш, зөвхөн энэ МӨРИЙГ (questionAnswer.id,
  // жиш: "Тамхи") хасна. null бол асуултыг бүхэлд нь алгасна. Бүх мөр нь хасагдвал
  // асуулт өөрөө харагдахгүй.
  @Column({ nullable: true })
  targetAnswerId: number;

  // 'skip' (default): нөхцөл биелвэл targetQuestion-г харуулахгүй алгасна.
  @Column({ default: QuestionRuleAction.SKIP })
  action: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
