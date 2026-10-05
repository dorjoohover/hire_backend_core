import { randomBytes } from 'crypto';

/*
 * Медиа (зураг, бичлэг) — Cloudflare R2 дээр ЗОРИУЛАЛТ + ТӨРЛӨӨР ангилж хадгална (2026-10-06).
 *
 *   нийтийн : <MEDIA_KEY_PREFIX>media/<purpose>/<kind>/<YYYY>/<MM>/<id>     → MEDIA_PUBLIC_BUCKET → CDN (MEDIA_PUBLIC_URL)
 *   хувийн  : <MEDIA_KEY_PREFIX>private/<purpose>/<kind>/<YYYY>/<MM>/<id>   → хувийн bucket (тайлантай ижил), хугацаатай холбоос
 *
 * `id` нь DB-д хадгалагддаг утга (хуучин `${Date.now()}_<нэр>` хэвээр) — client-ууд `/api/file/<id>`-г
 * өөрчлөлтгүй ашиглана; core `GET /file/<id>` нь `media_object`-оос түлхүүрийг олж CDN руу 302.
 * Шалгуулагчийн бичлэг, хариултын бичлэг нь хувийн мэдээлэл тул ХЭЗЭЭ Ч нийтийн CDN-д тавихгүй.
 */
export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'other';
export type MediaVisibility = 'public' | 'private';

export type MediaPurposeDef = {
  visibility: MediaVisibility;
  kinds: MediaKind[];
  /** Хэлбэр тус бүрийн дээд хэмжээ (байт). */
  max: Partial<Record<MediaKind, number>>;
  /** Шалгалттай холбоотой (examCode заавал, эзэмшигч шалгагдана, шалгалт устахад хамт устна). */
  examBound?: boolean;
  label: string;
};

const MB = 1024 * 1024;
export const MEDIA_PURPOSES: Record<string, MediaPurposeDef> = {
  question: {
    visibility: 'public', kinds: ['image', 'audio', 'video'],
    max: { image: 10 * MB, audio: 100 * MB, video: 1024 * MB }, label: 'Асуулт',
  },
  'answer-option': {
    visibility: 'public', kinds: ['image', 'audio', 'video'],
    max: { image: 10 * MB, audio: 100 * MB, video: 1024 * MB }, label: 'Хариултын сонголт',
  },
  assessment: {
    visibility: 'public', kinds: ['image', 'document'],
    max: { image: 10 * MB, document: 25 * MB }, label: 'Тест (icon, жишээ тайлан)',
  },
  blog: {
    visibility: 'public', kinds: ['image', 'video'],
    max: { image: 10 * MB, video: 1024 * MB }, label: 'Блог',
  },
  avatar: { visibility: 'public', kinds: ['image'], max: { image: 5 * MB }, label: 'Профайл зураг' },
  'studio-icon': { visibility: 'public', kinds: ['image'], max: { image: 5 * MB }, label: 'Studio icon' },
  'studio-image': { visibility: 'public', kinds: ['image'], max: { image: 10 * MB }, label: 'Studio зураг' },
  'exam-recording': {
    visibility: 'private', kinds: ['video', 'audio', 'image'],
    max: { video: 2048 * MB, audio: 300 * MB, image: 10 * MB }, examBound: true, label: 'Шалгуулагчийн бичлэг',
  },
  'answer-recording': {
    visibility: 'private', kinds: ['audio', 'video'],
    max: { audio: 100 * MB, video: 1024 * MB }, examBound: true, label: 'Хариултын бичлэг',
  },
  // Зориулалт тодорхойгүй (хуучин /upload, ангилж чадаагүй хуучин файл).
  misc: {
    visibility: 'public', kinds: ['image', 'video', 'audio', 'document', 'other'],
    max: { image: 10 * MB, video: 1024 * MB, audio: 100 * MB, document: 25 * MB, other: 25 * MB }, label: 'Бусад',
  },
};
export type MediaPurpose = keyof typeof MEDIA_PURPOSES;

export const isMediaPurpose = (p: any): p is MediaPurpose =>
  typeof p === 'string' && Object.prototype.hasOwnProperty.call(MEDIA_PURPOSES, p);

/** Хуучин түлхүүрийн угтвараас зориулалт (studio). */
export function purposeFromLegacyKey(key: string): MediaPurpose | null {
  if (/^ic_/.test(key)) return 'studio-icon';
  if (/^pt_/.test(key)) return 'studio-image';
  return null;
}

const EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif',
  'image/heic': '.heic', 'image/svg+xml': '.svg', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
  'video/ogg': '.ogv', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a', 'audio/webm': '.weba', 'audio/ogg': '.ogg',
  'audio/wav': '.wav', 'audio/flac': '.flac', 'application/pdf': '.pdf',
};
export const extForMime = (mime: string) => EXT[mime] ?? '';

