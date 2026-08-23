// Origin Private File System helpers — a temporary staging area for uploads.

async function getDir(
  parent: FileSystemDirectoryHandle,
  name: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await parent.getDirectoryHandle(name, { create });
  } catch {
    return null;
  }
}

/** Stage a File at `worlds/:worldId/temp-upload/:filename`. Returns the path. */
export async function writeTempFile(
  worldId: string,
  file: File,
): Promise<string> {
  const root = await navigator.storage.getDirectory();
  const worlds = await root.getDirectoryHandle("worlds", { create: true });
  const world = await worlds.getDirectoryHandle(worldId, { create: true });
  const temp = await world.getDirectoryHandle("temp-upload", { create: true });

  const handle = await temp.getFileHandle(file.name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();

  return `worlds/${worldId}/temp-upload/${file.name}`;
}

/** Delete a staged temp file (best-effort). */
export async function removeTempFile(
  worldId: string,
  filename: string,
): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const worlds = await getDir(root, "worlds", false);
    if (!worlds) return;
    const world = await getDir(worlds, worldId, false);
    if (!world) return;
    const temp = await getDir(world, "temp-upload", false);
    if (!temp) return;
    await temp.removeEntry(filename);
  } catch {
    // best-effort cleanup
  }
}
