# Mobile App Login Tracking

## Overview
Workforce users login through the mobile app and need their login activity tracked. This document explains how to implement login tracking in the mobile app.

## Implementation

### After Successful Login

After a user successfully authenticates with Supabase (using `signInWithPassword` or OTP), call the login tracking endpoint:

```javascript
// Example in React Native / JavaScript
const trackLogin = async (accessToken) => {
  try {
    const response = await fetch('https://v1.ezbillify.com/api/auth/track-login', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Login tracked successfully');
    } else {
      console.error('⚠️ Failed to track login:', result.error);
      // Non-critical error - don't block user from continuing
    }
  } catch (error) {
    console.error('💥 Error tracking login:', error);
    // Non-critical error - don't block user from continuing
  }
};

// After successful Supabase login
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});

if (data?.session?.access_token) {
  // Track the login (fire and forget - don't await)
  trackLogin(data.session.access_token);

  // Continue with normal app flow
  navigateToHome();
}
```

## API Endpoint Details

**Endpoint:** `POST /api/auth/track-login`

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `Content-Type: application/json`

**Request Body:** None required (user ID is extracted from token)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login tracked successfully"
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or expired token
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

- `405 Method Not Allowed`: Wrong HTTP method
```json
{
  "success": false,
  "error": "Method not allowed"
}
```

- `500 Internal Server Error`: Server error
```json
{
  "success": false,
  "error": "Failed to track login"
}
```

## What Gets Tracked

When this endpoint is called:
1. **`last_login`** - Updated to current timestamp
2. **`login_count`** - Incremented by 1

This data appears in the admin dashboard's User Management section.

## Important Notes

1. **Non-blocking**: This call should NOT block the user's login flow. If it fails, log the error but allow the user to continue.
2. **Fire and forget**: You can call this without awaiting the response.
3. **Automatic for web**: Web users are automatically tracked - this is only needed for mobile app users.
4. **Access token**: Use the `access_token` from Supabase's auth response, not the refresh token.

## Testing

Test with a workforce user account:

1. Login via mobile app
2. Check admin dashboard → Settings → User Management
3. Verify "Last Login" shows recent timestamp
4. Login again and verify "login_count" increases

## Questions?

Contact the backend team if you have questions about this implementation.
