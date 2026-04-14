import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PUZZLES_DIR = path.join(PUBLIC_DIR, 'puzzles');
const JSON_PATH = path.join(PUBLIC_DIR, 'puzzles.json');

// --- Helper to scan folders ---
function getLocalFiles(dirPath, entries = []) {
  if (!fs.existsSync(dirPath)) return entries;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.startsWith('.')) continue;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getLocalFiles(fullPath, entries);
    } else {
      const relPath = '/' + path.relative(PUBLIC_DIR, fullPath);
      entries.push(relPath);
    }
  }
  return entries;
}

// --- Main Sync Logic ---
async function sync() {
  console.log('Synchronisation des puzzles...');

  let existingPuzzles = [];
  if (fs.existsSync(JSON_PATH)) {
    existingPuzzles = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  }

  const localFilesOnDisk = getLocalFiles(PUZZLES_DIR);
  const newPuzzles = [];

  // 1. Keep all remote (Unsplash) puzzles
  const remotePuzzles = existingPuzzles.filter(p => !p.url.startsWith('/puzzles/'));
  newPuzzles.push(...remotePuzzles);

  // 2. Process local files on disk
  for (const file of localFilesOnDisk) {
    const existing = existingPuzzles.find(p => p.url === file);
    
    if (existing) {
      newPuzzles.push(existing);
    } else {
      // New file detected
      const parts = file.split('/'); // /puzzles/Category/filename.jpg
      const category = parts[2] || 'Inconnu';
      const filename = parts[3] || '';
      
      // Basic formatting for title
      let title = category;
      if (filename) {
        const namePart = filename.split('-').slice(0, 2).join(' '); // Simple guess
        title = `${category} - ${namePart}`;
      }

      newPuzzles.push({
        id: `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        url: file,
        theme: category,
        title: title,
        dateAdded: new Date().toISOString().split('T')[0]
      });
      console.log(`+ Ajouté: ${file}`);
    }
  }

  // 3. Remove puzzles that are local but no longer on disk
  const finalPuzzles = newPuzzles.filter(p => {
    if (!p.url.startsWith('/puzzles/')) return true;
    const exists = localFilesOnDisk.includes(p.url);
    if (!exists) console.log(`- Retiré (manquant sur disque): ${p.url}`);
    return exists;
  });

  // Sort by theme and title
  finalPuzzles.sort((a, b) => {
    if (a.theme !== b.theme) return a.theme.localeCompare(b.theme);
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(JSON_PATH, JSON.stringify(finalPuzzles, null, 2));
  console.log(`Terminé ! ${finalPuzzles.length} puzzles enregistrés dans public/puzzles.json`);
}

sync().catch(console.error);
