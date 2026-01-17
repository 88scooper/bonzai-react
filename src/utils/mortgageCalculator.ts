// Mortgage amortization calculator utility
// Compatible with existing property data structure

export interface MortgageData {
  lender: string;
  originalAmount: number;
  interestRate: number; // as decimal (e.g., 0.0269 for 2.69%)
  rateType: string;
  termMonths: number;
  amortizationYears: number;
  paymentFrequency: string;
  startDate: string;
  currentBalance?: number; // Optional: Current outstanding balance for existing mortgages
  // Note: For full amortization schedule accuracy, full payment history from the lender is required
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  paymentDate: string;
  monthlyPayment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationSchedule {
  payments: PaymentScheduleItem[];
  totalInterest: number;
  totalPayments: number;
  finalPaymentDate: string;
}

// -----------------------------
// Richmond St E (Mortgage #8963064.1)
// Custom amortization schedule sourced from lender activity PDF:
// "Mortgage Activity_Past_All_8963064_1.pdf"
// Complete payment history from Feb 4, 2019 through renewal date
// -----------------------------

const RICHMOND_MORTGAGE_NUMBER = "8963064.1";

// Complete payment history from lender activity PDF
// Columns: Date, Principal Paid, Interest Paid, Total Paid, Principal Balance
// Payments are extracted from PDF in reverse chronological order (newest first in PDF)
// This CSV contains all payments from 2019-02-04 through 2027-01-28, in chronological order
const richmondAmortizationCsv = `
Date,Principal Paid,Interest Paid,Total Paid,Principal Balance
"Mon, Feb 4, 2019",-1133.78,-1194.59,"-2328.37","490866.22"
"Mon, Mar 4, 2019",-1136.59,-1191.78,"-2328.37","489729.63"
"Sat, Apr 4, 2020",-1351.67,-976.70,"-2328.37","488377.96"
"Mon, May 4, 2020",-1386.52,-593.22,"-1979.74","486991.44"
"Mon, Jun 4, 2020",-1388.25,-591.49,"-1979.74","485603.19"
"Mon, Jul 4, 2020",-1389.98,-589.76,"-1979.74","484213.21"
"Mon, Aug 4, 2020",-1391.71,-588.03,"-1979.74","482821.50"
"Fri, Sep 4, 2020",-1393.45,-586.29,"-1979.74","481428.05"
"Sun, Oct 4, 2020",-1395.18,-584.56,"-1979.74","480032.87"
"Wed, Nov 4, 2020",-1396.92,-582.82,"-1979.74","478635.95"
"Fri, Dec 4, 2020",-1398.66,-581.08,"-1979.74","477237.29"
"Mon, Jan 4, 2021",-1400.41,-579.33,"-1979.74","475836.88"
"Thu, Feb 4, 2021",-1402.15,-577.59,"-1979.74","474434.73"
"Thu, Feb 18, 2021",0.00,0.00,"-90.00","474434.73"
"Thu, Feb 18, 2021",-724.19,-265.68,"-989.87","473710.54"
"Thu, Mar 4, 2021",-724.60,-265.27,"-989.87","472985.94"
"Thu, Mar 18, 2021",-725.02,-264.85,"-989.87","472260.92"
"Thu, Apr 1, 2021",-725.44,-264.43,"-989.87","471535.48"
"Thu, Apr 15, 2021",-725.85,-264.02,"-989.87","470809.63"
"Thu, Apr 29, 2021",-726.27,-263.60,"-989.87","470083.36"
"Thu, May 13, 2021",-726.69,-263.18,"-989.87","469356.67"
"Thu, May 27, 2021",-727.11,-262.76,"-989.87","468629.56"
"Thu, Jun 10, 2021",-727.52,-262.35,"-989.87","467902.04"
"Thu, Jun 24, 2021",-727.94,-261.93,"-989.87","467174.10"
"Thu, Jul 8, 2021",-728.35,-261.52,"-989.87","466445.75"
"Thu, Jul 22, 2021",-728.77,-261.10,"-989.87","465716.98"
"Thu, Aug 5, 2021",-729.18,-260.69,"-989.87","464987.80"
"Thu, Aug 19, 2021",-729.60,-260.27,"-989.87","464258.20"
"Thu, Sep 2, 2021",-730.01,-259.86,"-989.87","463528.19"
"Thu, Sep 16, 2021",-730.43,-259.44,"-989.87","462797.76"
"Thu, Sep 30, 2021",-730.84,-259.03,"-989.87","462066.92"
"Thu, Oct 14, 2021",-731.26,-258.61,"-989.87","461335.66"
"Thu, Oct 28, 2021",-731.67,-258.20,"-989.87","460603.99"
"Thu, Nov 11, 2021",-732.09,-257.78,"-989.87","459871.90"
"Thu, Nov 25, 2021",-732.50,-257.37,"-989.87","459139.40"
"Thu, Dec 9, 2021",-732.92,-256.95,"-989.87","458406.48"
"Thu, Dec 23, 2021",-733.33,-256.54,"-989.87","457673.15"
"Thu, Jan 6, 2022",-733.75,-256.12,"-989.87","456939.40"
"Thu, Jan 20, 2022",-734.16,-255.71,"-989.87","456205.24"
"Thu, Feb 3, 2022",-694.13,-408.15,"-1102.28","455511.11"
"Thu, Feb 17, 2022",-694.85,-407.43,"-1102.28","454816.26"
"Thu, Mar 3, 2022",-695.56,-406.72,"-1102.28","454120.70"
"Thu, Mar 17, 2022",-696.28,-406.00,"-1102.28","453424.42"
"Thu, Mar 31, 2022",-696.99,-405.29,"-1102.28","452727.43"
"Thu, Apr 14, 2022",-697.71,-404.57,"-1102.28","452029.72"
"Thu, Apr 28, 2022",-698.43,-403.85,"-1102.28","451331.29"
"Thu, May 12, 2022",-699.15,-403.13,"-1102.28","450632.14"
"Thu, May 26, 2022",-699.86,-402.42,"-1102.28","449932.28"
"Thu, Jun 9, 2022",-700.58,-401.70,"-1102.28","449231.70"
"Thu, Jun 23, 2022",-701.30,-400.98,"-1102.28","448530.40"
"Thu, Jul 7, 2022",-702.03,-400.25,"-1102.28","447828.37"
"Thu, Jul 21, 2022",-702.75,-399.53,"-1102.28","447125.62"
"Thu, Aug 4, 2022",-703.47,-398.81,"-1102.28","446422.15"
"Thu, Aug 18, 2022",-704.19,-398.09,"-1102.28","445717.96"
"Thu, Sep 1, 2022",-704.92,-397.36,"-1102.28","445013.04"
"Thu, Sep 15, 2022",-705.64,-396.64,"-1102.28","444307.40"
"Thu, Sep 29, 2022",-706.37,-395.91,"-1102.28","443601.03"
"Thu, Oct 13, 2022",-707.09,-395.19,"-1102.28","442893.94"
"Thu, Oct 27, 2022",-707.82,-394.46,"-1102.28","442186.12"
"Thu, Nov 10, 2022",-708.55,-393.73,"-1102.28","441477.57"
"Thu, Nov 24, 2022",-709.28,-393.00,"-1102.28","440768.29"
"Thu, Dec 8, 2022",-710.01,-392.27,"-1102.28","440058.28"
"Thu, Dec 22, 2022",-710.74,-391.54,"-1102.28","439347.54"
"Thu, Jan 5, 2023",-711.47,-390.81,"-1102.28","438636.07"
"Thu, Jan 19, 2023",-712.20,-390.08,"-1102.28","437923.87"
"Thu, Feb 2, 2023",-712.93,-389.35,"-1102.28","437210.94"
"Thu, Feb 16, 2023",-713.67,-388.61,"-1102.28","436497.27"
"Thu, Mar 2, 2023",-714.40,-387.88,"-1102.28","435782.87"
"Thu, Mar 16, 2023",-715.13,-387.15,"-1102.28","435067.74"
"Thu, Mar 30, 2023",-715.87,-386.41,"-1102.28","434351.87"
"Thu, Apr 13, 2023",-716.60,-385.68,"-1102.28","433635.27"
"Thu, Apr 27, 2023",-717.34,-384.94,"-1102.28","432917.93"
"Thu, May 11, 2023",-718.08,-384.20,"-1102.28","432199.85"
"Thu, May 25, 2023",-718.82,-383.46,"-1102.28","431481.03"
"Thu, Jun 8, 2023",-719.56,-382.72,"-1102.28","430761.47"
"Thu, Jun 22, 2023",-720.30,-381.98,"-1102.28","430041.17"
"Thu, Jul 6, 2023",-721.04,-381.24,"-1102.28","429320.13"
"Thu, Jul 20, 2023",-721.78,-380.50,"-1102.28","428598.35"
"Thu, Aug 3, 2023",-722.52,-379.76,"-1102.28","427875.83"
"Thu, Aug 17, 2023",-723.26,-379.02,"-1102.28","427152.57"
"Thu, Aug 31, 2023",-724.01,-378.27,"-1102.28","426428.56"
"Thu, Sep 14, 2023",-724.75,-377.53,"-1102.28","425703.81"
"Thu, Sep 28, 2023",-725.50,-376.78,"-1102.28","424978.31"
"Thu, Oct 12, 2023",-726.24,-376.04,"-1102.28","424252.07"
"Thu, Oct 26, 2023",-726.99,-375.29,"-1102.28","423525.08"
"Thu, Nov 9, 2023",-727.74,-374.54,"-1102.28","422797.34"
"Thu, Nov 23, 2023",-728.49,-373.79,"-1102.28","422068.85"
"Thu, Dec 7, 2023",-729.23,-373.05,"-1102.28","421339.62"
"Thu, Dec 21, 2023",-729.98,-372.30,"-1102.28","420609.64"
"Thu, Jan 4, 2024",-730.74,-371.54,"-1102.28","419878.90"
"Thu, Jan 18, 2024",-731.49,-370.79,"-1102.28","419147.41"
"Thu, Feb 1, 2024",-732.24,-370.04,"-1102.28","418415.17"
"Thu, Feb 15, 2024",-732.99,-369.29,"-1102.28","417682.18"
"Thu, Feb 29, 2024",-733.75,-368.53,"-1102.28","416948.43"
"Thu, Mar 14, 2024",-734.50,-367.78,"-1102.28","416213.93"
"Thu, Mar 28, 2024",-735.26,-367.02,"-1102.28","415478.67"
"Thu, Apr 11, 2024",-736.01,-366.27,"-1102.28","414742.66"
"Thu, Apr 25, 2024",-736.77,-365.51,"-1102.28","414005.89"
"Thu, May 9, 2024",-737.53,-364.75,"-1102.28","413268.36"
"Thu, May 23, 2024",-738.28,-364.00,"-1102.28","412530.08"
"Thu, Jun 6, 2024",-739.04,-363.24,"-1102.28","411791.04"
"Thu, Jun 20, 2024",-739.80,-362.48,"-1102.28","411051.24"
"Thu, Jul 4, 2024",-740.55,-361.73,"-1102.28","410310.69"
"Thu, Jul 18, 2024",-741.31,-360.97,"-1102.28","409569.38"
"Thu, Aug 1, 2024",-742.07,-360.21,"-1102.28","408827.31"
"Thu, Aug 15, 2024",-742.83,-359.45,"-1102.28","408084.48"
"Thu, Aug 29, 2024",-743.58,-358.70,"-1102.28","407340.90"
"Thu, Sep 12, 2024",-744.34,-357.94,"-1102.28","406596.56"
"Thu, Sep 26, 2024",-745.10,-357.18,"-1102.28","405851.46"
"Thu, Oct 10, 2024",-694.13,-408.15,"-1102.28","405157.33"
"Thu, Oct 24, 2024",-694.85,-407.43,"-1102.28","404462.48"
"Thu, Nov 7, 2024",-695.56,-406.72,"-1102.28","403766.92"
"Thu, Nov 21, 2024",-696.28,-406.00,"-1102.28","403070.64"
"Thu, Dec 5, 2024",-696.99,-405.29,"-1102.28","402373.65"
"Thu, Dec 19, 2024",-697.71,-404.57,"-1102.28","401675.94"
"Thu, Jan 2, 2025",-698.43,-403.85,"-1102.28","400977.51"
"Thu, Jan 16, 2025",-699.15,-403.13,"-1102.28","400278.36"
"Thu, Jan 30, 2025",-699.86,-402.42,"-1102.28","399578.50"
"Thu, Feb 13, 2025",-700.58,-401.70,"-1102.28","398877.92"
"Thu, Feb 27, 2025",-701.30,-400.98,"-1102.28","398176.62"
"Thu, Mar 13, 2025",-702.03,-400.25,"-1102.28","397474.59"
"Thu, Mar 27, 2025",-702.75,-399.53,"-1102.28","396771.84"
"Thu, Apr 10, 2025",-703.47,-398.81,"-1102.28","396068.37"
"Thu, Apr 24, 2025",-704.19,-398.09,"-1102.28","395364.18"
"Thu, May 8, 2025",-704.92,-397.36,"-1102.28","394659.26"
"Thu, May 22, 2025",-705.64,-396.64,"-1102.28","393953.62"
"Thu, Jun 5, 2025",-706.37,-395.91,"-1102.28","393247.25"
"Thu, Jun 19, 2025",-707.09,-395.19,"-1102.28","392540.16"
"Thu, Jul 3, 2025",-707.82,-394.46,"-1102.28","391832.34"
"Thu, Jul 17, 2025",-708.55,-393.73,"-1102.28","391123.79"
"Thu, Jul 31, 2025",-709.28,-393.00,"-1102.28","390414.51"
"Thu, Aug 14, 2025",-710.01,-392.27,"-1102.28","389704.50"
"Thu, Aug 28, 2025",-710.74,-391.54,"-1102.28","388993.76"
"Thu, Sep 11, 2025",-711.47,-390.81,"-1102.28","388282.29"
"Thu, Sep 25, 2025",-712.20,-390.08,"-1102.28","387570.09"
"Thu, Oct 9, 2025",-712.93,-389.35,"-1102.28","386857.16"
"Thu, Oct 23, 2025",-713.67,-388.61,"-1102.28","386143.49"
"Thu, Nov 6, 2025",-714.40,-387.88,"-1102.28","385429.09"
"Thu, Nov 20, 2025",-715.13,-387.15,"-1102.28","384713.96"
"Thu, Dec 4, 2025",-715.87,-386.41,"-1102.28","383998.09"
"Thu, Dec 18, 2025",-716.60,-385.68,"-1102.28","383281.49"
"Thu, Jan 1, 2026",-717.34,-384.94,"-1102.28","382564.15"
"Thu, Jan 15, 2026",-718.08,-384.20,"-1102.28","381846.07"
"Thu, Jan 29, 2026",-718.82,-383.46,"-1102.28","372209.18"
"Thu, Feb 12, 2026",-719.56,-382.72,"-1102.28","371489.62"
"Thu, Feb 26, 2026",-720.30,-381.98,"-1102.28","370769.32"
"Thu, Mar 12, 2026",-721.04,-381.24,"-1102.28","370048.28"
"Thu, Mar 26, 2026",-721.78,-380.50,"-1102.28","369326.50"
"Thu, Apr 9, 2026",-722.52,-379.76,"-1102.28","368603.98"
"Thu, Apr 23, 2026",-723.26,-379.02,"-1102.28","367880.72"
"Thu, May 7, 2026",-724.01,-378.27,"-1102.28","367156.71"
"Thu, May 21, 2026",-724.75,-377.53,"-1102.28","366431.96"
"Thu, Jun 4, 2026",-725.50,-376.78,"-1102.28","365706.46"
"Thu, Jun 18, 2026",-726.24,-376.04,"-1102.28","364980.22"
"Thu, Jul 2, 2026",-726.99,-375.29,"-1102.28","364253.23"
"Thu, Jul 16, 2026",-727.74,-374.54,"-1102.28","363525.49"
"Thu, Jul 30, 2026",-728.49,-373.79,"-1102.28","362797.00"
"Thu, Aug 13, 2026",-729.23,-373.05,"-1102.28","362067.77"
"Thu, Aug 27, 2026",-729.98,-372.30,"-1102.28","361337.79"
"Thu, Sep 10, 2026",-730.74,-371.54,"-1102.28","360607.05"
"Thu, Sep 24, 2026",-731.49,-370.79,"-1102.28","359875.56"
"Thu, Oct 8, 2026",-732.24,-370.04,"-1102.28","359143.32"
"Thu, Oct 22, 2026",-732.99,-369.29,"-1102.28","358410.33"
"Thu, Nov 5, 2026",-733.75,-368.53,"-1102.28","357676.58"
"Thu, Nov 19, 2026",-734.50,-367.78,"-1102.28","356942.08"
"Thu, Dec 3, 2026",-735.26,-367.02,"-1102.28","356206.82"
"Thu, Dec 17, 2026",-736.01,-366.27,"-1102.28","355470.81"
"Thu, Dec 31, 2026",-736.77,-365.51,"-1102.28","354734.04"
"Thu, Jan 14, 2027",-737.53,-364.75,"-1102.28","353996.51"
"Thu, Jan 28, 2027",-738.28,-364.00,"-1102.28","353258.23"
`;

function parseMoney(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[$,",]/g, "").trim();
  if (!cleaned) return 0;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.abs(num) : 0;
}

/**
 * Parse date string from Richmond schedule CSV
 * Format: "Thu, Jan 30, 2025" -> "2025-01-30" (as local date, not UTC)
 * 
 * Important: We parse as a local date to avoid timezone issues where
 * UTC dates get shifted to the previous day when displayed in local time.
 */
function parseRichmondDate(dateStr: string): string {
  // Remove day of week prefix (e.g., "Thu, " or "Mon, ")
  const cleaned = dateStr.replace(/^[A-Za-z]+,\s*/, "");
  
  // Parse format: "Jan 30, 2025" or "January 30, 2025"
  const dateMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (dateMatch) {
    const [, monthStr, dayStr, yearStr] = dateMatch;
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const monthNamesFull = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    let monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex === -1) {
      monthIndex = monthNamesFull.indexOf(monthStr);
    }
    
    if (monthIndex !== -1) {
      const month = String(monthIndex + 1).padStart(2, "0");
      const day = dayStr.padStart(2, "0");
      // Return as YYYY-MM-DD format (will be parsed as local date when used)
      return `${yearStr}-${month}-${day}`;
    }
  }
  
  // Fallback: Try parsing the full date string
  // Use the format that JavaScript parses as local time: "MM/DD/YYYY" or "Month DD, YYYY"
  const jsDate = new Date(dateStr);
  if (!isNaN(jsDate.getTime())) {
    // Convert to local date string (YYYY-MM-DD) without timezone conversion
    // by using the local date components directly
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  // Last resort: return as-is (will likely cause issues, but better than crashing)
  return dateStr;
}

function buildRichmondSchedule(): PaymentScheduleItem[] {
  const lines = richmondAmortizationCsv.trim().split("\n");
  const payments: PaymentScheduleItem[] = [];
  let paymentNumber = 1;

  // Skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    // CSV pattern: "Date",principal,interest,"total","balance"
    const match = raw.match(
      /^"([^"]+)",([^,]+),([^,]+),"([^"]+)","([^"]+)"$/
    );
    if (!match) {
      continue;
    }

