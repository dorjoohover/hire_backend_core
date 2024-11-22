export class BaseController {
  public mapResult(result: any = {}) {
    if (result.meta) {
      return {
        meta: result.meta,
        items: result.data,
      };
    } else {
      return result;
    }
  }
}
