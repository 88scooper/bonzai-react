# API Testing Guide

This guide will help you test all the API endpoints using Postman or curl.

## Prerequisites

1. Database is set up and migrations are run (see `DATABASE_SETUP.md`)
2. Environment variables are configured (`.env.local` or Vercel)
3. Development server is running: `npm run dev`

## Testing Order

### Step 1: Test Authentication Endpoints

#### 1.1 Register a New User

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/register`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "testpassword123",
  "name": "Test User"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "name": "Test User"
    },
    "token": "jwt-token-here"
  }
}
```

**Save the token** - You'll need it for authenticated requests!

**curl:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

#### 1.2 Login

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/login`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "email": "test@example.com",
  "password": "testpassword123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt-token-here"
  }
}
```

### Step 2: Test Accounts Endpoints

**Set Authorization Header:**
- In Postman: Go to "Authorization" tab
- Type: "Bearer Token"
- Token: Paste the token from login/register

#### 2.1 Create Account

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/accounts`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "name": "My First Account",
  "email": "account@example.com",
  "isDemo": false
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "name": "My First Account",
    "email": "account@example.com",
    "is_demo": false,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Save the account ID** for later tests!

#### 2.2 Get All Accounts (Paginated)

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/accounts?page=1&limit=10`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "name": "My First Account",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### 2.3 Get Account by ID

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/accounts/{account-id}`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

#### 2.4 Update Account

**Postman:**
- Method: `PATCH`
- URL: `http://localhost:3000/api/accounts/{account-id}`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "name": "Updated Account Name"
}
```

#### 2.5 Delete Account

**Postman:**
- Method: `DELETE`
- URL: `http://localhost:3000/api/accounts/{account-id}`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

### Step 3: Test Properties Endpoints

#### 3.1 Create Property

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/properties`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "accountId": "your-account-id-here",
  "nickname": "Richmond St E",
  "address": "311-403 Richmond Street East, Toronto, ON",
  "purchasePrice": 615000,
  "purchaseDate": "2019-02-04",
  "closingCosts": 18150,
  "currentMarketValue": 800000,
  "propertyType": "Condo",
  "size": 946,
  "propertyData": {
    "yearBuilt": 2001,
    "unitConfig": "2 Bed, Den, 2 Bath"
  }
}
```

**Save the property ID!**

#### 3.2 Get All Properties

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/properties?accountId={account-id}&page=1&limit=10`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

#### 3.3 Get Property by ID

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/properties/{property-id}`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

#### 3.4 Update Property

**Postman:**
- Method: `PATCH`
- URL: `http://localhost:3000/api/properties/{property-id}`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "currentMarketValue": 850000
}
```

### Step 4: Test Mortgage Endpoints

#### 4.1 Create/Update Mortgage

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/properties/{property-id}/mortgage`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "lender": "RMG",
  "originalAmount": 492000,
  "interestRate": 0.0269,
  "rateType": "Fixed",
  "termMonths": 60,
  "amortizationYears": 25,
  "paymentFrequency": "Bi-Weekly",
  "startDate": "2019-02-04"
}
```

#### 4.2 Get Mortgage

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/properties/{property-id}/mortgage`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

### Step 5: Test Expense Endpoints

#### 5.1 Create Expense

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/properties/{property-id}/expenses`
- Headers: 
  - `Content-Type: application/json`
  - `Authorization: Bearer YOUR_TOKEN_HERE`
- Body:
```json
{
  "date": "2025-01-15",
  "amount": 3393.39,
  "category": "Property Tax",
  "description": "Property taxes for 2025"
}
```

#### 5.2 Get Expenses (Paginated)

**Postman:**
- Method: `GET`
- URL: `http://localhost:3000/api/properties/{property-id}/expenses?page=1&limit=10`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

### Step 6: Test Logout

**Postman:**
- Method: `POST`
- URL: `http://localhost:3000/api/auth/logout`
- Headers: `Authorization: Bearer YOUR_TOKEN_HERE`

## Common Issues & Solutions

### 401 Unauthorized
- **Problem:** Token is missing or invalid
- **Solution:** 
  - Make sure you're including `Authorization: Bearer YOUR_TOKEN` header
  - Token might have expired - try logging in again
  - Check that JWT_SECRET is set correctly

### 404 Not Found
- **Problem:** Resource doesn't exist or doesn't belong to user
- **Solution:** 
  - Verify the ID is correct
  - Make sure you created the resource with the same user account
  - Check database to verify resource exists

### 400 Bad Request
- **Problem:** Validation error
- **Solution:** 
  - Check the error message for specific validation issues
  - Verify all required fields are present
  - Check data types match the schema

### 500 Internal Server Error
- **Problem:** Database or server error
- **Solution:** 
  - Check server logs for detailed error
  - Verify database connection string is correct
  - Ensure migrations have been run
  - Check that all environment variables are set

## Testing Checklist

- [ ] User registration works
- [ ] User login works
- [ ] JWT token is returned and valid
- [ ] Create account works
- [ ] Get accounts (paginated) works
- [ ] Get account by ID works
- [ ] Update account works
- [ ] Delete account works
- [ ] Create property works
- [ ] Get properties (paginated) works
- [ ] Get property by ID works
- [ ] Update property works
- [ ] Delete property works
- [ ] Create/update mortgage works
- [ ] Get mortgage works
- [ ] Create expense works
- [ ] Get expenses (paginated) works
- [ ] Logout works
- [ ] Authentication is enforced on protected routes
- [ ] Pagination works correctly
- [ ] Validation errors are returned properly

## Next Steps

Once all endpoints are tested and working:

1. **Update Frontend Contexts** - Integrate API client into React contexts
2. **Migrate Data** - Move existing localStorage data to database
3. **Deploy** - Deploy to staging, then production

