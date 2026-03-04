#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function testPdfParse() {
  const pdfPath = '/Users/andrewrentz/Downloads/Skyline Apartments  Offering Memorandum 20.pdf';

  console.log('Testing PDF parsing...');
  console.log('File:', pdfPath);

  // First, test if pdf-parse can read the file
  const pdfParse = require('pdf-parse');
  const buffer = fs.readFileSync(pdfPath);

  console.log('\n--- Extracting text from PDF ---');
  const data = await pdfParse(buffer);

  console.log('Pages:', data.numpages);
  console.log('Text length:', data.text.length, 'characters');
  console.log('\n--- First 3000 characters of extracted text ---\n');
  console.log(data.text.slice(0, 3000));
  console.log('\n--- End of preview ---\n');

  // Look for key data points
  const text = data.text;
  console.log('--- Searching for key data points ---');

  const patterns = [
    { name: 'Units', regex: /(\d+)\s*units?/gi },
    { name: 'Price', regex: /\$[\d,]+(?:\.\d+)?(?:\s*(?:million|M))?/gi },
    { name: 'NOI', regex: /NOI[:\s]*\$?[\d,]+/gi },
    { name: 'Cap Rate', regex: /cap\s*rate[:\s]*[\d.]+%?/gi },
    { name: 'Year Built', regex: /(?:built|year\s*built|constructed)[:\s]*(\d{4})/gi },
    { name: 'SF/Square Feet', regex: /[\d,]+\s*(?:SF|square\s*feet)/gi },
  ];

  patterns.forEach(({ name, regex }) => {
    const matches = text.match(regex);
    if (matches) {
      console.log(`${name}:`, [...new Set(matches.slice(0, 5))].join(', '));
    }
  });

  console.log('\n✓ PDF parsing works! You can now test through the web UI at http://localhost:3000');
  console.log('  1. Select "Upload OM" mode');
  console.log('  2. Enter your Anthropic API key');
  console.log('  3. Upload the Skyline Apartments PDF');
}

testPdfParse().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
