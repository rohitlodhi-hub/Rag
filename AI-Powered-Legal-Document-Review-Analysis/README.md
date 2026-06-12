# LexLens — AI-Powered Legal Document Review & Analysis

**LexLens** is a single-session, stateless web application designed to help users upload legal documents, specify their jurisdiction, and receive a structured, plain-language AI analysis of risks, key clauses, and obligations.

The application uses **Next.js 14/16 (App Router)** and **Tailwind CSS v4** to build a modern dark-themed glassmorphism interface styled after the Lovable design system.

---

## Features

- **Document Parsing:** Upload `.pdf` and `.docx` files up to **10MB** for instant local parsing (via `pdf-parse` direct paths and `mammoth`).
- **Jurisdiction Context Selector:** Dynamic Country → State/Province dropdown menus (supporting US, India, UK, Canada, Australia) to scope analysis to local common laws and practices.
- **AI Analysis Engine:** Connects with the **Gemini 2.0 Flash** API to stream structured analysis, highlighting:
  - Document Type identification.
  - 3–5 sentence plain-language summary.
  - key clauses descriptions.
  - Risk flags (Low/Medium/High severity).
  - Obligations checklist.
  - Jurisdiction-specific legal notes.
  - Final safety verdict (Safe, Review Needed, High Risk).
- **Aesthetic UI/UX:** A frosted glassmorphism interface using custom card components, a fixed dark purple cosmic gradient background, and a subtle film-grain texture.
- **IP-based Rate Limiting:** Enforces a clean 5 requests/hour per IP rate limit natively inside API route handlers.
- **Fault-Tolerant Errors:** Clean propagation of PDF worker issues and Gemini 429 quota limits directly to client-facing warning banners.

---

## Project Structure

```
AI-Powered-Legal-Document-Review-Analysis/
├── lexlens/                  # Main Next.js workspace
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/      # Core AI analysis stream endpoint
│   │   ├── globals.css       # Tailwind v4 configuration + cosmic background
│   │   ├── layout.tsx        # Base template (contains noise grain overlay)
│   │   └── page.tsx          # Client-side home layout & state reducer
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx    # Lovable-styled buttons (inset shadow)
│   │   │   └── Card.tsx      # Frosted glass card wrappers
│   │   └── JurisdictionSelector.tsx
│   ├── lib/
│   │   ├── extractText.ts    # Document text extraction (pdf/docx)
│   │   ├── jurisdictions.ts  # Jurisdiction data models
│   │   ├── rateLimit.ts      # In-memory IP rate limiter
│   │   └── utils.ts          # Tailwind cn utility helper
│   ├── public/               # Static assets (contains background image)
│   └── types/                # Typescript structures
├── Docs/
│   └── LEXLENS_PRD.md        # Product Requirements Document
├── DESIGN.md                 # Lovable style guidelines
└── .gitignore                # Root gitignore rules
```

---

## Local Setup

### 1. Configure Environment Variables
Create a `.env.local` file inside the `lexlens/` directory (already ignored by git) and add your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Run the Development Server
Navigate into the `lexlens` directory, install packages, and start Next.js:
```bash
cd lexlens
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
