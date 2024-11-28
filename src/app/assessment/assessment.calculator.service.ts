import { Injectable } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentDao } from './dao/assessment.dao';
import { UserAnswerDao } from '../user.answer/user.answer.dao';

@Injectable()
export class AssessmentCalculatorService {
  constructor(
    private service: AssessmentService,
    private dao: AssessmentDao,
    private answerDao: UserAnswerDao,
  ) {}
}