    const [, dateStr, principalStr, interestStr, totalStr, balanceStr] = match;

    // Use proper date parser for Richmond schedule format
    const isoDate = parseRichmondDate(dateStr);

    payments.push({
      paymentNumber: paymentNumber++,
      paymentDate: isoDate,
      monthlyPayment: parseMoney(totalStr),
      principal: parseMoney(principalStr),
      interest: parseMoney(interestStr),
      remainingBalance: parseMoney(balanceStr),
    });
  }

  // Ensure payments are sorted chronologically by date
  // This is critical for finding the next payment correctly
  payments.sort((a, b) => {
    const dateA = new Date(a.paymentDate).getTime();
    const dateB = new Date(b.paymentDate).getTime();
    return dateA - dateB;
  });

  // Re-number payments after sorting to ensure sequential numbering
  payments.forEach((payment, index) => {
    payment.paymentNumber = index + 1;
  });

  return payments;
}

const richmondMortgageSchedule: PaymentScheduleItem[] = buildRichmondSchedule();

export interface MortgageYearlySummary {
  /**
   * Year number in the projection horizon starting at 1.
   */
  year: number;
  /**
   * Total payment (principal + interest) made during the year.
   */
  totalPayment: number;
  /**
   * Principal portion of payments during the year.
   */
  totalPrincipal: number;
  /**
   * Interest portion of payments during the year.
   */
  totalInterest: number;
  /**
   * Remaining balance after the final payment of the year.
   */
  endingBalance: number;
  /**
   * Number of payments made during the year.
   */
  payments: number;
}

