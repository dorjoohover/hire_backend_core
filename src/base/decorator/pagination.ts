import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/base/constants';

export class PaginationDto {
  page: number = DEFAULT_PAGE;
  limit: number = DEFAULT_LIMIT;
  [filter: string]: any;
  constructor(query: any) {
    this.page = parseInt(query.page) || DEFAULT_PAGE;
    this.limit = parseInt(query.limit) || DEFAULT_LIMIT;
    for (const key in query) {
      if (!['page', 'limit'].includes(key)) {
        this[key] = query[key];
      }
    }
  }
}

export class SearchDto {
  id: string;
}
