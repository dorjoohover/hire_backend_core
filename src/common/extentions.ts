import { Request } from 'express';

export class Client {
  id: number;
  role: number;
  name: string;
  email: string;
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
