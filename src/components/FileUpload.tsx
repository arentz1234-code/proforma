'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { DealData } from '@/types';
import { parseDocument } from '@/lib/parseDocument';

interface FileUploadProps {
  onDataParsed: (data: DealData) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

export default function FileUpload({ onDataParsed, isProcessing, setIsProcessing }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const validExts = ['.pdf', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError('Please upload a PDF or Excel file');
      return;
    }

    setError('');
    setFileName(file.name);
    setIsProcessing(true);
    setStatus('Reading document...');

    try {
      setStatus('Analyzing with Claude AI...');
      const data = await parseDocument(file);
      setStatus('');
      onDataParsed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse document');
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="card">
      <div className="card-body">
        <div
          className={`upload-zone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="loading-spinner" />
              <div className="text-center">
                <p className="text-[var(--text-primary)] font-medium">{status}</p>
                <p className="text-sm text-[var(--text-muted)] mt-1">{fileName}</p>
              </div>
              <div className="loading-bar w-64">
                <div className="loading-bar-fill" style={{ width: '100%' }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Upload size={28} className="text-[var(--text-muted)]" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-[var(--text-primary)]">
                  Drop your offering memorandum here
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  or click to browse files
                </p>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <FileText size={16} className="text-danger" />
                  <span>PDF</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <FileSpreadsheet size={16} className="text-success" />
                  <span>Excel</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--accent-danger-dim)] border border-[rgba(239,68,68,0.3)]">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Claude AI will extract property details, rent roll, expenses, and financial metrics from your document
          </p>
        </div>
      </div>
    </div>
  );
}
