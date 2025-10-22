'use strict';

// Standalone text extractor to avoid Next.js bundling issues with pdf-parse
// Usage: node scripts/extract-text.js <absolute-pdf-path> [output-json-file]

const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Redirect any library warnings/logs to STDERR to keep STDOUT clean JSON
    const origLog = console.log; const origWarn = console.warn; const origInfo = console.info; const origError = console.error;
    console.log = (...args) => { try { process.stderr.write(args.join(' ') + '\n'); } catch (_) {} };
    console.warn = (...args) => { try { process.stderr.write(args.join(' ') + '\n'); } catch (_) {} };
    console.info = (...args) => { try { process.stderr.write(args.join(' ') + '\n'); } catch (_) {} };
    console.error = (...args) => { try { process.stderr.write(args.join(' ') + '\n'); } catch (_) {} };

    const filePath = process.argv[2];
    if (!filePath) {
      process.stderr.write('Missing PDF path\n');
      process.exit(2);
    }
    const abs = path.resolve(filePath);
    const buf = fs.readFileSync(abs);
    const pdfParse = require('pdf-parse');
    
    // Suppress pdf-parse warnings by overriding process.stdout temporarily
    const originalStdout = process.stdout.write;
    let stdoutBuffer = '';
    process.stdout.write = (chunk) => {
      // Filter out warnings that might leak to stdout
      const str = chunk.toString();
      if (str.includes('Warning:') || str.includes('warning:') || str.includes('WARNING:')) {
        process.stderr.write(str);
        return true;
      }
      stdoutBuffer += str;
      return true;
    };
    
    const data = await pdfParse(buf);
    
    // Restore stdout
    process.stdout.write = originalStdout;
    
    const out = {
      numpages: data.numpages || 0,
      text: data.text || '',
      info: data.info || {},
    };
    
    // Restore console just before output
    console.log = origLog; console.warn = origWarn; console.info = origInfo; console.error = origError;
    
    // Support optional output file argument
    const outputFile = process.argv[3];
    if (outputFile) {
      fs.writeFileSync(outputFile, JSON.stringify(out));
    } else {
      process.stdout.write(JSON.stringify(out));
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write((err && err.stack) ? err.stack : String(err));
    process.exit(1);
  }
}

main();


