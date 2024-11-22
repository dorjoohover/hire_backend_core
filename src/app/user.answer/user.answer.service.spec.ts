import { Test, TestingModule } from '@nestjs/testing';
import { UserAnswerService } from './user.answer.service';

describe('UserAnswerService', () => {
  let service: UserAnswerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserAnswerService],
    }).compile();

    service = module.get<UserAnswerService>(UserAnswerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
