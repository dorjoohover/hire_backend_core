export class Formatter {
    static money(value: string, currency = ''): string {
      return `${currency}${value
        .replaceAll(',', '')
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
    static location(
      city: string,
      district: string,
      town: string,
      khoroo: number,
    ): string {
      const include = town.toLowerCase().includes('хотхон');
      return `${city} хот, ${district} дүүрэг, ${khoroo}-р хороо, ${town} ${include ? '' : 'хотхон'}`;
    }
  
    static userName(name: string, lastname?: string, firstname?: string): string {
      return `${lastname ?? ''} ${firstname ?? ''} ${!lastname && !firstname && name}`;
    }
    //   'Таны Улаанбаатар хот, Хан уул дүүрэг, 11-р хороо, 17020, Жардин хотхон, 120-р байр, 6 дугаар давхарын 3 өрөө 80м.кв орон сууцны өнөөгийн зах зээлийн үнэ 160,950,000.00 төгрөг орчмын үнэтэй байна.';
    static text(
      city: string,
      district: string,
      khoroo: number,
      zipcode: number,
      town: string,
      price: number,
      area: number,
      room?: number,
      floor?: number,
      no?: string,
    ): string {
      const include = town.toLowerCase().includes('хотхон');
      return `Таны ${city} хот, ${district} дүүрэг, ${khoroo}-р хороо, ${zipcode}, ${town} ${include ? '' : 'хотхон'}, ${no ?? ''}${no && '-р байр,'} ${floor} ${floor && ' дугаар давхарын'} ${room}${room && ' өрөө'} ${area}м.кв орон сууцны өнөөгийн зах зээлийн үнэ ${this.money(`${price}`, '')} төгрөг орчим үнэтэй байна. Энэхүү тооцоолол нь өгөгдөлд суурилж тооцоолсон бөгөөд ±5%-ийн хооронд хэлбэлзэх боломжтой.`;
    }
  }
  