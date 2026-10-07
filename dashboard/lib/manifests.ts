import fs from 'fs'; import path from 'path';
export type Manifest = { id: string; label: string; href: string; order?: number };
// Auto-registers every file in dashboard/modules/*.ts into the sidebar.
export async function getManifests(): Promise<Manifest[]> {
  const dir = path.join(process.cwd(), 'modules');
  const files = fs.readdirSync(dir).filter((f) => /\.(ts|js)$/.test(f));
  const all = await Promise.all(files.map(async (f) => (await import(`../modules/${f}`)).default as Manifest));
  return all.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
