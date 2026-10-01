import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Studio-ийн "Icon" сан — хэрэглэгчийн upload хийсэн icon-ууд (бүх тестэд дахин ашиглана).
// Файл нь FileService-д (pdf-template/image/:key-ээр уншигдана), энд зөвхөн жагсаалт.
// Хүснэгт: perf-bootstrap.ts `studio_icon`.
export interface StudioIconRow {
  id: number;
  key: string;
  name: string | null;
  createdAt: Date;
}

@Injectable()
export class StudioIconDao {
  constructor(private dataSource: DataSource) {}

  list = async (): Promise<StudioIconRow[]> =>
    this.dataSource.query(
      `SELECT id, key, name, "createdAt" FROM studio_icon ORDER BY "createdAt" DESC, id DESC LIMIT 1000`,
    );

  create = async (key: string, name: string | null): Promise<StudioIconRow> => {
    const rows = await this.dataSource.query(
      `INSERT INTO studio_icon (key, name) VALUES ($1, $2) RETURNING id, key, name, "createdAt"`,
      [key, name],
    );
    return rows[0];
  };

  rename = async (id: number, name: string): Promise<StudioIconRow | null> => {
    const rows = await this.dataSource.query(
      `UPDATE studio_icon SET name = $2 WHERE id = $1 RETURNING id, key, name, "createdAt"`,
      [id, name],
    );
    return rows[0]?.[0] ?? rows[0] ?? null;
  };

  remove = async (id: number): Promise<{ deleted: boolean }> => {
    await this.dataSource.query(`DELETE FROM studio_icon WHERE id = $1`, [id]);
    return { deleted: true };
  };
}
