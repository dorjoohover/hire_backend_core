import { PartialType } from '@nestjs/mapped-types';
import { CreateEmailLogDto } from './create-email_log.dto';

export class UpdateEmailLogDto extends PartialType(CreateEmailLogDto) {}