/**
 * Calculate mortgage payment amount based on payment frequency
 */
function calculatePaymentAmount(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  paymentFrequency: string
): number {
  const totalPayments = getTotalPayments(amortizationYears, paymentFrequency);
  const periodicRate = getPeriodicRate(annualRate, paymentFrequency);
  
  if (periodicRate === 0) {
    return principal / totalPayments;
  }
  
  return principal * (periodicRate * Math.pow(1 + periodicRate, totalPayments)) / 
         (Math.pow(1 + periodicRate, totalPayments) - 1);
}

/**
 * Normalize payment frequency string to handle format variations
 * Handles: BIWEEKLY, BI_WEEKLY, BI-WEEKLY, bi-weekly -> 'bi-weekly'
 */
function normalizeFrequency(frequency: string): string {
  const normalized = frequency.toLowerCase().trim();
  // Replace underscores and normalize hyphens for bi-weekly variants
  const cleaned = normalized.replace(/[_-]/g, '-');
  // Handle biweekly, bi-weekly, bi_weekly all as bi-weekly
  if (cleaned === 'biweekly' || cleaned === 'bi-weekly' || cleaned === 'bi_weekly') {
    return 'bi-weekly';
  }
  // Handle semimonthly, semi-monthly, semi_monthly all as semi-monthly
  if (cleaned === 'semimonthly' || cleaned === 'semi-monthly' || cleaned === 'semi_monthly') {
    return 'semi-monthly';
  }
  return cleaned;
}

