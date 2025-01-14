import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto, PaymentUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseService } from 'src/base/base.service';
import { UserDao } from './user.dao';
import * as bcrypt from 'bcrypt';
import { CLIENT, ORGANIZATION } from 'src/base/constants';
import { MailerService } from '@nestjs-modules/mailer';
import { SendLinkToEmail } from '../user.service/dto/create-user.service.dto';
@Injectable()
export class UserService {
  constructor(
    private dao: UserDao,
    private mailService: MailerService,
  ) {}
  async sendConfirmMail(email: string) {
    await this.mailService
      .sendMail({
        to: email,
        subject: 'Please confirm your account',
        html: `<h1>Email Confirmation</h1>

                <p>Thank you for subscribing. Please confirm your email by clicking on the following link</p>
                <a href=https://srv666826.hstgr.cloud/api/v1/user/email/confirm/${email}> Click here</a>
                </div>`,
      })
      .catch((err) => console.log(err));
  }

  public async verifyMail(email: string) {
    const res = await this.dao.verify(email, true, email);
    return res;
  }
  public async addUser(dto: CreateUserDto) {
    const saltOrRounds = 1;
    let password = null;
    if (dto.password) {
      password = await bcrypt.hash(dto.password, saltOrRounds);
    }
    if (dto.organizationRegisterNumber) {
      if (
        !dto.organizationPhone ||
        !dto.organizationName ||
        !dto.lastname ||
        !dto.position ||
        !dto.password ||
        !dto.phone ||
        !dto.firstname
      ) {
        throw new HttpException(
          'Дутуу мэдээлэл оруулсан',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const res = await this.dao.add({
      ...dto,
      password: password,
      role:
        dto.role ?? (dto.organizationRegisterNumber ? ORGANIZATION : CLIENT),
      wallet: 0,
      lastname: dto.lastname ?? '',
      firstname: dto.firstname ?? '',
    });
    return res;
  }
  public async getAll() {
    return await this.dao.getAll();
  }

  public async payment(dto: PaymentUserDto) {
    const user = await this.dao.get(dto.id);
    const pay = user.wallet + dto.price;
    if (pay >= 0) {
      await this.dao.update({
        id: dto.id,
        ...user,
        wallet: pay,
      });
      return false;
    } else {
      return false;
    }
  }
  findAll() {
    return `This action returns all user`;
  }

  async getUser(dto: string) {
    return await this.dao.getByEmail(dto);
  }
  public async update(id: number, dto: CreateUserDto) {
    return await this.dao.update({ ...dto, id: id });
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
