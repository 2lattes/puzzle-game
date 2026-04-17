import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUZZLES_PATH = path.join(__dirname, '../public/puzzles.json');
const ENV_PATH = path.join(__dirname, '../.env.local');

// ─── Helper: Load ENV ────────────────────────────────────────────────────────

function getAccessKey() {
  try {
    const env = fs.readFileSync(ENV_PATH, 'utf8');
    const match = env.match(/NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=([^\s]+)/);
    return match ? match[1] : null;
  } catch (err) {
    console.error("Could not read .env.local", err);
    return null;
  }
}

const ACCESS_KEY = getAccessKey();
if (!ACCESS_KEY) {
  console.error("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY not found in .env.local");
  process.exit(1);
}

// ─── URL ID Extraction ───────────────────────────────────────────────────────

function extractId(url) {
  if (!url || !url.includes('images.unsplash.com')) return null;
  const match = url.match(/photo-([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

// ─── Unsplash API Call ───────────────────────────────────────────────────────

async function fetchPhoto(id) {
  try {
    const res = await fetch(`https://api.unsplash.com/photos/${id}`, {
      headers: {
        Authorization: `Client-ID ${ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (res.status === 403) {
      throw new Error('RATE_LIMIT');
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Unsplash error ${res.status}: ${text}`);
    }

    return res.json();
  } catch (err) {
    throw err;
  }
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

async function main() {
  const raw = fs.readFileSync(PUZZLES_PATH, 'utf8');
  let puzzles = JSON.parse(raw);
  let updatedCount = 0;
  let skippedCount = 0;

  console.log(`Starting refresh for ${puzzles.length} puzzles...`);

  for (let i = 0; i < puzzles.length; i++) {
    const p = puzzles[i];
    
    // Skip if already processed or not Unsplash
    if (p.thumbUrl && p.imageUrl) {
      skippedCount++;
      continue;
    }

    const id = p.unsplashId || p.unsplashPhotoId || extractId(p.url);
    if (!id || p.source === 'local' || p.url.startsWith('/')) {
      continue;
    }

    try {
      // Conservative delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 2000));
      
      const photo = await fetchPhoto(id);
      
      puzzles[i] = {
        ...p,
        url: `${photo.urls.raw}&auto=format&fit=crop&w=2048&h=1536&q=80`,
        imageUrl: photo.urls.regular, 
        thumbUrl: photo.urls.small,
        unsplashId: photo.id,
        unsplashPhotoId: photo.id,
        photographerName: photo.user.name,
        photographerUrl: photo.user.links.html,
        source: 'unsplash',
      };
      
      updatedCount++;
      process.stdout.write('.');

      // Incremental save every 5 updates
      if (updatedCount % 5 === 0) {
        fs.writeFileSync(PUZZLES_PATH, JSON.stringify(puzzles, null, 2), 'utf8');
      }

    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.warn('\nRate limit reached. Saving progress and exiting.');
        break;
      }
      // console.warn(`\nFailed to refresh puzzle ${p.id} (${id}):`, err.message);
    }
  }

  fs.writeFileSync(PUZZLES_PATH, JSON.stringify(puzzles, null, 2), 'utf8');
  console.log(`\n\nFinal Report:`);
  console.log(`- Refreshed: ${updatedCount}`);
  console.log(`- Skipped (already valid): ${skippedCount}`);
  console.log(`- Total puzzles: ${puzzles.length}`);
}

main().catch(console.error);
