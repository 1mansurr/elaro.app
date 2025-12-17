# ELARO API Reference

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Base URL:** `https://[project-ref].supabase.co/functions/v1/`

---

## Overview

The ELARO API is a RESTful API built on Supabase Edge Functions. All endpoints require authentication unless otherwise specified.

### Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The access token is obtained from the authentication endpoints or from the current user session.

### Response Format

All API responses follow this format:

```typescript
{
  data?: T;           // Response data (if successful)
  error?: string;     // Error message (if failed)
  message?: string;   // Additional message
  code?: string;      // Error code
}
```

### Error Codes

- `MISSING_REQUIRED_FIELD` - Required field is missing
- `VALIDATION_ERROR` - Input validation failed
- `DB_NOT_FOUND` - Resource not found
- `DB_ERROR` - Database error
- `FORBIDDEN` - Insufficient permissions
- `UNAUTHORIZED` - Authentication required
- `INTERNAL_ERROR` - Internal server error

---

## Authentication Endpoints

### Sign Up

**POST** `/auth/signup`

Create a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "data": {
    "user": { ... },
    "session": { ... }
  }
}
```

---

### Sign In

**POST** `/auth/signin`

Authenticate an existing user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "data": {
    "user": { ... },
    "session": { ... }
  }
}
```

---

### Sign Out

**POST** `/auth/signout`

Sign out the current user.

**Response:**

```json
{
  "data": { "success": true }
}
```

---

### Get Session

**GET** `/auth/session`

Get the current user session.

**Response:**

```json
{
  "data": {
    "session": { ... },
    "user": { ... }
  }
}
```

---

### Get User

**GET** `/auth/user`

Get the current authenticated user.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

---

### Reset Password

**POST** `/auth/reset-password`

Initiate a password reset flow.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "data": { "success": true, "message": "Password reset email sent" }
}
```

---

### Verify Email

**POST** `/auth/verify-email`

Verify a user's email address.

**Request Body:**

```json
{
  "token": "verification_token",
  "type": "email"
}
```

**Response:**

```json
{
  "data": { "success": true }
}
```

---

## Auth Lockout Endpoints

### Check Account Lockout

**GET** `/auth/lockout/check-lockout?email=user@example.com`

Check if an account is currently locked due to failed login attempts.

**Query Parameters:**

- `email` (required) - User's email address

**Response:**

```json
{
  "data": {
    "isLocked": false,
    "attemptsRemaining": 5,
    "lockedUntil": null,
    "minutesRemaining": null
  }
}
```

**Response (Locked):**

```json
{
  "data": {
    "isLocked": true,
    "lockedUntil": "2025-01-31T12:00:00Z",
    "minutesRemaining": 15
  }
}
```

---

### Record Failed Login Attempt

**POST** `/auth/lockout/record-failed-attempt`

Record a failed login attempt and lock account if threshold is reached.

**Request Body:**

```json
{
  "email": "user@example.com",
  "reason": "invalid_credentials",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Response:**

```json
{
  "data": {
    "recorded": true,
    "attempts": 3,
    "isLocked": false
  }
}
```

---

### Record Successful Login

**POST** `/auth/lockout/record-successful-login`

Record a successful login and reset failed attempts.

**Request Body:**

```json
{
  "userId": "uuid-here",
  "method": "email",
  "deviceInfo": {
    "platform": "ios",
    "version": "17.0",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**

```json
{
  "data": {
    "recorded": true
  }
}
```

---

### Reset Failed Attempts

**POST** `/auth/lockout/reset-attempts`

Reset failed login attempts for a user.

**Request Body:**

```json
{
  "userIdOrEmail": "user@example.com"
}
```

**Response:**

```json
{
  "data": {
    "reset": true
  }
}
```

---

### Update Profile

**PUT** `/auth/update-profile`

Update user profile or password.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "password": "newpassword" // Optional
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

---

## Course Operations

### List Courses

**GET** `/api-v2/courses/list`

Get all courses for the current user.

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "course_name": "Mathematics 101",
      "course_code": "MATH101",
      ...
    }
  ]
}
```

---

### Get Course

**GET** `/api-v2/courses/get/:id`

Get a specific course by ID.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "course_name": "Mathematics 101",
    ...
  }
}
```

---

### Create Course

**POST** `/api-v2/courses/create`

Create a new course.

**Request Body:**

```json
{
  "course_name": "Mathematics 101",
  "course_code": "MATH101",
  "about_course": "Introduction to mathematics"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "course_name": "Mathematics 101",
    ...
  }
}
```

---

### Update Course

**PUT** `/api-v2/courses/update/:id`

Update an existing course.

**Request Body:**

```json
{
  "course_name": "Advanced Mathematics 101",
  "about_course": "Updated description"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "course_name": "Advanced Mathematics 101",
    ...
  }
}
```

---

### Delete Course

**DELETE** `/api-v2/courses/delete/:id`

Soft delete a course.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "deleted_at": "2025-01-31T00:00:00Z",
    ...
  }
}
```

