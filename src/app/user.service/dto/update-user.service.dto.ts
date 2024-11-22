import { PartialType } from '@nestjs/mapped-types';
import { CreateUserServiceDto } from './create-user.service.dto';

export class UpdateUserServiceDto extends PartialType(CreateUserServiceDto) {}
