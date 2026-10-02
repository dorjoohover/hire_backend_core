import { PartialType } from '@nestjs/mapped-types';
import { CreatePdfTemplateDto } from './create-pdf-template.dto';

export class UpdatePdfTemplateDto extends PartialType(CreatePdfTemplateDto) {}
