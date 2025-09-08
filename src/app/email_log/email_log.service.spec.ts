import { Test, TestingModule } from '@nestjs/testing';
import { EmailLogService } from './email_log.service';

describe('EmailLogService', () => {
  let service: EmailLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailLogService],
    }).compile();

    service = module.get<EmailLogService>(EmailLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
