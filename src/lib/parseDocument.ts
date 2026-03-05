import { DealData } from '@/types';
import * as XLSX from 'xlsx';

async function extractPdfText(file: File): Promise<string> {
  try {
    // Dynamically import pdf.js only on client side
    const pdfjs = await import('pdfjs-dist');

    // Disable worker to avoid CDN/CORS issues - runs in main thread
    pdfjs.GlobalWorkerOptions.workerSrc = '';

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;

    const textParts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = (textContent.items as any[])
        .filter((item) => item && typeof item.str === 'string')
        .map((item) => item.str)
        .join(' ');
      textParts.push(`--- Page ${i} ---\n${pageText}`);
    }

    return textParts.join('\n\n');
  } catch (err) {
    console.error('PDF extraction error:', err);
    throw new Error(`Failed to extract PDF text: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

export async function parseDocument(file: File): Promise<DealData> {
  let textContent = '';

  // Extract text client-side to avoid Vercel's 4.5MB body limit
  if (file.name.toLowerCase().endsWith('.pdf')) {
    textContent = await extractPdfText(file);
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheets: string[] = [];
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      sheets.push(`=== Sheet: ${name} ===`);
      sheets.push(XLSX.utils.sheet_to_csv(sheet));
    });
    textContent = sheets.join('\n\n');
  }

  if (!textContent) {
    throw new Error('Could not extract text from document');
  }

  const response = await fetch('/api/parse-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: textContent }),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to parse document';
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch {
      errorMsg = `Server error: ${response.status}`;
    }
    throw new Error(errorMsg);
  }

  const result = await response.json();
  return result.data;
}
