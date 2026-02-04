export const pageGuideConfig = {
  '/portfolio-summary': {
    name: 'Portfolio Summary',
    bullets: [
      'Ditch the spreadsheets. See your entire investment ecosystem in one place',
      'Wealth tracking, simplified. Instantly see how your wealth is growing with real-time equity and cash flow'
    ]
  },
  '/my-properties': {
    name: 'My Properties',
    bullets: [
      'Your property command center. Organize everything from rental income to maintenance tasks in seconds',
      'Dive deep into the data. Click any card to uncover detailed analytics and performance insights'
    ]
  },
  '/my-properties/': { // Dynamic route pattern for property detail pages
    name: 'Property Details',
    bullets: [
      'Dive deep into this property\'s comprehensive details',
      'Review financial metrics, tenants, expenses, and mortgage information',
      'Edit property information and track historical data'
    ],
    isDynamic: true,
    pattern: /^\/my-properties\/[^/]+$/
  },
  '/data': {
    name: 'Data',
    bullets: [
      'Access your centralized database for all property records',
      'Manage expenses, documents, and historical data',
      'Enjoy secure cloud storage with automatic sync across devices'
    ]
  },
  '/analytics': {
    name: 'Analytics',
    bullets: [
      'Discover advanced analytics and insights for your portfolio',
      'Track trends, performance metrics, and financial projections',
      'Make data-driven investment decisions with confidence'
    ]
  },
  '/calculator': {
    name: 'Calculators',
    bullets: [
      'Use financial calculators for mortgages and refinancing',
      'Calculate break penalties and payment schedules',
      'Analyze refinancing opportunities and scenarios'
    ]
  },
  '/mortgages': {
    name: 'Mortgages',
    bullets: [
      'Manage all mortgages across your portfolio',
      'View detailed amortization schedules',
      'Track payments and analyze mortgage performance'
    ]
  },
  '/calendar': {
    name: 'Calendar',
    bullets: [
      'View and manage important dates and deadlines',
      'Track lease renewals, mortgage payments, and events',
      'Stay organized with your property management schedule'
    ]
  }
};
