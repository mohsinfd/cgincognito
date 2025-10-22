/**
 * PDF Text Extraction Module
 * Extracts text from PDF files with password handling
 */

export type PDFExtractResult = {
  text: string;
  numPages: number;
  isEncrypted: boolean;
  metadata: {
    author?: string;
    title?: string;
    subject?: string;
    creator?: string;
  };
};

export type PasswordAttemptResult = {
  success: boolean;
  password?: string;
  error?: string;
};

/**
 * Extract text from PDF buffer
 * Strategy:
 * 1) Try pdfjs-dist directly with password (best compatibility for bank PDFs)
 * 2) Fallback: pdf-lib decrypt → pdf-parse for text extraction
 */
export async function extractTextFromPDF(
  pdfBuffer: Buffer,
  password?: string
): Promise<PDFExtractResult> {
  try {
    console.log(`📄 Starting PDF extraction...`);
    console.log(`📊 PDF Buffer size: ${pdfBuffer.length} bytes`);
    
    // Skip pdfjs-dist due to worker issues in Next.js
    console.log(`⚠️ Skipping pdfjs-dist due to Next.js compatibility issues`);

    // -------------------------------
    // 2) Fallback A: qpdf CLI to decrypt → then parse
    // -------------------------------
    try {
      console.log('🛠️ Trying qpdf fallback to decrypt...');
      const qpdfPath = process.env.QPDF_PATH || 'C:\\Program Files (x86)\\qpdf 12.2.0\\bin\\qpdf.exe';
      const { mkdtempSync, writeFileSync, readFileSync, unlinkSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const { spawnSync } = await import('node:child_process');

      const work = mkdtempSync(join(tmpdir(), 'cg-qpdf-'));
      const inPath = join(work, 'in.pdf');
      const outPath = join(work, 'out.pdf');
      writeFileSync(inPath, Buffer.from(pdfBuffer));

      const args = [
        `--password=${password || ''}`,
        '--decrypt',
        inPath,
        outPath,
      ];
      const res = spawnSync(qpdfPath, args, { encoding: 'utf-8' });

      // qpdf exit codes:
      // 0 = success, 2 = error (e.g., invalid password), 3 = warnings (output produced)
      const { existsSync, statSync } = await import('node:fs');
      const outputExists = existsSync(outPath);
      const outputSize = outputExists ? statSync(outPath).size : 0;
      const stderrLower = (res.stderr || '').toLowerCase();

      const isInvalidPassword = stderrLower.includes('invalid password');
      const isSuccessWithWarnings = res.status === 3 && outputExists && outputSize > 0 && !isInvalidPassword;

      if (res.status === 0 || isSuccessWithWarnings) {
        console.log('✅ qpdf decryption succeeded');
        const decrypted = readFileSync(outPath);
        console.log('📄 Decrypted PDF size:', decrypted.length, 'bytes');
        
        // Save decrypted PDF to a persistent location for later processing
        const { join } = await import('node:path');
        const persistentPath = join(process.cwd(), 'temp-decrypted', `decrypted-${Date.now()}.pdf`);
        
        // Ensure temp directory exists
        const { mkdirSync } = await import('node:fs');
        try {
          mkdirSync(join(process.cwd(), 'temp-decrypted'), { recursive: true });
        } catch {}
        
        // Save decrypted PDF
        writeFileSync(persistentPath, decrypted);
        console.log('💾 Decrypted PDF saved to:', persistentPath);
        
        // Clean up temp files
        try { unlinkSync(inPath); } catch {}
        try { unlinkSync(outPath); } catch {}

        // Return success with reference to decrypted file
        // This will be processed in background or next request
        return {
          text: `[PDF_DECRYPTED_SUCCESSFULLY]\nDecrypted file saved to: ${persistentPath}\nSize: ${decrypted.length} bytes\nReady for text extraction.`,
          numPages: 1,
          isEncrypted: false,
          metadata: {
            decryptedPath: persistentPath,
            originalSize: pdfBuffer.length,
            decryptedSize: decrypted.length,
            decryptedAt: new Date().toISOString(),
          },
        };
      } else {
        console.log('⚠️ qpdf failed', { status: res.status, stderr: res.stderr, outputExists, outputSize });
        // qpdf exits non-zero for wrong password or unsupported encryption
        if (/password/i.test(res.stderr || '')) {
          throw new Error('PDF_ENCRYPTED');
        }
      }
    } catch (qerr: any) {
      console.log('⚠️ qpdf path error:', qerr?.message || qerr?.toString?.());
      // fallthrough to next fallback
    }

    // -------------------------------
    // 3) Fallback B: pdf-lib + pdf-parse
    // -------------------------------
    let processedBuffer = pdfBuffer;

    // If password is provided, try to decrypt with pdf-lib first
    if (password) {
      console.log(`🔐 Attempting to decrypt with pdf-lib using password: "${password}"`);
      try {
        const { PDFDocument } = await import('pdf-lib');

        // Load PDF with password
        console.log(`📖 Loading PDF document with pdf-lib...`);
        const pdfDoc = await PDFDocument.load(pdfBuffer, {
          ignoreEncryption: false,
          password: password
        });

        console.log(`✅ PDF loaded successfully with pdf-lib!`);
        // Save as unencrypted PDF
        processedBuffer = Buffer.from(await pdfDoc.save());
        console.log(`🔓 Successfully decrypted PDF with password: "${password}"`);
        console.log(`📊 Decrypted buffer size: ${processedBuffer.length} bytes`);
      } catch (decryptError: any) {
        console.log(`❌ pdf-lib decryption error:`, {
          message: decryptError.message,
          name: decryptError.name,
          error: decryptError.toString(),
          stack: decryptError.stack?.split('\n')[0]
        });
        
        // If decryption fails, it's likely wrong password
        if (decryptError.message?.includes('password') ||
            decryptError.message?.includes('encrypted') ||
            decryptError.message?.includes('decrypt') ||
            decryptError.message?.includes('Invalid password')) {
          console.log(`🔒 Detected password/encryption error, marking as PDF_ENCRYPTED`);
          throw new Error('PDF_ENCRYPTED');
        }
        // Other errors, continue with original buffer
        console.log(`⚠️ pdf-lib decryption attempt failed, trying pdf-parse directly:`, decryptError.message);
      }
    }

    // Use standalone script for text extraction (more reliable in Next.js)
    console.log(`📖 Extracting text with standalone script...`);
    
    const { spawnSync } = await import('child_process');
    const fs = await import('fs');
    const path = await import('path');
    
    // Create temporary files
    const tempDir = path.join(process.cwd(), 'temp-decrypted');
    const inputFile = path.join(tempDir, `temp-input-${Date.now()}.pdf`);
    const outputFile = path.join(tempDir, `temp-output-${Date.now()}.json`);
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write PDF buffer to file
    fs.writeFileSync(inputFile, processedBuffer);
    
    // Run extraction script
    const scriptPath = path.join(process.cwd(), 'scripts', 'extract-text.js');
    const result = spawnSync('node', [scriptPath, inputFile, outputFile], {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    if (result.status !== 0) {
      throw new Error(`Script failed: ${result.stderr}`);
    }
    
    // Read extracted text
    const extractedData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    
    // Clean up temp files
    try {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }
    
    console.log(`✅ Text extraction successful!`);
    console.log(`📄 Extracted text length: ${extractedData.text.length} characters`);
    console.log(`📄 Number of pages: ${extractedData.numpages}`);

    return {
      text: extractedData.text,
      numPages: extractedData.numpages,
      isEncrypted: false, // If we got here, it's not encrypted or was decrypted
      metadata: {
        author: extractedData.info?.Author,
        title: extractedData.info?.Title,
        subject: extractedData.info?.Subject,
        creator: extractedData.info?.Creator,
      },
    };
  } catch (error: any) {
    console.log(`💥 PDF extraction failed:`, {
      message: error.message,
      name: error.name,
      hasPassword: !!password,
      error: error.toString(),
      stack: error.stack?.split('\n')[0]
    });
    
    // Check if it's a password error
    if (error.message === 'PDF_ENCRYPTED' ||
        error.message?.includes('password') ||
        error.message?.includes('encrypted') ||
        error.message?.includes('decrypt') ||
        error.message?.includes('invalid') ||
        error.code === 'ENCRYPTED') {
      throw new Error('PDF_ENCRYPTED');
    }

    throw new Error(`PDF extraction failed: ${error.message}`);
  }
}

/**
 * Try multiple password combinations
 * Common patterns: DOB, last4 digits, combinations
 */
export async function tryPasswordCombinations(
  pdfBuffer: Buffer,
  hints: {
    dob?: string;      // DDMMYYYY
    last2?: string;    // Last 2 digits of card
    last4?: string;    // Last 4 digits of card
  }
): Promise<PasswordAttemptResult> {
  const passwords: string[] = [];

  // Add provided hints
  if (hints.dob) passwords.push(hints.dob);
  if (hints.last2) passwords.push(hints.last2);
  if (hints.last4) passwords.push(hints.last4);

  // Add common combinations
  if (hints.dob) {
    // Try different DOB formats
    passwords.push(hints.dob.substring(0, 4)); // DDMM
    passwords.push(hints.dob.substring(4, 8)); // YYYY
  }

  // Try each password
  for (const password of passwords) {
    try {
      await extractTextFromPDF(pdfBuffer, password);
      return { success: true, password };
    } catch (error: any) {
      if (error.message === 'PDF_ENCRYPTED') {
        continue; // Try next password
      }
      // Other errors should be thrown
      return { success: false, error: error.message };
    }
  }

  return { 
    success: false, 
    error: 'All password attempts failed' 
  };
}

/**
 * Extract first N characters for quick preview/bank detection
 */
export function extractPreview(text: string, length: number = 500): string {
  return text.substring(0, length).trim();
}

/**
 * Check if PDF text is likely from a scanned document
 * (Very little text or garbled characters)
 */
export function isLikelyScanned(text: string): boolean {
  // If very short text for a statement, likely scanned
  if (text.length < 100) return true;

  // Check ratio of alphanumeric to total characters
  const alphanumeric = text.match(/[a-zA-Z0-9]/g)?.length || 0;
  const ratio = alphanumeric / text.length;

  // If less than 30% alphanumeric, likely garbled OCR or scanned
  return ratio < 0.3;
}

/**
 * Clean extracted text for better LLM processing
 */
export function cleanText(text: string): string {
  return text
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove page breaks
    .replace(/\f/g, '\n')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim();
}


