'use strict';

// Simulate end-to-end processing locally without Gmail:
// - Optional qpdf decrypt (if --password provided)
// - Extract text from PDF
// - Parse with OpenAI to JSON
// Usage examples:
//   node scripts/process-local.js --pdf 20251008.pdf --bank hsbc --password 151085404400
//   node scripts/process-local.js --pdf temp-decrypted/decrypted-xxxxx.pdf --bank hsbc

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pdf') args.pdf = argv[++i];
    else if (a === '--bank') args.bank = argv[++i];
    else if (a === '--password') args.password = argv[++i];
    else if (a === '--qpdf') args.qpdf = argv[++i];
  }
  return args;
}

async function main() {
  const { pdf, bank, password } = parseArgs(process.argv);
  const qpdfPath = process.env.QPDF_PATH || process.env.QPDF || 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';

  if (!pdf || !bank) {
    console.error('Usage: node scripts/process-local.js --pdf <file> --bank <code> [--password <pwd>]');
    process.exit(2);
  }

  const inputPath = path.resolve(pdf);
  if (!fs.existsSync(inputPath)) {
    console.error('PDF not found:', inputPath);
    process.exit(2);
  }

  console.log('🧪 Local Statement Processing');
  console.log('='.repeat(80));
  console.log('📁 Input:', inputPath);
  console.log('🏦 Bank :', bank);
  console.log('🔐 Pass :', password ? '(provided)' : '(none)');

  let workFile = inputPath;

  // Optional decrypt with qpdf
  if (password) {
    console.log('\n🔓 Decrypting with qpdf...');
    const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'qpdf-local-'));
    const inPath = path.join(tmpDir, 'in.pdf');
    const outPath = path.join(tmpDir, 'out.pdf');
    fs.copyFileSync(inputPath, inPath);

    const args = [
      `--password=${password}`,
      '--decrypt',
      inPath,
      outPath,
    ];
    const res = spawnSync(qpdfPath, args, { encoding: 'utf-8' });
    const ok = res.status === 0 || res.status === 3;
    if (!ok || !fs.existsSync(outPath)) {
      console.error('qpdf failed:', res.stderr || res.stdout);
      process.exit(1);
    }
    workFile = outPath;
    console.log('✅ qpdf decrypted');
  }

  // Extract text using standalone extractor (avoids Next SSR issues)
  console.log('\n📖 Extracting text...');
  const extractor = path.join(process.cwd(), 'scripts', 'extract-text.js');
  const res2 = spawnSync(process.execPath, [extractor, workFile], { encoding: 'utf-8' });
  if (res2.status !== 0) {
    console.error('Text extraction failed:', res2.stderr || res2.stdout);
    process.exit(1);
  }
  const parsed = JSON.parse(res2.stdout || '{}');
  console.log('✅ Extracted pages:', parsed.numpages, 'text length:', (parsed.text || '').length);

  // Parse with OpenAI directly
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY in environment');
    process.exit(2);
  }

  const { default: OpenAI } = require('openai');
  const client = new OpenAI({ apiKey });

  const system = 'You are an expert credit card statement parser. Extract transactions accurately and return valid JSON.';
  const user = `Bank: ${bank}\n\nStatement Text (truncated to 12000 chars):\n${(parsed.text || '').slice(0, 12000)}`;

  console.log('\n🤖 Calling OpenAI...');
  const t0 = Date.now();
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 4096,
  });
  const latency = Date.now() - t0;
  const content = resp.choices?.[0]?.message?.content || '{}';
  let json;
  try { json = JSON.parse(content); } catch { json = { raw: content }; }

  console.log('✅ OpenAI done in', latency, 'ms');
  console.log('🧾 Parsed keys:', Object.keys(json || {}));

  const outDir = path.join(process.cwd(), 'temp-decrypted');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
  const outJson = path.join(outDir, `parsed-${Date.now()}.json`);
  fs.writeFileSync(outJson, JSON.stringify(json, null, 2));
  console.log('\n💾 Saved parsed JSON to:', outJson);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err && err.stack ? err.stack : err);
  process.exit(1);
});



