import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

async function walkDirectory(root) {
  let usedBytes = 0;
  let files = 0;
  let directories = 0;

  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { usedBytes: 0, files: 0, directories: 0 };
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      directories += 1;
      const stats = await walkDirectory(fullPath);
      usedBytes += stats.usedBytes;
      files += stats.files;
      directories += stats.directories;
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath).catch(() => null);
      if (stat) {
        usedBytes += stat.size;
        files += 1;
      }
    }
  }

  return { usedBytes, files, directories };
}

export async function getStorageFootprint(root = config.storageRoot) {
  const resolved = path.resolve(root);
  const exists = await fs
    .access(resolved)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return {
      root: resolved,
      usedBytes: 0,
      usedMB: 0,
      files: 0,
      directories: 0,
    };
  }
  const footprint = await walkDirectory(resolved);
  const usedMB = footprint.usedBytes / (1024 * 1024);
  return {
    root: resolved,
    usedBytes: footprint.usedBytes,
    usedMB: Number(usedMB.toFixed(2)),
    files: footprint.files,
    directories: footprint.directories,
  };
}

export default { getStorageFootprint };
