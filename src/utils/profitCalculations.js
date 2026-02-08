/**
 * Calculate Total Profit for a property investment
 * 
 * Formula: Cumulative Cash Flow + Equity Growth + (Sale Proceeds - Selling Costs) - Initial Investment
 * 
 * @param {Object} property - Property object
 * @param {Object} forecast - Forecast data from generateForecast
 * @param {number} years - Holding period in years
 * @param {string} analysisMode - 'cash-flow' | 'equity'
 * @param {Object} assumptions - Forecast assumptions (needed for cash-flow mode to calculate property value)
 * @param {number} sellingCostsPercent - Selling costs as percentage (default: 5%)
 * @returns {number} Total profit in dollars
 */
export function calculateTotalProfit(property, forecast, years, analysisMode = 'cash-flow', assumptions = {}, sellingCostsPercent = 5.0) {
  if (!property || !forecast || !property.totalInvestment) {
    return 0;
  }

  const initialInvestment = property.totalInvestment || 0;
  const initialPropertyValue = property.currentMarketValue || property.purchasePrice || 0;
  const initialMortgageBalance = property.mortgage?.remainingBalance || property.mortgage?.originalAmount || 0;
  const initialEquity = initialPropertyValue - initialMortgageBalance;

  // Get cumulative cash flow
  let cumulativeCashFlow = 0;
  if (forecast.cumulativeCashFlow && forecast.cumulativeCashFlow.length > 0) {
    cumulativeCashFlow = forecast.cumulativeCashFlow[forecast.cumulativeCashFlow.length - 1] || 0;
  }

  // Calculate final property value and mortgage balance
  let finalPropertyValue = 0;
  let finalMortgageBalance = 0;

  if (analysisMode === 'equity') {
    // Equity mode - has propertyValue array
    if (forecast.propertyValue && forecast.propertyValue.length > 0) {
      finalPropertyValue = forecast.propertyValue[forecast.propertyValue.length - 1] || 0;
    }
    if (forecast.mortgageBalance && forecast.mortgageBalance.length > 0) {
      finalMortgageBalance = forecast.mortgageBalance[forecast.mortgageBalance.length - 1] || 0;
    }
  } else {
    // Cash-flow mode - need to calculate property value
    // Use exit cap rate if available, otherwise use appreciation
    if (assumptions.exitCapRate && assumptions.exitCapRate > 0) {
      // Calculate from final year NOI
      const finalNOI = forecast.noi && forecast.noi.length > 0 
        ? forecast.noi[forecast.noi.length - 1] || 0 
        : 0;
      if (finalNOI > 0) {
        finalPropertyValue = finalNOI / (assumptions.exitCapRate / 100);
      }
    } else {
      // Use appreciation (default 3% if not in assumptions)
      const appreciationRate = assumptions.annualPropertyAppreciation || 3.0;
      finalPropertyValue = initialPropertyValue * Math.pow(1 + appreciationRate / 100, years);
    }
    
    // Get final mortgage balance from forecast
    if (forecast.mortgageBalance && forecast.mortgageBalance.length > 0) {
      finalMortgageBalance = forecast.mortgageBalance[forecast.mortgageBalance.length - 1] || 0;
    } else {
      finalMortgageBalance = initialMortgageBalance;
    }
  }

  // Calculate equity growth
  const finalEquity = finalPropertyValue - finalMortgageBalance;
  const equityGrowth = finalEquity - initialEquity;

  // Calculate sale proceeds (after selling costs)
  const sellingCosts = finalPropertyValue * (sellingCostsPercent / 100);
  const saleProceeds = finalPropertyValue - finalMortgageBalance - sellingCosts;

  // Total Profit = Cumulative Cash Flow + Equity Growth + Sale Proceeds - Initial Investment
  // Note: Equity Growth is already included in the equity calculation, but we need to account for it separately
  // Actually, the formula should be: Cumulative Cash Flow + (Final Equity - Initial Equity) + Sale Proceeds - Initial Investment
  // But sale proceeds already accounts for final equity, so we need to adjust:
  // Total Profit = Cumulative Cash Flow + Equity Growth - Initial Investment
  // Where Equity Growth = Principal Paydown (from mortgage reduction)
  // And Sale Proceeds = Final Property Value - Final Mortgage - Selling Costs
  
  // Actually, let's recalculate: 
  // Total Profit = All cash received - All cash invested
  // Cash received = Cumulative Cash Flow + Sale Proceeds
  // Cash invested = Initial Investment
  // But we also need to account for equity growth from appreciation and paydown
  
  // Simplified: Total Profit = Cumulative Cash Flow + (Final Equity - Initial Equity) - Initial Investment
  // But this double counts because sale proceeds includes the equity
  
  // Correct formula:
  // Total Profit = Cumulative Cash Flow + Sale Proceeds - Initial Investment
  // Where Sale Proceeds = Final Property Value - Final Mortgage - Selling Costs
  
  const totalProfit = cumulativeCashFlow + saleProceeds - initialInvestment;

  return totalProfit;
}

