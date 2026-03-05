import { DealData } from '@/types';
import * as XLSX from 'xlsx';

export async function parseDocument(file: File): Promise<DealData> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/parse-document', {
    method: 'POST',
    body: formData,
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
