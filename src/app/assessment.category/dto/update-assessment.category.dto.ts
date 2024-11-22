import { PartialType } from '@nestjs/mapped-types';
import { CreateAssessmentCategoryDto } from './create-assessment.category.dto';

export class UpdateAssessmentCategoryDto extends PartialType(CreateAssessmentCategoryDto) {}
