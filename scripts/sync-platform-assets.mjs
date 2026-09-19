import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const workspace = process.cwd();
const seedPath = path.join(workspace, 'db', 'seed.sql');
const outputDirectory = path.join(workspace, 'public', 'platforms');
const manifestPath = path.join(workspace, 'docs', 'PLATFORM_ASSETS.json');

const assetOverrides = {
  Crunchyroll: {
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Crunchyroll_2024.svg',
    provider: 'Wordmark oficial 2024 de Crunchyroll, archivado en Wikimedia Commons',
    filename: 'crunchyroll-wordmark.png',
  },
  'Disney+': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg',
    provider: 'Wordmark oficial de Disney+, archivado en Wikimedia Commons',
    filename: 'disney-wordmark.png',
  },
  'Claro video': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Logo_de_Claro_Video.svg',
    provider: 'Wordmark de Claro video, archivado en Wikimedia Commons',
    filename: 'claro-video-wordmark.png',
  },
};

const brandBackgrounds = {
  Netflix: '#090909',
  'Disney+': '#071a3d',
  'Apple TV+': '#e7e8eb',
  Max: '#001a49',
  'Amazon Prime Video': '#101b2b',
  'Paramount+': '#0057d9',
  Hulu: '#071b13',
  Peacock: '#111111',
  Crunchyroll: '#000000',
  MUBI: '#f0c53a',
  DAZN: '#101010',
  'Viki Pass': '#0b3d73',
  'ViX Premium': '#ff6542',
  'Claro video': '#ffffff',
  'Movistar TV App': '#dff4fb',
  'DGO / DIRECTV': '#071a35',
  Zapping: '#d90055',
  Globoplay: '#d7083b',
  Telecine: '#11144f',
  Starz: '#111111',
  CuriosityStream: '#2a1800',
  Nebula: '#102d45',
  'Rakuten Viki / Rakuten TV': '#f5dfe1',
  'Spotify Premium': '#0b2617',
  'Apple Music': '#ffe2e8',
  'YouTube Music Premium': '#201010',
  'Amazon Music Unlimited': '#102331',
  'Deezer Premium': '#24133f',
  TIDAL: '#111111',
  'SoundCloud Go+': '#331100',
  Audible: '#fff0d9',
  'Xbox Game Pass': '#0b3819',
  'PlayStation Plus': '#061c4c',
  'Nintendo Switch Online': '#df1725',
  'EA Play': '#e8e9eb',
  'GeForce NOW': '#142800',
  'Discord Nitro': '#171a3d',
  'Fortnite / V-Bucks': '#241638',
  'Riot Points / VALORANT': '#2d1118',
  ChatGPT: '#dcece8',
  'Google AI': '#142438',
  'Google AI Pro / Gemini': '#142438',
  Claude: '#f1dfd2',
  'Microsoft Copilot': '#e0e8f7',
  Perplexity: '#102f33',
  'Grok / X Premium': '#111111',
  Midjourney: '#e5e7eb',
  Runway: '#e8e2db',
  'Adobe Firefly': '#2b0d06',
  Canva: '#d9f4f6',
  'Canva AI / Magic Studio': '#d9f4f6',
  Notion: '#e8e8e8',
  'Notion AI': '#e8e8e8',
  'Microsoft 365': '#e0e5f5',
  Dropbox: '#dbe9ff',
  'Dropbox Sign': '#dbe9ff',
  Zoom: '#dceaff',
  Todoist: '#ffe2df',
  NordVPN: '#dce5ff',
  Surfshark: '#d8f5f4',
  Duolingo: '#dff3d4',
  Coursera: '#dce8ff',
  Udemy: '#ede2ff',
  Skillshare: '#09291f',
  MasterClass: '#161616',
  Strava: '#fff0df',
};

