import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PARSE_DOCUMENT_SYSTEM_PROMPT } from '@/lib/prompts';
import * as XLSX from 'xlsx';

// Railway/Node.js config - no body size limits
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const fileName = file.name.toLowerCase();

    let result;

    if (fileName.endsWith('.pdf')) {
      // Send PDF directly to Claude using document support
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      result = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: PARSE_DOCUMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: 'Analyze this offering memorandum and extract all the data requested.',
              },
            ],
          },
        ],
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Convert Excel to text
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets: string[] = [];
      workbook.SheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        sheets.push(`=== Sheet: ${name} ===`);
        sheets.push(XLSX.utils.sheet_to_csv(sheet));
      });
      const textContent = sheets.join('\n\n');

      result = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: PARSE_DOCUMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze this offering memorandum and extract all the data requested:\n\n${textContent}`,
          },
        ],
      });
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Please upload PDF or Excel.' }, { status: 400 });
    }

    // Extract text from response
    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    return processResponse(responseText);
  } catch (error: unknown) {
    console.error('Parse document error:', error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errMessage.includes('rate_limit') || errMessage.includes('429')) {
      return NextResponse.json({ error: 'Rate limit reached. Please wait a minute.' }, { status: 429 });
    }

    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

function processResponse(responseText: string) {
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse response:', responseText);
    throw new Error('Failed to parse AI response. Please try again.');
  }

  const data = {
    property: {
      name: parsed.property?.name || 'Unknown Property',
      address: parsed.property?.address || '',
      propertyType: parsed.property?.propertyType || 'Multifamily',
      yearBuilt: parsed.property?.yearBuilt || null,
      totalUnits: parsed.property?.totalUnits || null,
      totalSF: parsed.property?.totalSF || 0,
      occupancyRate: parsed.property?.occupancyRate || null,
    },
    askingPrice: parsed.askingPrice || 0,
    pricePerUnit: parsed.pricePerUnit || 0,
    pricePerSF: parsed.pricePerSF || 0,
    rentRoll: parsed.rentRoll || [],
    grossPotentialRent: parsed.grossPotentialRent || 0,
    vacancyRate: parsed.vacancyRate ?? 5,
    vacancyLoss: parsed.vacancyLoss || 0,
    otherIncome: parsed.otherIncome || 0,
    effectiveGrossIncome: parsed.effectiveGrossIncome || 0,
    expenses: parsed.expenses || [],
    totalExpenses: parsed.totalExpenses || 0,
    expenseRatio: parsed.expenseRatio || 0,
    managementFee: parsed.managementFee || 0,
    replacementReserves: parsed.replacementReserves || 0,
    netOperatingIncome: parsed.netOperatingIncome || 0,
    loanTerms: {
      loanAmount: parsed.loanTerms?.loanAmount || 0,
      interestRate: parsed.loanTerms?.interestRate || 6.5,
      termYears: parsed.loanTerms?.termYears || 10,
      amortizationYears: parsed.loanTerms?.amortizationYears || 30,
      loanType: parsed.loanTerms?.loanType || 'Fixed',
      isInterestOnly: parsed.loanTerms?.isInterestOnly || false,
    },
    downPaymentPercent: parsed.downPaymentPercent || 25,
  };

  return NextResponse.json({ success: true, data });
}
