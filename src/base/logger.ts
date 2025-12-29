import {
  Logger,
  createLogger,
  format,
  transports,
  LoggerOptions,
} from 'winston';
import { Client } from 'src/common/extentions';
const { printf } = format;
const { Console } = transports;
const path = require('path');
const PROJECT_ROOT = path.join(__dirname, '..');

export interface LogOptions {
  message: string;
  event?: string;
  client?: Client;
  // terminalUser?: TerminalUser;
  payload?: any;
  stack?: any;
  url?: string;
}

export class AppLogger {
  winstonLogger: Logger;

  constructor() {
    const transports: any[] = [];
    transports.push(new Console());

    const myFormat = printf(
      ({
        timestamp,
        level,
        message,
        payload,
        stack,
        event,
        username,
        merchant,
        udid,
        tid,
        line,
        url,
      }) => {
        return JSON.stringify({
          level,
          timestamp,
          username,
          merchant,
          udid,
          tid,
          event,
          message,
          payload,
          stack,
          line,
          url,
        });
      },
    );

    const loggerOptions: LoggerOptions = {
      transports: transports,
      format: myFormat,
      level: process.env.CORE_LOG_LEVEL || 'info',
    };
    this.winstonLogger = createLogger(loggerOptions);
  }

  /**
   * Attempts to add file and line number info to the given log arguments.
   * @param {*} args
   */

  formatLogArguments(options: LogOptions) {
    const stackInfo = this.getStackInfo(1);

    if (stackInfo) {
      // get file path relative to project root
      // const calleeStr = '(' + stackInfo.relativePath + ':' + stackInfo.line + ')';
      const calleeStr = `${stackInfo.relativePath}:${stackInfo.method}:${stackInfo.line}:${stackInfo.pos}`;
      // console.log(calleeStr);
      // const calleeStrHl = highlight(calleeStr);
      // console.log(calleeStrHl);
      return {
        timestamp: new Date(),
        line: calleeStr,
        email: options.client?.email,
        // merchant: options.terminalUser?.client?.name,
        // udid: options.terminalUser?.terminal?.udid,
        ...options,
      };
    } else {
      return options;
    }
  }

  /**
   * Parses and returns info about the call stack at the given index.
   */

  getStackInfo(stackIndex) {
    // get call stack, and analyze it
    // get all file, method, and line numbers
    const stacklist = new Error().stack.split('\n').slice(3);

    // stack trace format:
    // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
    // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
    const stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
    const stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

    const s = stacklist[stackIndex] || stacklist[0];
    const sp = stackReg.exec(s) || stackReg2.exec(s);

    if (sp && sp.length === 5) {
      return {
        method: sp[1],
        relativePath: path.relative(PROJECT_ROOT, sp[2]),
        line: sp[3],
        pos: sp[4],
        file: path.basename(sp[2]),
        stack: stacklist.join('\n'),
      };
    }
  }

  error(options: LogOptions) {
    this.winstonLogger.error(this.formatLogArguments(options));
  }
  warn(options: LogOptions) {
    this.winstonLogger.warn(this.formatLogArguments(options));
  }
  info(options: LogOptions) {
    this.winstonLogger.info(this.formatLogArguments(options));
  }
  verbose(options: LogOptions) {
    this.winstonLogger.verbose(this.formatLogArguments(options));
  }
  debug(options: LogOptions) {
    this.winstonLogger.debug(this.formatLogArguments(options));
  }
}
