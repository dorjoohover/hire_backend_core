import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto, PaymentUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseService } from 'src/base/base.service';
import { UserDao } from './user.dao';
import * as bcrypt from 'bcrypt';
import { CLIENT, ORGANIZATION } from 'src/base/constants';
import { MailerService } from '@nestjs-modules/mailer';
import { SendLinkToEmail } from '../user.service/dto/create-user.service.dto';
const saltOrRounds = 1;

@Injectable()
export class UserService {
  constructor(
    private dao: UserDao,
    private mailService: MailerService,
  ) {}
  async sendConfirmMail(email: string) {
    try {
      await this.mailService
        .sendMail({
          to: email,
          subject: 'Мэйл хаяг баталгаажуулах',
          html: `<div>
         <p> Та <a href=>линк</a> дээр дарж тестээ бөглөнө үү.</p>
<p>Таны анхааралд:</p>
<ul>
        <li>Танд hire.mn цахим хуудас дээрх ... тест өгөх эрх үүссэн байна.</li>
<li>Тест эхлэхийн өмнө дэлгэцэд гарах зааврыг хянамгай уншихыг хүсье.</li>
</ul>
          // <p>Асууж, тодруулах зүйл байвал <a href=mailto:info@hire.mn>info@hire.mn</a> хаягаар, <a href=tel:976-9909 9371>976-9909 9371</a> дугаараар холбогдоорой. </p>
          // <p>Манайхаар үйлчлүүлж байгаад тань баярлалаа.</p>
          // <p>Шуудангийн хаяг: Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p>

          </div>`,
          // html: `<div>
          // <p>Та <a href=https://srv666826.hstgr.cloud/api/v1/user/email/confirm/${email}>энд дарж</a> мэйл хаягаа баталгаажуулна уу!</p>
          // <p>Асууж, тодруулах зүйл байвал <a href=mailto:info@hire.mn>info@hire.mn</a> хаягаар, <a href=tel:976-9909 9371>976-9909 9371</a> дугаараар холбогдоорой. </p>
          // <p>Манайхаар үйлчлүүлж байгаад тань баярлалаа.</p>
          // <p>Шуудангийн хаяг: Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p>

          //     </div>`,
        })
        .catch((err) => console.log(err));
    } catch (error) {
      console.log(error);
    }
  }

  public async verifyMail(email: string) {
    const res = await this.dao.verify(email, true, email);
    return res;
  }
  public async addUser(dto: CreateUserDto) {
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
      emailVerified: dto.emailVerified ?? dto.role != null,
    });
    if (!dto.emailVerified) {
      await this.sendConfirmMail(dto.email);
    }
    return res;
    // throw new HttpException('И-майл хаягаа баталгаажуулна уу', HttpStatus.FORBIDDEN);
    // return res;
  }
  public async getAll() {
    return await this.dao.getAll();
  }

  public async sendOtp(email: string) {
    let generated = Math.floor(Math.random() * 1000000);
    const code = generated.toString().padStart(6, '0');

    await this.dao.updateByEmail({
      email,
      code,
    });
    await this.mailService
      .sendMail({
        to: email,
        subject: 'Forget password',
        html: `<h1>Click the link</h1>
             <h3>${code}</h3>
              </div>`,
      })
      .catch((err) => console.log(err));
  }

  public async updatePassword(email: string, password: string) {
    const hashed = await bcrypt.hash(password, saltOrRounds);
    await this.dao.updateByEmail({ email, password: hashed });
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

  public async remove(id: number) {
    return await this.dao.delete(id);
  }
}
