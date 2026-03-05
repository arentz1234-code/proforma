import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { PARSE_DOCUMENT_SYSTEM_PROMPT } from '@/lib/prompts';

// Vercel serverless config
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Parse JSON body (text extracted client-side)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse request body' }, { status: 400 });
    }

    const textContent = body.text as string | null;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    if (!textContent) {
      return NextResponse.json({ error: 'No document text provided' }, { status: 400 });
    }

    // Analyze document with Claude
    let result;
    try {
      result = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: PARSE_DOCUMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze this document:\n\n${textContent.slice(0, 100000)}`
          }
        ]
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (msg.includes('rate_limit') || msg.includes('429')) {
        return NextResponse.json({ error: 'Rate limit reached. Please wait a minute.' }, { status: 429 });
      }
      return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
    }

    // Extract text from response
    const responseText = result.content[0].type === 'text' ? result.content[0].text : '';
    return processResponse(responseText);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errMessage, step: 'unknown' }, { status: 500 });
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