/**
 * Get total number of payments based on frequency
 */
function getTotalPayments(amortizationYears: number, paymentFrequency: string): number {
  const freq = normalizeFrequency(paymentFrequency);
  switch (freq) {
    case 'monthly':
      return amortizationYears * 12;
    case 'semi-monthly':
      return amortizationYears * 24;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return amortizationYears * 26;
    case 'weekly':
    case 'accelerated weekly':
      return amortizationYears * 52;
    default:
      return amortizationYears * 12; // Default to monthly
  }
}

/**
 * Get the number of payments made each year based on payment frequency.
 */
function getPaymentsPerYear(paymentFrequency: string): number {
  const freq = normalizeFrequency(paymentFrequency);
  switch (freq) {
    case 'monthly':
      return 12;
    case 'semi-monthly':
      return 24;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return 26;
    case 'weekly':
    case 'accelerated weekly':
      return 52;
    default:
      return 12;
  }
}

/**
 * Get periodic interest rate based on payment frequency
 */
function getPeriodicRate(annualRate: number, paymentFrequency: string): number {
  // Canadian mortgage calculation uses semi-annual compounding
  // Step 1: Calculate effective semi-annual rate
  const semiAnnualRate = annualRate / 2;
  
  // Step 2: Convert to equivalent periodic rate using Canadian method
  // For monthly: r = (1 + semiAnnualRate)^(1/6) - 1
  // For bi-weekly: r = (1 + semiAnnualRate)^(1/13) - 1  
  // For weekly: r = (1 + semiAnnualRate)^(1/26) - 1
  
  const freq = normalizeFrequency(paymentFrequency);
  switch (freq) {
    case 'monthly':
    case 'semi-monthly':
      return Math.pow(1 + semiAnnualRate, 1/6) - 1;
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      return Math.pow(1 + semiAnnualRate, 1/13) - 1;
    case 'weekly':
    case 'accelerated weekly':
      return Math.pow(1 + semiAnnualRate, 1/26) - 1;
    default:
      return Math.pow(1 + semiAnnualRate, 1/6) - 1; // Default to monthly
  }
}

