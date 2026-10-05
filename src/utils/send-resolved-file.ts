import type { Response } from 'express';
import { NotFoundException } from '@nestjs/common';
import { FileService } from 'src/file.service';

/**
 * `GET /file/:id`, `GET pdf-template/image/:key` — FileService.resolveForResponse()-ийн
 * үр дүнг илгээнэ: R2/CDN (media_object) → 302, бусад → урсгал. @Res() route тул алдааг
 * энд өөрөө хариулна (404 / 500), урсгал дундуур тасарвал холболтыг таслана.
 */
export async function sendResolvedFile(files: FileService, id: string, res: Response) {
  let r: Awaited<ReturnType<FileService['resolveForResponse']>>;
  try {
    r = await files.resolveForResponse(id);
  } catch (e: any) {
    const notFound = e instanceof NotFoundException || e?.status === 404 || e?.code === 'ENOENT';
    if (!notFound) console.error('file resolve error:', id, e?.message);
    res.status(notFound ? 404 : 500).json({ statusCode: notFound ? 404 : 500, message: notFound ? 'File not found' : 'File error' });
    return;
  }
  if ('redirect' in r) {
    res.setHeader('Cache-Control', r.cache);
    res.redirect(302, r.redirect);
    return;
  }
  res.setHeader('Content-Type', r.type || 'application/octet-stream');
  if (r.length) res.setHeader('Content-Length', String(r.length));
  if (r.disposition) res.setHeader('Content-Disposition', r.disposition);
  if (r.cache) res.setHeader('Cache-Control', r.cache);
  r.stream.on('error', (err: any) => {
    console.error('file stream error:', id, err?.code, err?.message);
    if (!res.headersSent) {
      res.removeHeader('Content-Length');
      res.status(err?.code === 'NoSuchKey' ? 404 : 500).end();
    } else res.destroy(err);
  });
  r.stream.pipe(res);
}
