# CLAUDE.md - Proforma Deal Analyzer

## Project Overview

This is a **multifamily real estate proforma and deal analyzer** built with Next.js. It helps investors quickly analyze apartment building acquisitions using napkin math, uploaded offering memorandums (OMs), or manual entry.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + custom CSS variables (dark theme)
- **Charts**: Recharts
- **PDF Parsing**: pdf-parse
- **Excel Parsing**: xlsx
- **AI Integration**: Google Gemini API (for document parsing)

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Main app page with mode switching
│   ├── globals.css        # All styling (CSS variables, components)
│   └── api/
│       └── parse-document/
│           └── route.ts   # Gemini API endpoint for OM parsing
├── components/
│   ├── NapkinCalculator.tsx   # Quick napkin math calculator
│   ├── ManualEntry.tsx        # Build proforma from scratch
│   ├── FileUpload.tsx         # Upload OM (PDF/Excel)
│   ├── OverviewTab.tsx        # Detailed analysis view
│   ├── DealEvaluationTab.tsx  # Due diligence view
│   ├── InputField.tsx         # Reusable input with currency formatting
│   ├── MetricCard.tsx         # Display metric boxes
│   └── ApiKeyInput.tsx        # Gemini API key management
├── lib/
│   ├── calculations.ts    # All financial calculations
│   └── prompts.ts         # AI prompts for document parsing
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    └── format.ts          # Currency/percent formatting
```

## Key Concepts

### Three Entry Modes
1. **Quick Calculator (Napkin)**: Fast analysis with units, rent, expense ratio
2. **Upload OM**: Parse PDFs/Excel with Gemini AI
3. **Build Proforma**: Manual entry with line-item expenses

### Financial Calculations

All calculations are in `src/lib/calculations.ts`:

- **Cap Rate**: NOI / Purchase Price
- **Cash on Cash (IO)**: (NOI - Annual Interest) / Equity
- **Cash on Cash (Amort)**: (NOI - Annual Debt Service) / Equity
- **DSCR**: NOI / Debt Service
- **Debt Yield**: NOI / Loan Amount

### IO vs Amortizing Comparison

The napkin calculator shows both scenarios side-by-side:
- **Interest Only**: Loan Amount × Interest Rate (for hold period)
- **Amortizing**: Full P+I payment (for refi scenario)

### Market Expense Ratios

Pre-set expense ratios by market:
- FL East: 50%
- FL West: 40%
- West Coast: 38%
- Austin: 40%
- Houston: 50%
- Midwest: 45%

## Styling Guidelines

All styles are in `globals.css` using CSS variables:

```css
--bg-primary: #0a0f1a;      /* Main background */
--bg-card: #1f2937;          /* Card backgrounds */
--accent-green: #10b981;     /* Positive values */
--accent-red: #ef4444;       /* Negative values */
--accent-blue: #3b82f6;      /* Primary accent */
--accent-cyan: #06b6d4;      /* Info/cap rate */
```

### Component Classes
- `.card` - Container cards
- `.result-box` - Summary metric boxes
- `.output-box` - Calculated/display values (dashed border)
- `.input-field` - Editable inputs
- `.chip` - Selection buttons (market ratios)
- `.data-table` - Tables (offer window, etc.)

## Currency Formatting

The `InputField` component auto-formats currency:
- Fields with `prefix="$"` show commas (e.g., `$6,700,000`)
- On focus: shows raw number for editing
- On blur: formats with commas

## API Integration

### Gemini Document Parsing

Endpoint: `POST /api/parse-document`

```typescript
// FormData payload
formData.append('apiKey', geminiApiKey);
formData.append('file', pdfFile);
```

Uses `gemini-2.5-flash` model to extract:
- Property details (name, address, units, SF)
- Rent roll
- Operating expenses
- Financial projections

API key stored in localStorage as `gemini_api_key`.

## Common Tasks

### Adding a New Metric
1. Add calculation to `src/lib/calculations.ts`
2. Add to `calc` useMemo in component
3. Display in UI with appropriate color coding

### Modifying Expense Ratios
Edit `MARKET_EXPENSE_RATIOS` in `NapkinCalculator.tsx`

### Changing Color Thresholds
Edit `getColor()` function in `NapkinCalculator.tsx`:
```typescript
if (metric === 'coc') return value >= 10 ? 'positive' : value >= 6 ? 'warning' : 'negative';
if (metric === 'dscr') return value >= 1.25 ? 'positive' : value >= 1.0 ? 'warning' : 'negative';
```

## Running the Project

```bash
npm run dev    # Development server on localhost:3000
npm run build  # Production build
```

## Data Flow

1. User enters inputs (units, rent, price, etc.)
2. `useMemo` recalculates all derived values
3. Components display with appropriate formatting/colors
4. Changes propagate instantly (no submit button)