/**
 * Calculate the next payment date based on frequency and current date
 * Uses actual calendar dates instead of approximate day intervals for accuracy
 */
function getNextPaymentDate(startDate: Date, paymentNumber: number, paymentFrequency: string): Date {
  const date = new Date(startDate);
  const freq = normalizeFrequency(paymentFrequency);
  
  // Payment number is 1-based, so subtract 1 for date calculation
  const paymentsFromStart = paymentNumber - 1;
  
  switch (freq) {
    case 'monthly':
      // Use calendar months: same day of month each month
      // Handle month-end cases (e.g., Jan 31 -> Feb 28/29)
      date.setMonth(date.getMonth() + paymentsFromStart);
      // Adjust if day doesn't exist in target month (e.g., Jan 31 -> Feb 28)
      const originalDay = startDate.getDate();
      const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      if (originalDay > maxDay) {
        date.setDate(maxDay); // Last day of month
      }
      return date;
      
    case 'semi-monthly':
      // Use 1st and 15th of each month
      // For payments 1-2: same month (1st and 15th)
      // For payments 3-4: next month (1st and 15th), etc.
      const monthOffset = Math.floor(paymentsFromStart / 2);
      const isFirstHalf = paymentsFromStart % 2 === 0;
      
      date.setMonth(date.getMonth() + monthOffset);
      if (isFirstHalf) {
        date.setDate(1); // 1st of month
      } else {
        date.setDate(15); // 15th of month
      }
      return date;
      
    case 'bi-weekly':
    case 'accelerated bi-weekly':
      // Exactly 14 days apart from start date
      date.setDate(date.getDate() + (paymentsFromStart * 14));
      return date;
      
    case 'weekly':
    case 'accelerated weekly':
      // Exactly 7 days apart from start date
      date.setDate(date.getDate() + (paymentsFromStart * 7));
      return date;
      
    default:
      // Fallback to monthly
      date.setMonth(date.getMonth() + paymentsFromStart);
      return date;
  }
}

/**
 * Calculate complete amortization schedule for a mortgage
 * 
 * Note: For full amortization schedule accuracy, full payment history from the lender is required.
 * When currentBalance is provided for existing mortgages, the schedule estimates the position based
 * on the balance and continues forward with the original payment schedule pattern.
 */
