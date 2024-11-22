import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentCategoryController } from './assessment.category.controller';
import { AssessmentCategoryService } from './assessment.category.service';

describe('AssessmentCategoryController', () => {
  let controller: AssessmentCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentCategoryController],
      providers: [AssessmentCategoryService],
    }).compile();

    controller = module.get<AssessmentCategoryController>(AssessmentCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