---

### Restore Course

**POST** `/api-v2/courses/restore/:id`

Restore a soft-deleted course.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "deleted_at": null,
    ...
  }
}
```

---

## Assignment Operations

All assignment operations follow the same pattern as courses:

- `GET /api-v2/assignments/list` - List assignments
- `GET /api-v2/assignments/get/:id` - Get assignment
- `POST /api-v2/assignments/create` - Create assignment
- `PUT /api-v2/assignments/update/:id` - Update assignment
- `DELETE /api-v2/assignments/delete/:id` - Delete assignment
- `POST /api-v2/assignments/restore/:id` - Restore assignment

**Request/Response formats:** Similar to courses

---

## Lecture Operations

All lecture operations follow the same pattern as courses:

- `GET /api-v2/lectures/list` - List lectures
- `GET /api-v2/lectures/get/:id` - Get lecture
- `POST /api-v2/lectures/create` - Create lecture
- `PUT /api-v2/lectures/update/:id` - Update lecture
- `DELETE /api-v2/lectures/delete/:id` - Delete lecture
- `POST /api-v2/lectures/restore/:id` - Restore lecture

**Request/Response formats:** Similar to courses

---

## Study Session Operations

All study session operations follow the same pattern as courses:

- `GET /api-v2/study-sessions/list` - List study sessions
- `GET /api-v2/study-sessions/get/:id` - Get study session
- `POST /api-v2/study-sessions/create` - Create study session
- `PUT /api-v2/study-sessions/update/:id` - Update study session
- `DELETE /api-v2/study-sessions/delete/:id` - Delete study session
- `POST /api-v2/study-sessions/restore/:id` - Restore study session

**Request/Response formats:** Similar to courses

---

## User Operations

### Get User Profile

**GET** `/api-v2/users/profile`

Get the current user's profile.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    ...
  }
}
```

---

### Update User Profile

**PUT** `/api-v2/users/update`

Update the current user's profile.

**Request Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "university": "Example University"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "first_name": "John",
    ...
  }
}
```

---

### Get User Devices

**GET** `/users/devices`

Get all devices registered for the current user.

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "push_token": "token",
      "platform": "ios",
      ...
    }
  ]
}
```

---

### Register Device

**POST** `/users/devices`

Register a new device for push notifications.

**Request Body:**

```json
{
  "push_token": "device_token",
  "platform": "ios",
  "updated_at": "2025-01-31T00:00:00Z"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "push_token": "device_token",
    "platform": "ios",
    ...
  }
}
```

---

### Delete Device

**DELETE** `/users/devices/:id`

Remove a device.

**Response:**

```json
{
  "data": {
    "success": true,
    "message": "Device removed successfully"
  }
}
```

---

### Get Login History

**GET** `/users/login-history?limit=50`

Get login history for the current user.

**Query Parameters:**

- `limit` (optional): Number of records to return (default: 50)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "success": true,
      "method": "email",
      "ip_address": "192.168.1.1",
      "created_at": "2025-01-31T00:00:00Z",
      ...
    }
  ]
}
```

---

### Get Subscription

**GET** `/users/subscription`

Get subscription information for the current user.

**Response:**

```json
{
  "data": {
    "tier": "premium",
    "status": "active",
    "expiresAt": "2025-12-31T00:00:00Z",
    "accountStatus": "active",
    "hasActiveSubscription": true
  }
}
```

---

## Notification Operations

### Get Notification Preferences

**GET** `/notification-system/preferences`

Get notification preferences for the current user.

**Response:**

```json
{
  "data": {
    "email_notifications": true,
    "push_notifications": true,
    "reminder_notifications": true,
    ...
  }
}
```

---

### Update Notification Preferences

**PUT** `/notification-system/preferences`

Update notification preferences.

**Request Body:**

```json
{
  "email_notifications": true,
  "push_notifications": false,
  "reminder_notifications": true
}
```

**Response:**

```json
{
  "data": {
    "email_notifications": true,
    "push_notifications": false,
    ...
  }
}
```

---

### Get Notification History

**GET** `/notification-system/history?limit=20&offset=0&includeRead=false`

Get notification history.

**Query Parameters:**

- `limit` (optional): Number of records (default: 20)
- `offset` (optional): Pagination offset (default: 0)
- `filter` (optional): Filter by type
- `includeRead` (optional): Include read notifications (default: false)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Assignment Due",
      "body": "Your assignment is due tomorrow",
      "read": false,
      "created_at": "2025-01-31T00:00:00Z",
      ...
    }
  ]
}
```

---

### Get Unread Count

**GET** `/notification-system/unread-count`

Get the count of unread notifications.

**Response:**

```json
{
  "data": {
    "count": 5
  }
}
```

