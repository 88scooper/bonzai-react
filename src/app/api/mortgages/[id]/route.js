import { NextResponse } from 'next/server';
import { authenticateRequest, validateMortgageData, createSuccessResponse, createErrorResponse } from '@/lib/api-utils';
import { updateMortgage, deleteMortgage, getMortgage } from '@/lib/firestore';
import { mockMortgages } from '@/lib/mock-data';
import { db } from '@/lib/firebase';

// GET /api/mortgages/[id] - Get a specific mortgage
export async function GET(request, { params }) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    const { id } = await params;

    let mortgage;

    if (!db) {
      // Mock implementation for development
      mortgage = mockMortgages.find(m => m.id === id && m.userId === user.uid);
    } else {
      // Real Firebase implementation
      mortgage = await getMortgage(user.uid, id);
    }

    if (!mortgage) {
      return NextResponse.json(
        createErrorResponse('Mortgage not found', 404),
        { status: 404 }
      );
    }

    return NextResponse.json(
      createSuccessResponse(mortgage),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching mortgage:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}

// PUT /api/mortgages/[id] - Update a mortgage
export async function PUT(request, { params }) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json();
    
    // Validate the mortgage data (partial validation for updates)
    const validationErrors = validateMortgageData(body, true);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        createErrorResponse(`Validation failed: ${validationErrors.join(', ')}`, 400),
        { status: 400 }
      );
    }

    // Check if mortgage exists and belongs to user
    let existingMortgage;
    if (!db) {
      existingMortgage = mockMortgages.find(m => m.id === id && m.userId === user.uid);
    } else {
      existingMortgage = await getMortgage(user.uid, id);
    }

    if (!existingMortgage) {
      return NextResponse.json(
        createErrorResponse('Mortgage not found', 404),
        { status: 404 }
      );
    }

    // Prepare update data (only include provided fields)
    const updateData = {};
    if (body.lenderName !== undefined) updateData.lenderName = body.lenderName.trim();
    if (body.propertyId !== undefined) updateData.propertyId = body.propertyId?.trim() || null;
    if (body.originalAmount !== undefined) updateData.originalAmount = parseFloat(body.originalAmount);
    if (body.interestRate !== undefined) updateData.interestRate = parseFloat(body.interestRate);
    if (body.rateType !== undefined) updateData.rateType = body.rateType;
    if (body.variableRateSpread !== undefined) updateData.variableRateSpread = body.variableRateSpread ? parseFloat(body.variableRateSpread) : null;
    
    // Handle amortization conversion to months
    if (body.amortizationValue !== undefined && body.amortizationUnit !== undefined) {
      updateData.amortizationPeriodMonths = body.amortizationUnit === 'years' 
        ? body.amortizationValue * 12 
        : body.amortizationValue;
    } else if (body.amortizationPeriodYears !== undefined) {
      // Fallback for old format
      updateData.amortizationPeriodMonths = parseInt(body.amortizationPeriodYears) * 12;
    }
    
    // Handle term conversion to months
    if (body.termValue !== undefined && body.termUnit !== undefined) {
      updateData.termMonths = body.termUnit === 'years' 
        ? body.termValue * 12 
        : body.termValue;
    } else if (body.termYears !== undefined) {
      // Fallback for old format
      updateData.termMonths = parseInt(body.termYears) * 12;
    }
    
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.paymentFrequency !== undefined) updateData.paymentFrequency = body.paymentFrequency;
    if (body.mortgageType !== undefined) updateData.mortgageType = body.mortgageType;
    if (body.hasFixedPayments !== undefined) updateData.hasFixedPayments = body.hasFixedPayments;

    if (!db) {
      // Mock implementation for development
      const mortgageIndex = mockMortgages.findIndex(m => m.id === id && m.userId === user.uid);
      if (mortgageIndex !== -1) {
        mockMortgages[mortgageIndex] = {
          ...mockMortgages[mortgageIndex],
          ...updateData,
          updatedAt: new Date()
        };
      }
    } else {
      // Real Firebase implementation
      await updateMortgage(user.uid, id, updateData);
    }

    // Return the updated mortgage
    const updatedMortgage = !db 
      ? mockMortgages.find(m => m.id === id && m.userId === user.uid)
      : { id, ...existingMortgage, ...updateData };

    return NextResponse.json(
      createSuccessResponse(updatedMortgage),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating mortgage:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}

// DELETE /api/mortgages/[id] - Delete a mortgage
export async function DELETE(request, { params }) {
  try {
    // Authenticate the request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        createErrorResponse('Authentication required', 401),
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if mortgage exists and belongs to user
    let existingMortgage;
    if (!db) {
      existingMortgage = mockMortgages.find(m => m.id === id && m.userId === user.uid);
    } else {
      existingMortgage = await getMortgage(user.uid, id);
    }

    if (!existingMortgage) {
      return NextResponse.json(
        createErrorResponse('Mortgage not found', 404),
        { status: 404 }
      );
    }

    if (!db) {
      // Mock implementation for development - mutate array in place
      const mortgageIndex = mockMortgages.findIndex(m => m.id === id && m.userId === user.uid);
      if (mortgageIndex !== -1) {
        mockMortgages.splice(mortgageIndex, 1);
      }
    } else {
      // Real Firebase implementation
      await deleteMortgage(user.uid, id);
    }

    return NextResponse.json(
      createSuccessResponse({ message: 'Mortgage deleted successfully' }),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting mortgage:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 500),
      { status: 500 }
    );
  }
}
