import { DealData } from '@/types';
import * as XLSX from 'xlsx';

async function extractPdfText(file: File): Promise<string> {
  // Dynamically import pdf.js only on client side
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = (textContent.items as any[])
      .map((item) => item.str || '')
      .join(' ');
    textParts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return textParts.join('\n\n');
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
