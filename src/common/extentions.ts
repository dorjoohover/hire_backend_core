import { Request } from 'express';

export class Client {
  id: number;
  role: number;
  firstname: string;
  lastname?: string;
  phone?: string;
  email: string;
  organizationRegisterNumber?: string;
  organizationName?: string;
  organizationPhone?: string;
  app: string;
}

// export class MainUser {
//   // Merchant user
//   app: 'merchant' | 'dash';
//   client: Client;
// }

// export class TerminalUser {
//   client?: Client;
//   terminal: Terminal;
// }

export interface MainRequest extends Request {
  user: Client;
}

// export interface TerminalRequest extends Request {
//   user: TerminalUser;
// }
