import { Test, TestingModule } from '@nestjs/testing';
import { UserAnswerController } from './user.answer.controller';
import { UserAnswerService } from './user.answer.service';

describe('UserAnswerController', () => {
  let controller: UserAnswerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAnswerController],
      providers: [UserAnswerService],
    }).compile();

    controller = module.get<UserAnswerController>(UserAnswerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