const brands = {
  '1Password': ['1password.com', '1password'],
  'Adobe Creative Cloud': ['adobe.com/creativecloud.html', 'adobe'],
  'Adobe Firefly': ['adobe.com/products/firefly.html', 'adobe'],
  'Amazon Music Unlimited': ['music.amazon.com', 'amazon-music'],
  'Amazon Prime Video': ['primevideo.com', 'amazon-prime'],
  'Apple Arcade': ['apple.com/apple-arcade', 'apple'],
  'Apple Fitness+': ['apple.com/apple-fitness-plus', 'apple'],
  'Apple Music': ['music.apple.com', 'apple-music'],
  'Apple Podcasts Subscriptions': ['podcasts.apple.com', 'apple-podcasts'],
  'Apple TV+': ['tv.apple.com', 'apple-tv'],
  Audible: ['audible.com', 'audible'],
  Bitwarden: ['bitwarden.com', 'bitwarden'],
  Calm: ['calm.com', 'calm'],
  Canva: ['canva.com', 'canva'],
  'Canva AI / Magic Studio': ['canva.com/magic-studio', 'canva'],
  ChatGPT: ['chatgpt.com', 'chatgpt'],
  'Claro video': ['clarovideo.com', 'claro'],
  Claude: ['claude.ai', 'claude-ai'],
  Coursera: ['coursera.org', 'coursera'],
  Crunchyroll: ['crunchyroll.com', 'crunchyroll'],
  CuriosityStream: ['curiositystream.com', 'curiosity-stream'],
  Cursor: ['cursor.com', 'cursor-ai'],
  DAZN: ['dazn.com', 'dazn'],
  'DGO / DIRECTV': ['directvla.com', 'directv'],
  Dashlane: ['dashlane.com', 'dashlane'],
  'Deezer Premium': ['deezer.com', 'deezer'],
  'Discord Nitro': ['discord.com/nitro', 'discord'],
  'Disney+': ['disneyplus.com', 'disney-plus'],
  DocuSign: ['docusign.com', 'docusign'],
  Dropbox: ['dropbox.com', 'dropbox'],
  'Dropbox Sign': ['sign.dropbox.com', 'dropbox'],
  Duolingo: ['duolingo.com', 'duolingo'],
  'EA Play': ['ea.com/ea-play', 'ea'],
  ElevenLabs: ['elevenlabs.io', 'eleven-labs'],
  Evernote: ['evernote.com', 'evernote'],
  ExpressVPN: ['expressvpn.com', 'expressvpn'],
  'Fitbit Premium': ['fitbit.com/global/us/products/services/premium', 'fitbit'],
  'Fortnite / V-Bucks': ['fortnite.com', 'fortnite'],
  'GeForce NOW': ['nvidia.com/geforce-now', 'nvidia'],
  'GitHub Copilot': ['github.com/features/copilot', 'github-copilot'],
  Globoplay: ['globoplay.globo.com', 'globoplay'],
  'Google AI': ['one.google.com/about/google-ai-plans', 'google-gemini'],
  'Google AI Pro / Gemini': ['gemini.google.com', 'google-gemini'],
  'Google One': ['one.google.com', 'google-one'],
  'Google Play Pass': ['play.google.com/store/pass/getstarted', 'google-play'],
  'Grok / X Premium': ['grok.com', 'grok'],
  Headspace: ['headspace.com', 'headspace'],
  Hulu: ['hulu.com', 'hulu'],
  Ideogram: ['ideogram.ai', 'ideogram'],
  'Kindle Unlimited': ['amazon.com/kindle-dbs/hz/subscribe/ku', 'amazon-kindle'],
  'Leonardo AI': ['leonardo.ai', 'leonardo-ai'],
  MUBI: ['mubi.com', 'mubi'],
  MasterClass: ['masterclass.com', 'masterclass'],
  Max: ['max.com', 'max'],
  'Microsoft 365': ['microsoft.com/microsoft-365', 'microsoft-365'],
  'Microsoft Copilot': ['microsoft.com/copilot', 'microsoft-copilot'],
  Midjourney: ['midjourney.com', 'midjourney'],
  'Minecraft Realms': ['minecraft.net/realms', 'minecraft'],
  'Mistral Le Chat': ['mistral.ai/products/le-chat', 'mistral-ai'],
  'Movistar TV App': ['movistar.com.pe/tv', 'movistar'],
  Nebula: ['nebula.tv', 'nebula'],
  Netflix: ['netflix.com', 'netflix'],
  'Nintendo Switch Online': ['nintendo.com/us/gaming-systems/switch-online', 'nintendo-switch'],
  NordPass: ['nordpass.com', 'nordpass'],
  NordVPN: ['nordvpn.com', 'nordvpn'],
  Notion: ['notion.so', 'notion'],
  'Notion AI': ['notion.so/product/ai', 'notion'],
  'Paramount+': ['paramountplus.com', 'paramount-plus'],
  Peacock: ['peacocktv.com', 'peacock'],
  Perplexity: ['perplexity.ai', 'perplexity'],
  'PlayStation Plus': ['playstation.com/ps-plus', 'playstation-plus'],
  Podimo: ['podimo.com', 'podimo'],
  Poe: ['poe.com', 'poe'],
  'Proton Unlimited': ['proton.me', 'proton'],
  'Proton VPN': ['protonvpn.com', 'proton-vpn'],
  Qobuz: ['qobuz.com', 'qobuz'],
  'Rakuten Viki / Rakuten TV': ['viki.com', 'rakuten'],
  Replit: ['replit.com', 'replit'],
  'Riot Points / VALORANT': ['playvalorant.com', 'valorant'],
  'Roblox Premium / Robux': ['roblox.com/premium/membership', 'roblox'],
  Runway: ['runwayml.com', 'runway'],
  'Scribd / Everand': ['everand.com', 'scribd'],
  Skillshare: ['skillshare.com', 'skillshare'],
  'SoundCloud Go+': ['soundcloud.com/go', 'soundcloud'],
  'Spotify Premium': ['spotify.com/premium', 'spotify'],
  Starz: ['starz.com', 'starz'],
  Storytel: ['storytel.com', 'storytel'],
  Strava: ['strava.com', 'strava'],
  Surfshark: ['surfshark.com', 'surfshark'],
  TIDAL: ['tidal.com', 'tidal'],
  Telecine: ['telecine.com.br', 'telecine'],
  Todoist: ['todoist.com', 'todoist'],
  'TuneIn Premium': ['tunein.com/premium', 'tunein'],
  'Ubisoft+': ['ubisoft.com/plus', 'ubisoft'],
  Udemy: ['udemy.com', 'udemy'],
  'ViX Premium': ['vix.com', 'vix'],
  'Viki Pass': ['viki.com/pass', 'viki'],
  'Xbox Game Pass': ['xbox.com/xbox-game-pass', 'xbox-game-pass'],
  'YouTube Music Premium': ['music.youtube.com', 'youtube-music'],
  Zapping: ['zapping.com', 'zapping'],
  Zoom: ['zoom.com', 'zoom'],
  'iCloud+': ['icloud.com', 'icloud'],
};