---

### Mark Notification as Read

**POST** `/notification-system/mark-read`

Mark a notification as read.

**Request Body:**

```json
{
  "notification_id": "uuid"
}
```

**Response:**

```json
{
  "data": {
    "success": true
  }
}
```

---

### Get Notification Queue

**GET** `/notification-system/queue`

Get queued notifications for the current user.

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "notification_type": "reminder",
      "title": "Study Session",
      "scheduled_for": "2025-02-01T10:00:00Z",
      "status": "pending",
      ...
    }
  ]
}
```

---

### Add to Notification Queue

**POST** `/notification-system/queue`

Add a notification to the queue.

**Request Body:**

```json
{
  "notification_type": "reminder",
  "title": "Study Session",
  "body": "Time to study!",
  "data": {},
  "priority": 5,
  "scheduled_for": "2025-02-01T10:00:00Z",
  "max_retries": 3,
  "deduplication_key": "key"
}
```

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "status": "pending",
    ...
  }
}
```

---

### Remove from Notification Queue

**DELETE** `/notification-system/queue/:id`

Remove a notification from the queue.

**Response:**

```json
{
  "data": {
    "success": true
  }
}
```

---

### Send Notification

**POST** `/notification-system/send`

Send a notification immediately.

**Request Body:**

```json
{
  "user_id": "uuid",
  "title": "Notification Title",
  "body": "Notification body",
  "type": "custom",
  "data": {}
}
```

**Response:**

```json
{
  "data": {
    "success": true,
    "notification_id": "uuid"
  }
}
```

---

### Schedule Notification

**POST** `/notification-system/schedule`

Schedule a notification for later.

**Request Body:**

```json
{
  "user_id": "uuid",
  "title": "Reminder",
  "body": "Don't forget!",
  "reminder_time": "2025-02-01T10:00:00Z",
  "type": "reminder",
  "data": {}
}
```

**Response:**

```json
{
  "data": {
    "success": true,
    "reminder_id": "uuid"
  }
}
```

---

### Cancel Notification

**POST** `/notification-system/cancel`

Cancel a scheduled notification.

**Request Body:**

```json
{
  "reminder_id": "uuid"
}
```

**Response:**

```json
{
  "data": {
    "success": true
  }
}
```

---

## Analytics Operations

### Get Home Data

**GET** `/api-v2/analytics/home`

Get home screen analytics data.

**Response:**

```json
{
  "data": {
    "upcoming_tasks": [...],
    "recent_activity": [...],
    "stats": {...}
  }
}
```

---

### Get Calendar Data

**GET** `/api-v2/analytics/calendar?week_start=2025-01-27`

Get calendar data for a specific week.

**Query Parameters:**

- `week_start` (required): Start date of the week (YYYY-MM-DD)

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "start_time": "2025-01-27T10:00:00Z",
      ...
    }
  ]
}
```

---

### Get Streak Info

**GET** `/api-v2/analytics/streak`

Get user streak information.

**Response:**

```json
{
  "data": {
    "streak": 5,
    "lastActivity": "2025-01-31T00:00:00Z"
  }
}
```

---

### Export Data

**GET** `/api-v2/analytics/export`

Export all user data.

**Response:**

```json
{
  "data": {
    "courses": [...],
    "assignments": [...],
    "lectures": [...],
    "study_sessions": [...]
  }
}
```

---

## Query Operations

### Get Deleted Items

**GET** `/api-v2/queries/deleted-items`

Get all soft-deleted items across all tables.

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "course",
      "deleted_at": "2025-01-31T00:00:00Z",
      ...
    }
  ]
}
```

---

### Get Count

**GET** `/api-v2/queries/count?table=study_sessions&filters={"has_spaced_repetition":true}`

Get count of items with optional filters.

**Query Parameters:**

- `table` (required): Table name
- `filters` (optional): JSON string of filters

**Response:**

```json
{
  "data": {
    "count": 10
  }
}
```

---

## Batch Operations

### Execute Batch Operations

**POST** `/batch-operations`

Execute multiple operations in a single request.

**Request Body:**

```json
{
  "operations": [
    {
      "type": "create",
      "table": "assignments",
      "data": {
        "title": "Assignment 1",
        "due_date": "2025-02-01T00:00:00Z"
      }
    },
    {
      "type": "update",
      "table": "courses",
      "filters": { "id": "uuid" },
      "data": {
        "course_name": "Updated Name"
      }
    }
  ]
}
```

**Response:**

```json
{
  "data": {
    "processed": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse. Rate limits are enforced per user and per endpoint.

**Rate Limit Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Versioning

The API uses versioning through the path:

- `/api-v2/*` - Version 2 API (current)
- `/auth/*` - Authentication API (version-independent)

Future versions will be added as `/api-v3/*`, etc.

---

**Last Updated:** 2025-01-31
