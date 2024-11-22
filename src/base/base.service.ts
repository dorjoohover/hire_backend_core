import { Injectable } from '@nestjs/common';
import { DEFAULT_LIMIT, SUPER_ADMIN } from './constants';
import { Meta } from './base.interface';
// import { TerminalUser } from 'src/common/extentions';

@Injectable()
export class BaseService {
  public mapListResult(count: number, items: any[], filter: any) {
    const result: any = {};
    const limit = filter.limit > 0 ? filter.limit : DEFAULT_LIMIT;

    const currentPage = filter.page > 0 ? filter.page : 1;
    const totalCount = count;
    const perPage = limit;
    const helper = Math.floor(count / limit);
    const pageCount = helper == 0 ? 1 : helper;
    const meta: Meta = {
      totalCount: totalCount,
      pageCount: pageCount,
      currentPage: currentPage,
      perPage: perPage,
    };

    result.meta = meta;
    result.items = items;
    return result;
  }

  public adjustFilterForPaging(filter: any) {
    filter.limit = Number(filter.size || '' + DEFAULT_LIMIT);
    filter.skip = Number(filter.page || '0') * filter.limit;
  }

  public applyFilter(filter: any, user: any): any {
    if (user) {
      if (user.app === 'merchant') {
        if (user.employee.role !== SUPER_ADMIN) {
          if (user.warehouse) {
            filter.warehouseId = user.warehouse.id;
          } else {
            throw new Error('warehouse required!');
          }
        }

        filter.merchantId = user.merchant.id;
      } else if (user.app === 'dash') {
        if (user.merchant) {
          filter.merchantId = user.merchant.id;
        }
      }
      // filter.warehouseId = user.warehouse.id;
      // filter.merchantId = user.merchant.id;
      else {
        if (user.merchant) {
          filter.merchantId = user.merchant.id;
        }
        if (user.warehouse) {
          filter.warehouseId = user.warehouse.id;
        }
      }
    }
    return filter;
  }
}