/**
 * Calculate Average Annual Equity Built
 * 
 * Formula: (Final Equity - Initial Equity) / Years
 * 
 * Equity includes:
 * - Property appreciation
 * - Mortgage principal paydown
 * 
 * @param {Object} property - Property object
 * @param {Object} forecast - Forecast data from generateForecast
 * @param {number} years - Holding period in years
 * @param {string} analysisMode - 'cash-flow' | 'equity'
 * @param {Object} assumptions - Forecast assumptions (needed for cash-flow mode)
 * @returns {number} Average annual equity built in dollars
 */
export function calculateAverageAnnualEquityBuilt(property, forecast, years, analysisMode = 'cash-flow', assumptions = {}) {
  if (!property || !forecast || years <= 0) {
    return 0;
  }

  const initialPropertyValue = property.currentMarketValue || property.purchasePrice || 0;
  const initialMortgageBalance = property.mortgage?.remainingBalance || property.mortgage?.originalAmount || 0;
  const initialEquity = initialPropertyValue - initialMortgageBalance;

  // Calculate final property value and mortgage balance
  let finalPropertyValue = 0;
  let finalMortgageBalance = 0;

  if (analysisMode === 'equity') {
    // Equity mode - has propertyValue array
    if (forecast.propertyValue && forecast.propertyValue.length > 0) {
      finalPropertyValue = forecast.propertyValue[forecast.propertyValue.length - 1] || 0;
    }
    if (forecast.mortgageBalance && forecast.mortgageBalance.length > 0) {
      finalMortgageBalance = forecast.mortgageBalance[forecast.mortgageBalance.length - 1] || 0;
    }
  } else {
    // Cash-flow mode - need to calculate property value
    if (assumptions.exitCapRate && assumptions.exitCapRate > 0) {
      // Calculate from final year NOI
      const finalNOI = forecast.noi && forecast.noi.length > 0 
        ? forecast.noi[forecast.noi.length - 1] || 0 
        : 0;
      if (finalNOI > 0) {
        finalPropertyValue = finalNOI / (assumptions.exitCapRate / 100);
      }
    } else {
      // Use appreciation (default 3% if not in assumptions)
      const appreciationRate = assumptions.annualPropertyAppreciation || 3.0;
      finalPropertyValue = initialPropertyValue * Math.pow(1 + appreciationRate / 100, years);
    }
    
    // Get final mortgage balance from forecast
    if (forecast.mortgageBalance && forecast.mortgageBalance.length > 0) {
      finalMortgageBalance = forecast.mortgageBalance[forecast.mortgageBalance.length - 1] || 0;
    } else {
      finalMortgageBalance = initialMortgageBalance;
    }
  }

  // Calculate final equity
  const finalEquity = finalPropertyValue - finalMortgageBalance;
  
  // Calculate total equity built
  const totalEquityBuilt = finalEquity - initialEquity;
  
  // Calculate average annual equity built
  const averageAnnualEquityBuilt = totalEquityBuilt / years;

  return averageAnnualEquityBuilt;
}
