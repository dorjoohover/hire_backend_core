import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentCategoryService } from './assessment.category.service';

describe('AssessmentCategoryService', () => {
  let service: AssessmentCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssessmentCategoryService],
    }).compile();

    service = module.get<AssessmentCategoryService>(AssessmentCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
