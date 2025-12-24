// NOTE: This file is kept for backward compatibility with legacy API routes
// New API routes should use @/lib/auth-middleware.ts instead

import { verifyToken } from '@/lib/auth';

// Authentication middleware for API routes (legacy - use auth-middleware.ts for new routes)
export async function authenticateRequest(req) {
  try {
    const authHeader = req.headers.get?.('authorization') || req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No authorization token provided');
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Validate JWT token using the new auth system
    const decoded = verifyToken(token);
    
    if (!decoded) {
      throw new Error('Invalid or expired token');
    }

    return {
      uid: decoded.userId,
      id: decoded.userId,
      email: decoded.email,
      email_verified: true // JWT tokens are considered verified
    };
  } catch (error) {
    console.warn('Authentication failed:', error.message);
    throw new Error('Authentication required');
  }
}

// Validation utilities
export function validateMortgageData(data, isUpdate = false) {
  const errors = [];
  const requiredFields = [
    'lenderName',
    'originalAmount',
    'interestRate',
    'rateType',
    'startDate',
    'paymentFrequency'
  ];

  // Check required fields for creation
  if (!isUpdate) {
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${field} is required`);
      }
    });
  }

  // Validate data types and ranges
  if (data.originalAmount !== undefined) {
    const amount = parseFloat(data.originalAmount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('originalAmount must be a positive number');
    }
  }

  if (data.interestRate !== undefined) {
    const rate = parseFloat(data.interestRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      errors.push('interestRate must be between 0 and 50');
    }
  }

  if (data.rateType !== undefined && !['FIXED', 'VARIABLE'].includes(data.rateType)) {
    errors.push('rateType must be either FIXED or VARIABLE');
  }

  // Validate amortization period (new format or old format)
  const amortizationYears = data.amortizationValue && data.amortizationUnit 
    ? (data.amortizationUnit === 'years' ? data.amortizationValue : data.amortizationValue / 12)
    : data.amortizationPeriodYears;
  
  if (amortizationYears !== undefined) {
    const years = parseInt(amortizationYears);
    if (isNaN(years) || years < 1 || years > 50) {
      errors.push('amortizationPeriodYears must be between 1 and 50');
    }
  }

  // Validate term (new format or old format)
  const termYears = data.termValue && data.termUnit 
    ? (data.termUnit === 'years' ? data.termValue : data.termValue / 12)
    : data.termYears;
  
  if (termYears !== undefined) {
    const years = parseInt(termYears);
    if (isNaN(years) || years < 1 || years > 30) {
      errors.push('termYears must be between 1 and 30');
    }
  }

  if (data.paymentFrequency !== undefined && !['MONTHLY', 'SEMI_MONTHLY', 'BI_WEEKLY', 'ACCELERATED_BI_WEEKLY', 'WEEKLY', 'ACCELERATED_WEEKLY'].includes(data.paymentFrequency)) {
    errors.push('paymentFrequency must be one of the supported options');
  }

  if (data.startDate !== undefined) {
    const date = new Date(data.startDate);
    if (isNaN(date.getTime())) {
      errors.push('startDate must be a valid date');
    }
  }

  if (data.variableRateSpread !== undefined && data.variableRateSpread !== null) {
    const spread = parseFloat(data.variableRateSpread);
    if (isNaN(spread) || spread < -10 || spread > 10) {
      errors.push('variableRateSpread must be between -10 and 10');
    }
  }

  return errors;
}

// Standard API response format
export function createApiResponse(success, data = null, error = null, statusCode = 200) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    statusCode
  };
}

// Error response helper
export function createErrorResponse(message, statusCode = 400) {
  return createApiResponse(false, null, message, statusCode);
}

// Success response helper
export function createSuccessResponse(data, statusCode = 200) {
  return createApiResponse(true, data, null, statusCode);
}