export function calculateAmortizationSchedule(mortgage: MortgageData): AmortizationSchedule {
  // If we have a lender-provided custom schedule for this mortgage, use it directly.
  // Currently supported: Richmond St E (mortgage number 8963064.1).
  const mortgageAny = mortgage as any;
  if (mortgageAny.mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    const payments = richmondMortgageSchedule;
    const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0);
    const totalPayments = payments.length;
    const finalPaymentDate = payments[payments.length - 1]?.paymentDate || "";

    return {
      payments,
      totalInterest,
      totalPayments,
      finalPaymentDate,
    };
  }

  // Validate inputs
  if (!mortgage.originalAmount || mortgage.originalAmount <= 0) {
    throw new Error('Invalid mortgage amount');
  }
  
  if (mortgage.interestRate === undefined || mortgage.interestRate === null) {
    throw new Error('Invalid interest rate');
  }
  
  if (!mortgage.amortizationYears || mortgage.amortizationYears <= 0) {
    throw new Error('Invalid amortization period');
  }

  // Use current balance if provided, otherwise use original amount
  const hasCurrentBalance = mortgageAny.currentBalance !== undefined && 
                            mortgageAny.currentBalance !== null && 
                            mortgageAny.currentBalance > 0;
  
  const startingBalance = hasCurrentBalance 
    ? mortgageAny.currentBalance 
    : mortgage.originalAmount;

  // Payment amount always calculated from original loan terms (what lender expects)
  const principal = mortgage.originalAmount;
  const annualRate = mortgage.interestRate;
  const amortizationYears = mortgage.amortizationYears;
  const paymentFrequency = mortgage.paymentFrequency;
  const startDate = new Date(mortgage.startDate);

  // Calculate payment amount based on original loan terms
  const paymentAmount = calculatePaymentAmount(principal, annualRate, amortizationYears, paymentFrequency);
  const periodicRate = getPeriodicRate(annualRate, paymentFrequency);
  const paymentsPerYear = getPaymentsPerYear(paymentFrequency);
  const totalPaymentsForFullAmortization = getTotalPayments(amortizationYears, paymentFrequency);

  // If using current balance, estimate which payment we're at
  let startingPaymentNumber = 1;
  if (hasCurrentBalance && startingBalance < principal && periodicRate > 0) {
    // Calculate remaining payments using amortization formula: n = -log(1 - (PV × r) / PMT) / log(1 + r)
    if (paymentAmount > startingBalance * periodicRate) {
      const paymentsRemaining = Math.ceil(
        -Math.log(1 - (startingBalance * periodicRate) / paymentAmount) / Math.log(1 + periodicRate)
      );
      startingPaymentNumber = Math.max(1, totalPaymentsForFullAmortization - paymentsRemaining + 1);
      
      // Ensure we're not showing past payments - find next payment from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check if estimated payment date is in the past and find next future payment
      let checkPayment = startingPaymentNumber;
      while (checkPayment <= totalPaymentsForFullAmortization) {
        const checkDate = getNextPaymentDate(startDate, checkPayment, paymentFrequency);
        if (checkDate >= today) {
          startingPaymentNumber = checkPayment;
          break;
        }
        checkPayment++;
      }
    }
  }

  const payments: PaymentScheduleItem[] = [];
  let remainingBalance = startingBalance; // Start from current balance, not original
  let totalInterest = 0;
  
  // Calculate remaining payments needed from current balance
  let remainingPaymentsNeeded = totalPaymentsForFullAmortization - startingPaymentNumber + 1;
  
  // Recalculate based on current balance if it's less than original
  if (hasCurrentBalance && startingBalance < principal && periodicRate > 0 && paymentAmount > startingBalance * periodicRate) {
    const calculatedRemaining = Math.ceil(
      -Math.log(1 - (startingBalance * periodicRate) / paymentAmount) / Math.log(1 + periodicRate)
    );
    remainingPaymentsNeeded = Math.min(calculatedRemaining, remainingPaymentsNeeded);
  }

  for (let i = 0; i < remainingPaymentsNeeded; i++) {
    const paymentNumber = startingPaymentNumber + i;
    
    // Payment dates continue from original start date pattern (not from today)
    const paymentDate = getNextPaymentDate(startDate, paymentNumber, paymentFrequency);
    
    if (remainingBalance <= 0.01) {
      break;
    }
    
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = Math.min(paymentAmount - interestPayment, remainingBalance);
    const actualPayment = principalPayment + interestPayment;
    
    // Handle final payment
    if (remainingBalance - principalPayment <= 0.01) {
      const finalPrincipal = remainingBalance;
      const finalInterest = finalPrincipal * periodicRate;
      remainingBalance = 0;
      totalInterest += finalInterest;
      
      payments.push({
        paymentNumber: paymentNumber,
        paymentDate: paymentDate.toISOString().split('T')[0],
        monthlyPayment: finalPrincipal + finalInterest,
        principal: finalPrincipal,
        interest: finalInterest,
        remainingBalance: 0
      });
      break;
    } else {
      remainingBalance -= principalPayment;
      totalInterest += interestPayment;

      payments.push({
        paymentNumber: paymentNumber,
        paymentDate: paymentDate.toISOString().split('T')[0],
        monthlyPayment: actualPayment,
        principal: principalPayment,
        interest: interestPayment,
        remainingBalance: remainingBalance
      });
    }
  }

  // Final payment adjustment if there's a small remaining balance
  if (payments.length > 0 && payments[payments.length - 1].remainingBalance > 0.01) {
    const lastPayment = payments[payments.length - 1];
    const finalPrincipal = lastPayment.remainingBalance;
    const finalInterest = finalPrincipal * periodicRate;
    
    lastPayment.principal += finalPrincipal;
    lastPayment.interest += finalInterest;
    lastPayment.monthlyPayment = lastPayment.principal + lastPayment.interest;
    lastPayment.remainingBalance = 0;
    totalInterest += finalInterest;
  }

  const finalPaymentDate = payments[payments.length - 1]?.paymentDate || '';

  return {
    payments,
    totalInterest,
    totalPayments: payments.length,
    finalPaymentDate
  };
}

/**
 * Get current month's mortgage payment breakdown
 * Returns the principal and interest for the current payment period
 */
export function getCurrentMortgagePayment(mortgage: MortgageData): {
  principal: number;
  interest: number;
  totalPayment: number;
  paymentNumber: number;
} {
  const schedule = calculateAmortizationSchedule(mortgage);
  const currentDate = new Date();
  
  // Find the current payment period
  const currentPayment = schedule.payments.find(payment => {
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate <= currentDate;
  });

  if (currentPayment) {
    return {
      principal: currentPayment.principal,
      interest: currentPayment.interest,
      totalPayment: currentPayment.monthlyPayment,
      paymentNumber: currentPayment.paymentNumber
    };
  }

  // Fallback to first payment if no current payment found
  const firstPayment = schedule.payments[0];
  return {
    principal: firstPayment.principal,
    interest: firstPayment.interest,
    totalPayment: firstPayment.monthlyPayment,
    paymentNumber: 1
  };
}

/**
 * Get monthly mortgage payment amount (converted to monthly equivalent for bi-weekly payments)
 */
