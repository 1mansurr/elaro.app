#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
const denoJsonContent = {
  importMap: '../import_map.json',
};

// Get all function directories
const functionDirs = fs
  .readdirSync(functionsDir, { withFileTypes: true })
  .filter(
    dirent =>
      dirent.isDirectory() &&
      dirent.name !== '_shared' &&
      !dirent.name.startsWith('.'),
  )
  .map(dirent => dirent.name);

console.log(`Found ${functionDirs.length} function directories`);

let created = 0;
let skipped = 0;

functionDirs.forEach(funcName => {
  const funcDir = path.join(functionsDir, funcName);
  const denoJsonPath = path.join(funcDir, 'deno.json');

  // Check if deno.json already exists
  if (fs.existsSync(denoJsonPath)) {
    console.log(`⏭️  Skipping ${funcName} (deno.json already exists)`);
    skipped++;
    return;
  }

  // Create deno.json
  fs.writeFileSync(
    denoJsonPath,
    JSON.stringify(denoJsonContent, null, 2) + '\n',
  );
  console.log(`✅ Created deno.json for ${funcName}`);
  created++;
});

console.log(`\n📊 Summary:`);
console.log(`   Created: ${created}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Total: ${functionDirs.length}`);
