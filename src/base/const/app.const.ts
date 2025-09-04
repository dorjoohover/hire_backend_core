// pagination

import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/base/constants';

export class Q {
  static PAGE = {
    name: 'page',
    default: DEFAULT_PAGE,
  };
  static SKIP = {
    name: 'limit',
    default: DEFAULT_LIMIT,
  };
}

export class P {
  static ID = {
    name: 'id',
  };
}
