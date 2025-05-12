import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto, PaymentUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BaseService } from 'src/base/base.service';
import { UserDao } from './user.dao';
import * as bcrypt from 'bcrypt';
import { CLIENT, ORGANIZATION } from 'src/base/constants';
import { MailerService } from '@nestjs-modules/mailer';
import { SendLinkToEmail } from '../user.service/dto/create-user.service.dto';
import { Role } from 'src/auth/guards/role/role.enum';
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
          subject: 'И-мейл хаяг баталгаажуулах тухай',
          html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>И-мейл хаяг баталгаажуулах тухай</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
            body, h1, h2, h3, p, a, div {
              font-family: 'Montserrat', sans-serif;
            }
          </style>
          </head>
              <div style="display:none; max-height:0px; overflow:hidden; mso-hide:all; font-size:1px; color:#ffffff; line-height:1px;">
Таны Hire.mn платформын бүртгэл хийгдэж байна. Линк дээр дарж и-мейл хаягаа баталгаажуулна уу.    ​
</div>
          <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
            <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                <td>
                
                <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 80%; text-align: left; vertical-align: middle;">
                      <img src="https://hire.mn/hire-all-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
            </td>
      <td style="width: 20%; text-align: right; vertical-align: middle;">
              <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
                <tr>
                  <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
                    <a href="https://hire.mn" 
                      style="padding: 10px 16px; border-radius: 4px; 
                              color: #ff5000 !important; 
                              font-family: 'Montserrat', Arial, sans-serif; 
                              font-size: 14px; font-weight: 600; 
                              text-decoration: none; 
                              display: inline-block;
                              mso-line-height-rule: exactly;
                              line-height: 1.2;
                              text-align: center;">
                      Зочлох
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                      </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                            Өдрийн мэнд,
                          </td>
                           <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
Таны онлайн тест, үнэлгээний Hire.mn платформын бүртгэл хийгдэж байна. Та <a style="color: #ff5000; text-decoration: none;" href=https://srv666826.hstgr.cloud/api/v1/user/email/confirm/${email}>энд дарж</a> өөрийн и-мейл хаягаа баталгаажуулна уу.                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Хэрвээ танд бүртгэлтэй холбоотой асууж тодруулах зүйл байвал ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Хүндэтгэсэн,<br/>Hire.mn
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                      <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
                    </td>
                  </tr>
                </table>
                
                </td>
                </tr>
                </table>
              </div>
            </center>
          </body>
          </html>
          `,
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
    let user = await this.dao.getByEmail(
      dto.organizationRegisterNumber
        ? dto.organizationRegisterNumber
        : dto.email,
    );
    let password = null;

    if (dto.password) {
      password = await bcrypt.hash(dto.password, saltOrRounds);
    }
    if (dto.organizationRegisterNumber) {
      if (user) {
        throw new HttpException('Бүртгэлтэй байна.', HttpStatus.BAD_REQUEST);
      }
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
        subject: 'Нууц үг сэргээх тухай',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Нууц үг сэргээх тухай</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
      body, h1, h2, h3, p, a, div {
        font-family: 'Montserrat', sans-serif;
      }
    </style>
    </head>
    <div style="display:none; max-height:0px; overflow:hidden; mso-hide:all; font-size:1px; color:#ffffff; line-height:1px;">
${code} / Таны Hire.mn дээрх бүртгэлтэй хаягийн нууц үг сэргээх баталгаажуулах кодыг илгээлээ.    ​
</div>
    <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
      <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
          <td>
          
          <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
            <tr>
              <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width: 80%; text-align: left; vertical-align: middle;">
                <img src="https://hire.mn/hire-all-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
      </td>
<td style="width: 20%; text-align: right; vertical-align: middle;">
        <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
          <tr>
            <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
              <a href="https://hire.mn" 
                style="padding: 10px 16px; border-radius: 4px; 
                        color: #ff5000 !important; 
                        font-family: 'Montserrat', Arial, sans-serif; 
                        font-size: 14px; font-weight: 600; 
                        text-decoration: none; 
                        display: inline-block;
                        mso-line-height-rule: exactly;
                        line-height: 1.2;
                        text-align: center;">
                Зочлох
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
                </td>
            </tr>
            
            <tr>
              <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                      Өдрийн мэнд,
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <div style="font-family: 'Montserrat', sans-serif; font-size: 36px; font-weight: bold; color: #ff5000; padding: 15px 25px; background-color: #fff9e6; display: inline-block; letter-spacing: 5px; border-radius: 99px">
                        ${code}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                      <p style="margin: 0 0 15px 0;">
                        Таны Hire.mn дээрх бүртгэлтэй хаягийн нууц үг сэргээх кодыг илгээлээ. Хэрвээ та нууц үг сэргээх хүсэлт илгээгүй бол ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                      <p style="margin: 0 0 15px 0;">
                        Хүндэтгэсэн,<br/>Hire.mn
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
              </td>
            </tr>
          </table>
          
          </td>
          </tr>
          </table>
        </div>
      </center>
    </body>
    </html>
    `,
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
    const { email, ...body } = dto;

    return email == null
      ? await this.dao.update({ ...body, id: id })
      : await this.dao.update({ ...body, email, id: id });
  }

  public async remove(id: number) {
    return await this.dao.delete(id);
  }
}
