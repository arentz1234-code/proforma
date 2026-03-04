import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PARSE_DOCUMENT_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    let documentText = formData.get('text') as string | null;
    const file = formData.get('file') as File | null;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // If PDF file was uploaded, extract text
    if (file && !documentText && file.name.toLowerCase().endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      documentText = pdfData.text;
    }

    // For non-PDF files or text content, use text-based parsing
    if (file && !documentText) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      documentText = pdfData.text;
    }

    if (!documentText) {
      return NextResponse.json({ error: 'No document content provided' }, { status: 400 });
    }

    const prompt = `${PARSE_DOCUMENT_SYSTEM_PROMPT}\n\nAnalyze this document:\n\n${documentText.slice(0, 50000)}`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return processResponse(responseText);
  } catch (error: unknown) {
    let errMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Parse document error:', error);
    console.error('Error message:', errMessage);

    // Provide more helpful error messages
    if (errMessage.includes('API_KEY') || errMessage.includes('API key') || errMessage.includes('401')) {
      errMessage = 'Invalid API key. Please check your Google Gemini API key and try again.';
    } else if (errMessage.includes('RATE_LIMIT') || errMessage.includes('429') || errMessage.includes('quota')) {
      errMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (errMessage.includes('timeout') || errMessage.includes('DEADLINE')) {
      errMessage = 'Request timed out. Please try again.';
    } else if (errMessage.includes('pattern')) {
      errMessage = 'API configuration error. Please check server logs.';
    }

    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}

function processResponse(responseText: string) {
  // Extract JSON from response
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse JSON. Raw response:', responseText.slice(0, 500));
    throw new Error('Failed to parse AI response. Please try again.');
  }

  // Ensure all required fields have defaults
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
    pricePerUnit: parsed.pricePerUnit || (parsed.askingPrice && parsed.property?.totalUnits ? parsed.askingPrice / parsed.property.totalUnits : 0),
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
      loanAmount: parsed.loanTerms?.loanAmount || parsed.askingPrice * 0.75,
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