function normalize(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DoraPass asset synchronizer' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function renderPng(input) {
  return sharp(input, { density: 300 })
    .resize(512, 320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

function toHex(value) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

async function chooseBackground(buffer, service) {
  if (brandBackgrounds[service]) return brandBackgrounds[service];

  const { data } = await sharp(buffer)
    .ensureAlpha()
    .resize(64, 40, { fit: 'contain' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let red = 0;
  let green = 0;
  let blue = 0;
  let weight = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.08) continue;
    red += data[index] * alpha;
    green += data[index + 1] * alpha;
    blue += data[index + 2] * alpha;
    weight += alpha;
  }

  if (!weight) return '#e7ecf4';
  red /= weight;
  green /= weight;
  blue /= weight;
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  const mix = luminance > 0.43 ? 0.2 : 0.12;
  const base = luminance > 0.43 ? 8 : 224;
  const background = [red, green, blue].map((channel) => base + channel * mix);
  return `#${background.map(toHex).join('')}`;
}

const seed = await readFile(seedPath, 'utf8');
const products = [...seed.matchAll(/^\s*\('([^']+)',\s*\(select id[^\n]+?\),\s*'([^']+)'/gm)].map(
  ([, slug, service]) => ({ slug, service }),
);

if (products.length !== 108) {
  throw new Error(`Se esperaban 108 productos y se encontraron ${products.length}.`);
}

const treeResponse = await fetch(
  'https://api.github.com/repos/homarr-labs/dashboard-icons/git/trees/main?recursive=1',
  { headers: { 'User-Agent': 'DoraPass asset synchronizer' } },
);
if (!treeResponse.ok) throw new Error('No se pudo consultar el catálogo de Dashboard Icons.');
const tree = await treeResponse.json();
const dashboardIcons = new Set(
  tree.tree
    .map((entry) => entry.path)
    .filter((entryPath) => entryPath.startsWith('png/') && entryPath.endsWith('.png'))
    .map((entryPath) => path.basename(entryPath, '.png')),
);

await mkdir(outputDirectory, { recursive: true });
const cache = new Map();
const manifest = [];

for (const product of products) {
  const [officialPath, preferredIcon] = brands[product.service] ?? [];
  if (!officialPath) throw new Error(`Falta configurar la fuente oficial de ${product.service}.`);

  let asset = cache.get(product.service);
  if (!asset) {
    const override = assetOverrides[product.service];
    const candidates = [preferredIcon, normalize(product.service), normalize(product.service.split('/')[0])]
      .filter(Boolean);
    const dashboardSlug = candidates.find((candidate) => dashboardIcons.has(candidate));

    if (override) {
      asset = {
        buffer: await renderPng(await fetchBuffer(override.url)),
        provider: override.provider,
        sourceUrl: override.url,
        usageNote: 'Logo completo de identificación; la marca pertenece a su titular.',
      };
    } else if (dashboardSlug) {
      const url = `https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/png/${dashboardSlug}.png`;
      asset = {
        buffer: await renderPng(await fetchBuffer(url)),
        provider: 'Dashboard Icons',
        sourceUrl: url,
        usageNote: 'Icono de identificación de marca; la marca pertenece a su titular.',
      };
    } else {
      let simpleIcon;
      for (const candidate of candidates) {
        const url = `https://cdn.simpleicons.org/${candidate}`;
        try {
          simpleIcon = { buffer: await renderPng(await fetchBuffer(url)), url };
          break;
        } catch {
          // Continue with the next exact brand candidate.
        }
      }

      if (simpleIcon) {
        asset = {
          buffer: simpleIcon.buffer,
          provider: 'Simple Icons',
          sourceUrl: simpleIcon.url,
          usageNote: 'Colección CC0; las marcas y sus restricciones pertenecen a sus titulares.',
        };
      } else {
        const officialDomain = officialPath.split('/')[0];
        const url = `https://www.google.com/s2/favicons?domain_url=https://${officialDomain}&sz=256`;
        asset = {
          buffer: await renderPng(await fetchBuffer(url)),
          provider: 'Icono del sitio oficial (recuperado por Google Favicon)',
          sourceUrl: url,
          usageNote: 'Icono publicado por el dominio oficial; la marca pertenece a su titular.',
        };
      }
    }
    cache.set(product.service, asset);
  }

  asset.backgroundColor ??= await chooseBackground(asset.buffer, product.service);

  const filename = assetOverrides[product.service]?.filename ?? `${product.slug}.png`;
  await writeFile(path.join(outputDirectory, filename), asset.buffer);
  manifest.push({
    productSlug: product.slug,
    service: product.service,
    file: `/platforms/${filename}`,
    alt: `Logo de ${product.service}`,
    backgroundColor: asset.backgroundColor,
    provider: asset.provider,
    sourceUrl: asset.sourceUrl,
    officialUrl: `https://${officialPath}`,
    usageNote: asset.usageNote,
  });
}

await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      notice:
        'Los logos se usan únicamente para identificar servicios. DoraPass no afirma afiliación con sus titulares.',
      assets: manifest,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

const providerCounts = Object.groupBy(manifest, (asset) => asset.provider);
console.log(`Generados ${manifest.length} PNG para ${cache.size} servicios.`);
for (const [provider, assets] of Object.entries(providerCounts)) {
  console.log(`${provider}: ${assets.length}`);
}
