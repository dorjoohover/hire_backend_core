// utils/file-utils.ts
import { statSync, readdirSync, unlinkSync, createWriteStream, existsSync } from 'fs';
import { join } from 'path';

export function getFolderSizeMB(folderPath: string): number {
  return readdirSync(folderPath).reduce((total, file) => {
    const filePath = join(folderPath, file);
    const stats = statSync(filePath);
    return total + stats.size;
  }, 0) / (1024 * 1024);
}

export function deleteOldestFiles(folderPath: string, maxMB: number) {
  const files = readdirSync(folderPath).map(name => {
    const fullPath = join(folderPath, name);
    return { name, time: statSync(fullPath).birthtimeMs };
  });

  let folderSize = getFolderSizeMB(folderPath);
  if (folderSize <= maxMB) return;

  files.sort((a, b) => a.time - b.time); // oldest first

  for (const file of files) {
    const filePath = join(folderPath, file.name);
    unlinkSync(filePath);
    folderSize = getFolderSizeMB(folderPath);
    if (folderSize <= maxMB) break;
  }
}
