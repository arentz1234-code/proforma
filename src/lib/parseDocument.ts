import { DealData } from '@/types';
import * as XLSX from 'xlsx';

export async function parseDocument(file: File, apiKey: string): Promise<DealData> {
  let textContent = '';

  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
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

  const formData = new FormData();
  formData.append('apiKey', apiKey);

  if (textContent) {
    formData.append('text', textContent);
  } else {
    formData.append('file', file);
  }

  const response = await fetch('/api/parse-document', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to parse document');
  }

  const result = await response.json();
  return result.data;
}