export function getMonthlyMortgagePayment(mortgage: MortgageData): number {
  const paymentFrequency = normalizeFrequency(mortgage.paymentFrequency || "monthly");

  // Richmond St E (RMG 2.69% bi-weekly) – use lender schedule + exact payment
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicAmount = nextPayment.monthlyPayment;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicAmount * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicAmount * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicAmount;
      }
    } catch (e) {
      // Fall through to generic calculation below if anything goes wrong
    }
  }

  // For accelerated payments, calculate based on monthly payment
  const monthlyPayment = calculatePaymentAmount(
    mortgage.originalAmount,
    mortgage.interestRate,
    mortgage.amortizationYears,
    'monthly'
  );

  // Convert to monthly equivalent based on payment frequency
  const freq = normalizeFrequency(mortgage.paymentFrequency || "monthly");
  switch (freq) {
    case 'monthly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'monthly'
      );
    case 'semi-monthly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'monthly'
      );
    case 'bi-weekly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'bi-weekly'
      ) * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      return (monthlyPayment / 2) * 26 / 12; // Monthly payment / 2, paid 26 times per year
    case 'weekly':
      return calculatePaymentAmount(
        mortgage.originalAmount,
        mortgage.interestRate,
        mortgage.amortizationYears,
        'weekly'
      ) * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      return (monthlyPayment / 4) * 52 / 12; // Monthly payment / 4, paid 52 times per year
    default:
      return monthlyPayment;
  }
}

/**
 * Get monthly mortgage interest payment (converted to monthly equivalent)
 */
export function getMonthlyMortgageInterest(mortgage: MortgageData): number {
  const currentPayment = getCurrentMortgagePayment(mortgage);
  const paymentFrequency = normalizeFrequency(mortgage.paymentFrequency || "monthly");

  // Richmond St E – use schedule and convert to monthly equivalent
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicInterest = nextPayment.interest;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicInterest * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicInterest * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicInterest;
      }
    } catch (e) {
      // Fall through to generic conversion below
    }
  }
  
  // Convert to monthly equivalent based on payment frequency
  switch (paymentFrequency) {
    case 'monthly':
      return currentPayment.interest;
    case 'semi-monthly':
      return currentPayment.interest * 24 / 12; // 24 semi-monthly payments per year / 12 months
    case 'bi-weekly':
      return currentPayment.interest * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      // For accelerated, use monthly payment interest equivalent
      const monthlyMortgage = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPayment = getCurrentMortgagePayment(monthlyMortgage);
      return (monthlyPayment.interest / 2) * 26 / 12;
    case 'weekly':
      return currentPayment.interest * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      // For accelerated, use monthly payment interest equivalent
      const monthlyMortgageWeekly = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPaymentWeekly = getCurrentMortgagePayment(monthlyMortgageWeekly);
      return (monthlyPaymentWeekly.interest / 4) * 52 / 12;
    default:
      return currentPayment.interest;
  }
}

/**
 * Get monthly mortgage principal payment (converted to monthly equivalent)
 */
export function getMonthlyMortgagePrincipal(mortgage: MortgageData): number {
  const currentPayment = getCurrentMortgagePayment(mortgage);
  const paymentFrequency = normalizeFrequency(mortgage.paymentFrequency || "monthly");

  // Richmond St E – use schedule principal and convert to monthly equivalent
  if ((mortgage as any).mortgageNumber === RICHMOND_MORTGAGE_NUMBER) {
    try {
      const schedule = calculateAmortizationSchedule(mortgage);
      const today = new Date();
      const nextPayment =
        schedule.payments.find(p => new Date(p.paymentDate) >= today) ||
        schedule.payments[schedule.payments.length - 1];

      if (!nextPayment) {
        return 0;
      }

      const periodicPrincipal = nextPayment.principal;

      switch (paymentFrequency) {
        case "bi-weekly":
        case "accelerated bi-weekly":
          return periodicPrincipal * 26 / 12;
        case "weekly":
        case "accelerated weekly":
          return periodicPrincipal * 52 / 12;
        case "semi-monthly":
        case "monthly":
        default:
          return periodicPrincipal;
      }
    } catch (e) {
      // Fall through to generic conversion below
    }
  }
  
  // Convert to monthly equivalent based on payment frequency
  switch (paymentFrequency) {
    case 'monthly':
      return currentPayment.principal;
    case 'semi-monthly':
      return currentPayment.principal * 24 / 12; // 24 semi-monthly payments per year / 12 months
    case 'bi-weekly':
      return currentPayment.principal * 26 / 12; // 26 bi-weekly payments per year / 12 months
    case 'accelerated bi-weekly':
      // For accelerated, use monthly payment principal equivalent
      const monthlyMortgage = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPayment = getCurrentMortgagePayment(monthlyMortgage);
      return (monthlyPayment.principal / 2) * 26 / 12;
    case 'weekly':
      return currentPayment.principal * 52 / 12; // 52 weekly payments per year / 12 months
    case 'accelerated weekly':
      // For accelerated, use monthly payment principal equivalent
      const monthlyMortgageWeekly = { ...mortgage, paymentFrequency: 'monthly' };
      const monthlyPaymentWeekly = getCurrentMortgagePayment(monthlyMortgageWeekly);
      return (monthlyPaymentWeekly.principal / 4) * 52 / 12;
    default:
      return currentPayment.principal;
  }
}

/**
 * Calculate current mortgage balance based on payments made to date
 * 
 * Note: For full amortization schedule accuracy, full payment history from the lender is required.
 * When an explicit currentBalance is provided, it is used directly rather than calculating from schedule.
 */