/** MIME → хэлбэр. */
export function kindOfMime(mime: string | undefined | null): MediaKind {
  const m = String(mime ?? '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf') return 'document';
  return 'other';
}

/**
 * Эхний байтуудаас бодит MIME-ийг таних (Content-Type-д итгэхгүй). Танихгүй бол null.
 * `declared` нь webm/ogg/mp4 зэрэг сав (container)-ыг аудио эсэхийг ялгахад л хэрэглэгдэнэ.
 */
export function sniffMime(head: Buffer, declared?: string): string | null {
  const b = head;
  const d = String(declared ?? '').toLowerCase();
  const at = (o: number, s: string) => b.length >= o + s.length && b.subarray(o, o + s.length).toString('latin1') === s;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (at(0, '\x89PNG')) return 'image/png';
  if (at(0, 'GIF8')) return 'image/gif';
  if (at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp';
  if (at(0, 'RIFF') && at(8, 'WAVE')) return 'audio/wav';
  if (at(0, '%PDF-')) return 'application/pdf';
  if (at(0, 'fLaC')) return 'audio/flac';
  if (at(0, 'OggS')) return d.startsWith('video/') ? 'video/ogg' : 'audio/ogg';
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    return d.startsWith('audio/') ? 'audio/webm' : 'video/webm';
  }
  if (at(4, 'ftyp')) {
    const brand = b.subarray(8, 12).toString('latin1');
    if (/^(avif|avis)$/.test(brand)) return 'image/avif';
    if (/^(heic|heix|hevc|mif1|msf1)$/.test(brand)) return 'image/heic';
    if (/^M4A |^M4B /.test(brand) || d.startsWith('audio/')) return 'audio/mp4';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  if (at(0, 'ID3') || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  const text = b.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if ((text.startsWith('<?xml') || text.startsWith('<svg')) && text.includes('<svg')) return 'image/svg+xml';
  return null;
}

/** Файлын нэрийг түлхүүрт аюулгүй болгоно (үсэг/тоо/._- ; бусад → -). */
export function safeBaseName(name: string | undefined, max = 60): string {
  let n = String(name ?? '');
  // multer UTF-8 нэрийг latin1 гэж уншдаг ("Ð¥Ð°Ñ" г.м.) — засна.
  if (/^[\u0000-\u00FF]*$/.test(n) && /[\u0080-\u00FF]/.test(n)) {
    const fixed = Buffer.from(n, 'latin1').toString('utf8');
    if (!fixed.includes('\uFFFD')) n = fixed; // жинхэнэ latin1 нэр (café) бол хэвээр
  }
  n = n.replace(/\.[A-Za-z0-9]{1,5}$/, '');
  n = n.normalize('NFC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  return (n || 'file').slice(0, max);
}

/** Шинэ файлын id (DB-д хадгалагдах, `/` агуулахгүй): `<ms>_<8 hex>_<нэр><ext>`. */
export function newMediaId(originalName: string | undefined, mime: string): string {
  return `${Date.now()}_${randomBytes(4).toString('hex')}_${safeBaseName(originalName)}${extForMime(mime)}`;
}

/** id нь `/file/<id>`-д аюулгүй эсэх (admin/web proxy-ийн isSafeFileId-тэй нийцтэй). */
export const isSafeMediaId = (id: any) =>
  typeof id === 'string' && id.length > 0 && id.length <= 255 && id !== '.' && id !== '..' && !/[\0/\\]/.test(id);

export function keyPrefix(): string {
  const p = String(process.env.MEDIA_KEY_PREFIX ?? '').trim().replace(/^\/+/, '');
  return p && !p.endsWith('/') ? `${p}/` : p;
}

/** R2 түлхүүр: <prefix>media|private/<purpose>/<kind>/<YYYY>/<MM>/<id>. */
export function buildMediaKey(purpose: MediaPurpose, kind: MediaKind, id: string, at: Date = new Date()): string {
  const vis = MEDIA_PURPOSES[purpose].visibility === 'private' ? 'private' : 'media';
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, '0');
  return `${keyPrefix()}${vis}/${purpose}/${kind}/${y}/${m}/${id}`;
}

/** Зориулалтын бодлогоор шалгана — алдааны мессеж эсвэл null. */
export function checkPolicy(purpose: MediaPurpose, kind: MediaKind, bytes: number): string | null {
  const def = MEDIA_PURPOSES[purpose];
  if (!def.kinds.includes(kind)) {
    return `"${def.label}"-д ${kind} төрлийн файл оруулах боломжгүй (зөвшөөрөгдсөн: ${def.kinds.join(', ')})`;
  }
  const max = def.max[kind] ?? 0;
  if (bytes > max) return `Файл хэт том (${Math.round(bytes / MB)}MB > ${Math.round(max / MB)}MB)`;
  return null;
}
