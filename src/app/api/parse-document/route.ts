import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PARSE_DOCUMENT_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse form data', step: 1 }, { status: 400 });
    }

    const textContent = formData.get('text') as string | null;
    const file = formData.get('file') as File | null;

    // Step 2: Check API key
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set in environment', step: 2 }, { status: 500 });
    }

    // Step 3: Initialize Gemini
    let genAI, model;
    try {
      genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      return NextResponse.json({ error: `Gemini init failed: ${msg}`, step: 3 }, { status: 500 });
    }

    let result;

    if (textContent) {
      // Step 4a: Text content
      try {
        const prompt = `${PARSE_DOCUMENT_SYSTEM_PROMPT}\n\nAnalyze this document:\n\n${textContent.slice(0, 50000)}`;
        result = await model.generateContent(prompt);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        return NextResponse.json({ error: `Text analysis failed: ${msg}`, step: '4a' }, { status: 500 });
      }
    } else if (file) {
      // Step 4b: PDF file
      try {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');

        result = await model.generateContent([
          {
            inlineData: {
              mimeType: file.type || 'application/pdf',
              data: base64,
            },
          },
          { text: PARSE_DOCUMENT_SYSTEM_PROMPT },
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        return NextResponse.json({ error: `PDF analysis failed: ${msg}`, step: '4b' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'No document provided', step: 4 }, { status: 400 });
    }

    // Step 5: Process response
    const responseText = result.response.text();
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
