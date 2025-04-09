import * as _ from 'lodash';
import * as numeral from 'numeral';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import moment from 'moment-timezone';

export class TokenInfo {
  token: string;
  key: string;

  constructor(token: string, key: string) {
    this.token = token;
    this.key = key;
  }
}

export const LOCAL = 'http://localhost:7080/';


export class Utils {
  static generateId(): string {
    return uuidv4().replace(/-/g, '');
  }

  static hash(plain: string): string {
    const generator = crypto.createHash('sha1');
    generator.update(plain);
    return generator.digest('hex');
  }

  static generateRandomString(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) {
          reject(err);
        } else {
          resolve(buf.toString('hex'));
        }
      });
    });
  }
  // 2x 1x 4x
  // 24 130

  static generateDigits(size: number): string {
    return _.join(
      _.times(size, (a) => _.random(0, 9)),
      '',
    );
  }

  static generateRandomAmount(size: number): number {
    return Number(
      _.join(
        _.times(size, (a) => _.random(1, 9)),
        '',
      ),
    );
  }

  static generateJwt(key: string, payload: any, ttl = 0): Promise<TokenInfo> {
    let plainPayload = payload;

    if (typeof payload === 'object') {
      plainPayload = Object.assign({}, payload);
    }

    return new Promise(function (resolve, reject) {
      if (ttl > 0) {
        resolve(
          new TokenInfo(
            jwt.sign(plainPayload, key, { expiresIn: 60 * ttl }),
            key,
          ),
        );
      } else {
        resolve(new TokenInfo(jwt.sign(plainPayload, key), key));
      }
    });
  }

  static extractJwt(token: string, key: string): Promise<any> {
    return new Promise(function (resolve, reject) {
      jwt.verify(token, key, function (err, decoded) {
        if (err) {
          reject(new Error('invalid token'));
        } else {
          resolve(decoded);
        }
      });
    });
  }

  static zeroPadding(value: number | string, length: number): string {
    const pad = _.join(_.times(length, _.constant('0')), '');
    return (pad + value).slice(-pad.length);
  }

  static rightPadding(
    value: number | string,
    length: number,
    character: string,
  ): string {
    const pad = _.join(_.times(length, _.constant(character)), '');
    return (value + pad).slice(0, pad.length);
  }

  static normalizeAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  static money(value: number, currency = '₮'): string {
    if (value && currency) {
      numeral.defaultFormat(`0,0.00`);
      return `${currency} ${numeral(value).format()}`;
    } else {
      return '';
    }
  }

  static parseDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar');
  }

  static parseStartDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar').startOf('day').toISOString(true);
  }

  static parseEndDate(date: any) {
    return moment(date).tz('Asia/Ulaanbaatar').endOf('day').toISOString(true);
  }

  static now() {
    return moment().tz('Asia/Ulaanbaatar');
  }
}
