import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Refreshes mv_question_answer_full after questionAnswer /
// questionAnswerMatrix / questionAnswerCategory are edited (admin side,
// low frequency). REFRESH ... CONCURRENTLY needs the unique index created
// in perf-bootstrap.sql and does not block reads from the view while it runs.
//
// Refreshes are debounced/coalesced so a burst of edits (e.g. saving a
// whole question with many answers) only triggers one refresh.
@Injectable()
export class QuestionAnswerViewService {
  private readonly logger = new Logger(QuestionAnswerViewService.name);
  private pending = false;
  private scheduled: NodeJS.Timeout | null = null;

  constructor(private dataSource: DataSource) {}

  // Fire-and-forget, debounced refresh. Safe to call after every
  // create/update/delete in the question-answer DAOs.
  refresh(): void {
    if (this.scheduled) return;
    this.scheduled = setTimeout(() => {
      this.scheduled = null;
      this.doRefresh();
    }, 2000);
  }

  private async doRefresh(): Promise<void> {
    if (this.pending) {
      // another refresh is running; schedule one more pass after it
      this.refresh();
      return;
    }
    this.pending = true;
    try {
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_question_answer_full',
      );
    } catch (err) {
      // CONCURRENTLY can fail if the view was never populated yet
      // (e.g. brand new empty table) - fall back to a normal refresh.
      try {
        await this.dataSource.query(
          'REFRESH MATERIALIZED VIEW mv_question_answer_full',
        );
      } catch (err2) {
        this.logger.error('mv_question_answer_full refresh failed', err2);
      }
    } finally {
      this.pending = false;
    }
  }
}
