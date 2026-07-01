const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const HUB_FILES = [
  'src/features/profile/profileHub.js',
  'src/features/shop/shopHub.js',
  'src/features/ranking/rankingHub.js',
  'src/features/admin/adminHub.js',
  'src/features/missions/missionHub.js',
];

function readFile(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function writeFile(relativePath, content) {
  fs.writeFileSync(path.join(ROOT, relativePath), content, 'utf8');
}

function ensureCanvasMessageImport(content) {
  if (content.includes("require('../../utils/canvasMessage')")) {
    return content;
  }

  const importLine = "const { createLargeCanvasPayload } = require('../../utils/canvasMessage');\n";

  const lastRequireMatch = [...content.matchAll(/^const .*?require\(.*?\);\n/gm)].at(-1);

  if (!lastRequireMatch) {
    return `${importLine}${content}`;
  }

  const insertIndex = lastRequireMatch.index + lastRequireMatch[0].length;

  return `${content.slice(0, insertIndex)}${importLine}${content.slice(insertIndex)}`;
}

function convertPayloadObjects(content) {
  let converted = content;

  converted = converted.replace(
    /embeds:\s*\[\s*createCanvasEmbed\([^)]*\)\s*\],\s*components:\s*([\s\S]*?),\s*files:\s*\[\s*attachment\s*\],/g,
    [
      '...createLargeCanvasPayload({',
      '      attachment,',
      '      components: $1,',
      '    }),',
    ].join('\n'),
  );

  converted = converted.replace(
    /embeds:\s*\[\s*createCanvasEmbed\([^)]*\)\s*\],\s*files:\s*\[\s*attachment\s*\],/g,
    [
      '...createLargeCanvasPayload({',
      '      attachment,',
      '    }),',
    ].join('\n'),
  );

  return converted;
}

function convertReturnPayloads(content) {
  let converted = content;

  converted = converted.replace(
    /return\s*\{\s*embeds:\s*\[\s*createCanvasEmbed\([^)]*\)\s*\],\s*components:\s*([\s\S]*?),\s*files:\s*\[\s*attachment\s*\],\s*\};/g,
    [
      'return createLargeCanvasPayload({',
      '    attachment,',
      '    components: $1,',
      '  });',
    ].join('\n'),
  );

  converted = converted.replace(
    /return\s*\{\s*embeds:\s*\[\s*createCanvasEmbed\([^)]*\)\s*\],\s*files:\s*\[\s*attachment\s*\],\s*\};/g,
    [
      'return createLargeCanvasPayload({',
      '    attachment,',
      '  });',
    ].join('\n'),
  );

  return converted;
}

function convertFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    console.warn(`⚠️ Fichier introuvable, ignoré : ${relativePath}`);
    return;
  }

  let content = readFile(relativePath);
  const before = content;

  content = ensureCanvasMessageImport(content);
  content = convertPayloadObjects(content);
  content = convertReturnPayloads(content);

  if (content === before) {
    console.log(`ℹ️ Aucune conversion nécessaire : ${relativePath}`);
    return;
  }

  writeFile(relativePath, content);
  console.log(`✅ Mode grand Canvas appliqué : ${relativePath}`);
}

function main() {
  console.log('Activation du mode grand Canvas...\n');

  for (const file of HUB_FILES) {
    convertFile(file);
  }

  console.log('\nTerminé.');
  console.log('Vérifie rapidement les fichiers modifiés, puis fais git add / commit / push.');
}

main();