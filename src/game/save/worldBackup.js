export const BACKUP_FORMAT = "voxel-frontier-world";
export const BACKUP_VERSION = 1;

export function buildWorldBackup(record) {
  if (!record?.id || !record?.seed) throw new Error("A loaded world is required before creating a backup.");
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    world: record,
  };
}

export function validateWorldBackup(value) {
  if (!value || value.format !== BACKUP_FORMAT || !value.world?.id || !value.world?.seed) {
    throw new Error("This file is not a valid Voxel Frontier world backup.");
  }
  return value.world;
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file) {
  const text = await file.text();
  return JSON.parse(text);
}
