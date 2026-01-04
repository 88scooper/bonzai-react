// Server component layout - route segment config must be in server component for Next.js 16
// This prevents Next.js from trying to statically generate this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

// Explicitly prevent static generation by returning empty array
export function generateStaticParams() {
  return [];
}

export default function PortfolioSummaryLayout({ children }) {
  return children;
}

