import { ViewEntity, ViewColumn } from 'typeorm';

// Maps to mv_question_answer_full, created/maintained by
// src/database/sql/perf-bootstrap.sql. synchronize:false so TypeORM's
// global `synchronize: true` never tries to create/drop/alter this view.
// One row per (answer, matrix) combination - matrix fields are null for
// non-matrix answers.
@ViewEntity({
  name: 'mv_question_answer_full',
  materialized: true,
  synchronize: false,
})
export class QuestionAnswerFullView {
  @ViewColumn()
  id: number;

  @ViewColumn()
  value: string;

  @ViewColumn()
  point: number;

  @ViewColumn()
  orderNumber: number;

  @ViewColumn()
  file: string;

  @ViewColumn()
  correct: boolean;

  @ViewColumn()
  negative: boolean;

  @ViewColumn()
  reverse: boolean;

  @ViewColumn()
  questionId: number;

  @ViewColumn()
  categoryId: number;

  @ViewColumn()
  categoryName: string;

  @ViewColumn()
  categoryDescription: string;

  @ViewColumn()
  categoryParentId: number;

  @ViewColumn()
  categoryAssessmentId: number;

  @ViewColumn()
  matrixId: number;

  @ViewColumn()
  matrixValue: string;

  @ViewColumn()
  matrixPoint: number;

  @ViewColumn()
  matrixOrderNumber: number;

  @ViewColumn()
  matrixCategoryId: number;

  @ViewColumn()
  matrixCategoryName: string;
}
