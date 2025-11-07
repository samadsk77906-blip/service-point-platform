# Garage Registration Flow Test

## Overview
This document provides instructions to test the complete garage registration workflow including backend endpoint integration.

## Prerequisites
1. MongoDB database running
2. Backend server running (`npm start` in `/backend`)
3. Frontend accessible at `http://localhost:5000`

## Test Steps

### Step 1: Create Admin Account (if not exists)
1. Navigate to `http://localhost:5000/admin-register.html`
2. Register the first admin (main_admin role)
3. Login to admin dashboard

### Step 2: Add a Garage via Admin
1. Navigate to admin dashboard
2. Add a new garage with:
   - Garage Name: Test Garage
   - Owner Name: John Doe
   - Email: john@testgarage.com
   - Contact: +1234567890
   - Location: Mumbai, India
   - Services: Towing, Oil Change
3. Note the generated Garage ID (e.g., GAR_1234567890_ABCDEFGHI)

### Step 3: Test Garage Registration
1. Navigate to `http://localhost:5000/garage-register.html`
2. Fill the form:
   - **Email**: john@testgarage.com (exact match required)
   - **Garage ID**: GAR_1234567890_ABCDEFGHI (exact match required)
   - **Password**: testpassword123 (min 6 chars)
   - **Confirm Password**: testpassword123
3. Submit form
4. **Expected**: Success message and redirect to garage login

### Step 4: Test Garage Login
1. Navigate to `http://localhost:5000/garage-login.html`
2. Login with:
   - **Email**: john@testgarage.com
   - **Password**: testpassword123
3. **Expected**: Successful login and redirect to garage dashboard

## API Endpoint Testing

### Manual API Test (optional)
```bash
# Test garage registration endpoint directly
curl -X POST http://localhost:5000/api/auth/garage/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@testgarage.com",
    "garageId": "GAR_1234567890_ABCDEFGHI", 
    "password": "testpassword123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "✅ Registration completed successfully! You can now login with your email and password.",
  "garageInfo": {
    "garageId": "GAR_1234567890_ABCDEFGHI",
    "garageName": "Test Garage",
    "ownerName": "John Doe",
    "email": "john@testgarage.com"
  }
}
```

## Error Scenarios to Test

### 1. Invalid Email/Garage ID Combination
- Use wrong email or garage ID
- **Expected**: "❌ Invalid email or Garage ID combination"

### 2. Already Registered Garage
- Try to register same garage twice
- **Expected**: "❌ This garage is already registered! Please use the login page"

### 3. Password Validation
- Use password less than 6 characters
- **Expected**: Frontend validation error
- Password mismatch in confirm password
- **Expected**: "Passwords do not match"

### 4. Missing Required Fields
- Leave any field empty
- **Expected**: Frontend validation errors

## Google Maps Testing

### Configuration Required
1. Edit `frontend/js/config.js`
2. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with actual Google Maps API key
3. Get API key from: https://developers.google.com/maps/documentation/javascript/get-api-key

### Testing Map Features
1. Navigate to `http://localhost:5000`
2. Perform garage search
3. Click "Map" view button
4. **Expected**: 
   - Map loads successfully (with API key)
   - Map shows placeholder message (without API key)
   - GPS button works and centers map on user location
   - Garage markers appear on map

## Troubleshooting

### Common Issues
1. **Registration fails with "Invalid email or Garage ID"**
   - Ensure email and garage ID match exactly what admin entered
   - Check case sensitivity (garage ID is auto-uppercase)

2. **Map not showing**
   - Configure Google Maps API key in config.js
   - Check browser console for API key errors

3. **GPS not working**
   - Enable location permissions in browser
   - Use HTTPS in production (required for GPS)

## Files Modified/Created

### Backend
- `/backend/routes/auth.js` - Contains garage registration endpoint
- `/backend/models/Garage.js` - Garage model with password hashing

### Frontend  
- `/frontend/garage-register.html` - Registration form
- `/frontend/js/config.js` - Updated with Google Maps configuration
- `/frontend/js/maps.js` - New maps integration module
- `/frontend/js/main.js` - Updated GPS and map handling
- `/frontend/index.html` - Fixed duplicate elements, updated scripts

### Features Implemented
✅ Backend garage registration endpoint  
✅ Frontend registration form with validation  
✅ Password hashing and security  
✅ Email/Garage ID verification  
✅ Google Maps integration improvements  
✅ Better GPS error handling  
✅ Map view with garage markers  
✅ Responsive design  

## Next Steps
After successful testing, consider:
1. Adding email verification for registration
2. Password reset functionality  
3. Two-factor authentication
4. Garage profile editing
5. Advanced map filtering options