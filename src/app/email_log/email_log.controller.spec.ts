import { Test, TestingModule } from '@nestjs/testing';
import { EmailLogController } from './email_log.controller';
import { EmailLogService } from './email_log.service';

describe('EmailLogController', () => {
  let controller: EmailLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailLogController],
      providers: [EmailLogService],
    }).compile();

    controller = module.get<EmailLogController>(EmailLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
