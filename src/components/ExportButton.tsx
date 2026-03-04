'use client';

import { DealData, Scenario } from '@/types';
import { exportToExcel } from '@/lib/exportToExcel';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  dealData: DealData | null;
  scenarios: Scenario[];
}

export default function ExportButton({ dealData, scenarios }: ExportButtonProps) {
  if (!dealData) return null;
  return (
    <button onClick={() => exportToExcel(dealData, scenarios)} className="btn-secondary flex items-center gap-2 text-sm">
      <Download size={16} /> Export Excel
    </button>
  );
}
