# Email Verification Flow Test Plan

## Overview
This document outlines the manual testing plan for validating the Cognito email verification flow during the auth migration.

## Test Environment
- **Frontend URL**: http://localhost:3002
- **Cognito User Pool**: us-east-1_b0UJziNnZ
- **Cognito Client**: 21qsttnb5r7io49eslnq2pur9j
- **Verification Method**: Email codes (6-digit)
- **Region**: us-east-1

## Test Scenarios

### 1. Happy Path - Complete Email Verification Flow

**Steps:**
1. Navigate to http://localhost:3002/auth/signup
2. Fill out signup form with valid data:
   - Email: Use a real email you can access
   - Password: Must meet requirements (8+ chars, upper/lower, numbers)
   - Name: Any valid name
3. Submit the form
4. Verify redirect to email verification page
5. Check email for verification code
6. Enter the 6-digit code
7. Submit verification
8. Verify successful completion and redirect

**Expected Results:**
- Signup creates user in Cognito (unconfirmed state)
- Email verification code is sent
- Valid code verification succeeds
- User status changes to confirmed
- Redirect to appropriate page (login or dashboard)

### 2. Error Handling Tests

#### 2.1 Invalid Verification Code
**Steps:**
1. Complete signup flow
2. Enter invalid code (e.g., "000000")
3. Submit verification

**Expected Results:**
- Error message displayed: "Invalid verification code"
- User remains on verification page
- Can retry with correct code

#### 2.2 Expired Verification Code
**Steps:**
1. Complete signup flow
2. Wait for code to expire (typically 24 hours, but can test with old codes)
3. Enter expired code

**Expected Results:**
- Error message displayed: "Verification code has expired"
- Option to resend new code

#### 2.3 Resend Verification Code
**Steps:**
1. Complete signup flow
2. Click "Resend Code" button
3. Check email for new code
4. Use new code to verify

**Expected Results:**
- New verification code sent
- Success message displayed
- New code works for verification

#### 2.4 Network Errors
**Steps:**
1. Complete signup flow
2. Disconnect internet/block requests
3. Try to verify with valid code

**Expected Results:**
- Network error message displayed
- Retry mechanism available
- Works when connection restored

### 3. Edge Cases

#### 3.1 Code Input Validation
**Steps:**
1. Try entering codes with different lengths
2. Try entering non-numeric characters
3. Try copy-pasting codes with spaces

**Expected Results:**
- Input limited to 6 digits
- Non-numeric characters rejected or filtered
- Spaces automatically removed

#### 3.2 Multiple Verification Attempts
**Steps:**
1. Complete signup flow
2. Enter wrong code multiple times
3. Check for rate limiting or account lockout

**Expected Results:**
- Appropriate rate limiting applied
- Clear error messages
- Account not permanently locked

#### 3.3 Direct URL Access
**Steps:**
1. Navigate directly to verification page without signup
2. Try to verify without email parameter

**Expected Results:**
- Appropriate error handling
- Redirect to signup or login page
- No crashes or undefined behavior

### 4. UI/UX Validation

#### 4.1 Loading States
**Steps:**
1. Monitor loading indicators during:
   - Code verification
   - Code resend
   - Form submission

**Expected Results:**
- Loading states shown during async operations
- Buttons disabled during loading
- Clear feedback to user

#### 4.2 Form Validation
**Steps:**
1. Test form validation for:
   - Empty code field
   - Partial code entry
   - Invalid characters

**Expected Results:**
- Client-side validation works
- Clear validation messages
- Form submission blocked for invalid input

#### 4.3 Responsive Design
**Steps:**
1. Test on different screen sizes
2. Test on mobile devices
3. Check accessibility features

**Expected Results:**
- Layout works on all screen sizes
- Touch-friendly on mobile
- Keyboard navigation works
- Screen reader compatible

## Test Data

### Valid Test Emails
- Use real email addresses you can access
- Consider using email aliases (e.g., yourname+test1@gmail.com)

### Valid Passwords
- TestPassword123
- SecurePass456
- ValidAuth789

### Invalid Passwords (for negative testing)
- password (no uppercase/numbers)
- PASSWORD (no lowercase/numbers)
- Password (no numbers)
- Pass123 (too short)

## Success Criteria

✅ **Core Functionality**
- [ ] User can sign up successfully
- [ ] Verification email is sent
- [ ] Valid codes are accepted
- [ ] Invalid codes are rejected with clear errors
- [ ] Code resend functionality works
- [ ] User is confirmed in Cognito after verification

✅ **Error Handling**
- [ ] Network errors handled gracefully
- [ ] Invalid codes show appropriate messages
- [ ] Expired codes handled correctly
- [ ] Rate limiting works as expected

✅ **User Experience**
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Form validation works
- [ ] Navigation flows correctly

✅ **Security**
- [ ] Codes are properly validated server-side
- [ ] No sensitive data exposed in client
- [ ] Rate limiting prevents abuse
- [ ] Proper session management

## Notes

- Test with multiple email providers (Gmail, Outlook, etc.)
- Check spam folders for verification emails
- Test during different times to check email delivery speed
- Document any issues found with screenshots
- Verify Cognito User Pool shows correct user states

## Cognito User Pool Verification

After testing, verify in AWS Console:
1. Go to Cognito User Pools
2. Select pool: us-east-1_b0UJziNnZ
3. Check Users tab
4. Verify user status changes from "UNCONFIRMED" to "CONFIRMED"
5. Check user attributes are correctly set