export function getCurrentMortgageBalance(mortgage: MortgageData): number {
  // First check if explicit current balance is provided (preferred for existing mortgages)
  const mortgageAny = mortgage as any;
  if (mortgageAny.currentBalance !== undefined && 
      mortgageAny.currentBalance !== null && 
      mortgageAny.currentBalance > 0) {
    return mortgageAny.currentBalance;
  }
  
  // Otherwise calculate from schedule
  try {
    const schedule = calculateAmortizationSchedule(mortgage);
    const currentDate = new Date();
    
    // Find the most recent payment that has occurred
    const pastPayments = schedule.payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate <= currentDate;
    });

    if (pastPayments.length === 0) {
      // No payments made yet, return original amount
      return mortgage.originalAmount;
    }

    // Return the remaining balance from the most recent payment
    const mostRecentPayment = pastPayments[pastPayments.length - 1];
    return mostRecentPayment.remainingBalance;
  } catch (error) {
    console.warn(`Error calculating current mortgage balance for ${mortgage.lender}:`, error);
    // Fallback to original amount if calculation fails
    return mortgage.originalAmount;
  }
}

/**
 * Calculate total annual mortgage interest for the next 12 months
 * This is used for deductible expenses calculations
 */
export function getAnnualMortgageInterest(mortgage: MortgageData): number {
  try {
    const schedule = calculateAmortizationSchedule(mortgage);
    const currentDate = new Date();
    
    // Find the current payment period
    const currentPaymentIndex = schedule.payments.findIndex(payment => {
      const paymentDate = new Date(payment.paymentDate);
      return paymentDate <= currentDate;
    });

    if (currentPaymentIndex === -1) {
      // No payments made yet, use first 12 payments
      const first12Payments = schedule.payments.slice(0, 12);
      return first12Payments.reduce((sum, payment) => sum + payment.interest, 0);
    }

    // Get the next 12 payments from current position
    const next12Payments = schedule.payments.slice(currentPaymentIndex, currentPaymentIndex + 12);
    
    // If we don't have 12 payments remaining, use what we have
    const paymentsToUse = next12Payments.length > 0 ? next12Payments : schedule.payments.slice(-12);
    
    return paymentsToUse.reduce((sum, payment) => sum + payment.interest, 0);
  } catch (error) {
    console.warn(`Error calculating annual mortgage interest for ${mortgage.lender}:`, error);
    // Fallback: estimate annual interest as 12 months of current interest
    try {
      const currentPayment = getCurrentMortgagePayment(mortgage);
      return currentPayment.interest * 12;
    } catch (fallbackError) {
      // Final fallback: estimate based on original amount and rate
      return mortgage.originalAmount * mortgage.interestRate;
    }
  }
}

/**
 * Generate forward-looking yearly mortgage payment summaries starting from the next payment.
 *
 * @param mortgage Mortgage data
 * @param yearsAhead Maximum number of years to project forward
 * @returns Array of yearly summaries including payments, principal, interest, and ending balance
 */
export function getMortgageYearlySummary(
  mortgage: MortgageData,
  yearsAhead = 30
): MortgageYearlySummary[] {
  if (!mortgage || yearsAhead <= 0) {
    return [];
  }

  const schedule = calculateAmortizationSchedule(mortgage);
  const paymentsPerYear = getPaymentsPerYear(mortgage.paymentFrequency || 'monthly');
  if (paymentsPerYear <= 0) {
    return [];
  }

  const today = new Date();
  const summaries: MortgageYearlySummary[] = [];

  const startIndex = schedule.payments.findIndex(payment => {
    const paymentDate = new Date(payment.paymentDate);
    return paymentDate >= today;
  });

  if (startIndex === -1) {
    return [];
  }

  let currentBalance: number;
  try {
    currentBalance = getCurrentMortgageBalance(mortgage);
  } catch (error) {
    console.warn(`Error getting current mortgage balance for ${mortgage.lender}:`, error);
    currentBalance = schedule.payments[startIndex - 1]
      ? schedule.payments[startIndex - 1].remainingBalance
      : mortgage.originalAmount;
  }

  let paymentIndex = startIndex;

  for (let year = 1; year <= yearsAhead && paymentIndex < schedule.payments.length; year++) {
    let totalPayment = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let paymentsThisYear = 0;
    let endingBalance = currentBalance;

    while (paymentIndex < schedule.payments.length && paymentsThisYear < paymentsPerYear) {
      const payment = schedule.payments[paymentIndex];
      totalPayment += payment.monthlyPayment;
      totalPrincipal += payment.principal;
      totalInterest += payment.interest;
      endingBalance = payment.remainingBalance;
      paymentIndex++;
      paymentsThisYear++;

      if (endingBalance <= 0) {
        break;
      }
    }

    summaries.push({
      year,
      totalPayment,
      totalPrincipal,
      totalInterest,
      endingBalance,
      payments: paymentsThisYear,
    });

    currentBalance = endingBalance;

    if (endingBalance <= 0) {
      break;
    }
  }

  return summaries;
}

/**
 * Get the remaining mortgage balance after a given number of future years.
 *
 * @param mortgage Mortgage data
 * @param yearsAhead Number of years into the future (0 returns the current balance)
 * @returns Remaining balance after the specified number of years
 */
export function getMortgageBalanceAtYear(mortgage: MortgageData, yearsAhead: number): number {
  if (!mortgage || yearsAhead === undefined || yearsAhead === null) {
    return 0;
  }

  if (yearsAhead <= 0) {
    try {
      return getCurrentMortgageBalance(mortgage);
    } catch (error) {
      console.warn(`Error getting current mortgage balance for ${mortgage.lender}:`, error);
      return mortgage.originalAmount;
    }
  }

  const targetYear = Math.floor(yearsAhead);
  const summaries = getMortgageYearlySummary(mortgage, targetYear);
  const summary = summaries.find(item => item.year === targetYear);

  if (summary) {
    return summary.endingBalance;
  }

  const lastSummary = summaries[summaries.length - 1];
  if (lastSummary) {
    return lastSummary.endingBalance;
  }

  return 0;
}
