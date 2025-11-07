# PII Data Classification and Mapping

**Document Version:** 1.0  
**Last Updated:** 2025-01-31  
**Purpose:** Comprehensive mapping of all Personally Identifiable Information (PII) stored in the ELARO application for GDPR, CCPA, and general compliance purposes.

---

## Overview

This document identifies all locations where PII is stored, including:
- Database tables and fields
- Storage locations
- Retention periods
- Access controls
- Legal basis for processing

---

## PII Classification Levels

### Level 1: Direct Identifiers (High Sensitivity)
- Email addresses
- Names (first, last, full)
- Usernames
- Phone numbers
- Date of birth
- Physical addresses

### Level 2: Indirect Identifiers (Medium Sensitivity)
- User IDs (UUIDs)
- Device tokens
- IP addresses (if stored)
- Location data (country, city)
- University/Program information

### Level 3: Behavioral Data (Lower Sensitivity)
- Usage patterns
- Preferences
- Activity timestamps

---

## Database Tables Containing PII

### 1. `users` Table

**Table Purpose:** Primary user profile and authentication data

**PII Fields:**

| Field Name | PII Type | Sensitivity | Retention Period | Access Level |
|------------|----------|-------------|------------------|--------------|
| `id` | UUID (User Identifier) | Level 2 | Indefinite (until account deletion) | User (own), Admin (all) |
| `email` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all), System (for notifications) |
| `first_name` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all) |
| `last_name` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all) |
| `username` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all), Public (if profile is public) |
| `country` | Indirect Identifier | Level 2 | Indefinite (until account deletion) | User (own), Admin (all) |
| `university` | Indirect Identifier | Level 2 | Indefinite (until account deletion) | User (own), Admin (all) |
| `program` | Indirect Identifier | Level 2 | Indefinite (until account deletion) | User (own), Admin (all) |
| `date_of_birth` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all) |
| `timezone` | Behavioral Data | Level 3 | Indefinite (until account deletion) | User (own), Admin (all), System (for scheduling) |

**Legal Basis:** GDPR Article 6(1)(b) - Contract performance (service provision)

**Retention Policy:**
- Active accounts: Retained indefinitely
- Deleted accounts: Soft-deleted for 7 days, then permanently deleted
- Suspended accounts: Retained until suspension ends or account is deleted

**Access Controls:**
- Users can view/edit their own profile data
- Admins can view/edit all user data
- System can read email for notifications (RLS enforced)

---

### 2. `user_devices` Table

**Table Purpose:** Device registration for push notifications

**PII Fields:**

| Field Name | PII Type | Sensitivity | Retention Period | Access Level |
|------------|----------|-------------|------------------|--------------|
| `id` | UUID (Device Identifier) | Level 2 | Until device unregistered or account deleted | User (own devices), Admin (all) |
| `user_id` | UUID (User Identifier) | Level 2 | Until device unregistered or account deleted | User (own devices), Admin (all) |
| `push_token` | Device Identifier | Level 2 | Until device unregistered or account deleted | System (for notifications only), Admin (all) |
| `platform` | Device Information | Level 3 | Until device unregistered or account deleted | User (own devices), Admin (all) |

**Legal Basis:** GDPR Article 6(1)(b) - Contract performance (push notification delivery)

**Retention Policy:**
- Active devices: Retained until unregistered
- Account deletion: All devices deleted immediately
- No push_token included in data exports (privacy protection)

**Access Controls:**
- Users cannot directly access push_token (system-only)
- Users can view their device list (platform, updated_at only)
- Admins can view all device data

---

### 3. `admin_actions` Table

**Table Purpose:** Audit trail of administrative actions

**PII Fields:**

| Field Name | PII Type | Sensitivity | Retention Period | Access Level |
|------------|----------|-------------|------------------|--------------|
| `id` | UUID (Action Identifier) | Level 2 | 7 years (legal compliance) | Admin (all) |
| `admin_id` | UUID (Admin User Identifier) | Level 2 | 7 years | Admin (all) |
| `target_user_id` | UUID (Target User Identifier) | Level 2 | 7 years | Admin (all), Target User (own actions only) |
| `action` | Action Type | Level 3 | 7 years | Admin (all), Target User (own actions only) |
| `reason` | Action Reason | Level 3 | 7 years | Admin (all), Target User (own actions only) |
| `admin_notes` | Notes | Level 3 | 7 years | Admin (all) |
| `metadata` | JSONB (Additional Context) | Level 3 | 7 years | Admin (all) |

**Legal Basis:** GDPR Article 6(1)(f) - Legitimate interests (security, fraud prevention, audit trail)

**Retention Policy:**
- 7 years retention for legal compliance and audit purposes
- Deleted when account is permanently deleted (7 days after soft delete)

**Access Controls:**
- Admins can view all actions
- Users can view actions performed on their account (RLS enforced)
- Target users can view their own admin actions in data export

---

### 4. `notification_deliveries` Table

**Table Purpose:** Notification delivery tracking and analytics

**PII Fields:**

| Field Name | PII Type | Sensitivity | Retention Period | Access Level |
|------------|----------|-------------|------------------|--------------|
| `id` | UUID (Delivery Identifier) | Level 2 | 90 days | User (own), Admin (all) |
| `user_id` | UUID (User Identifier) | Level 2 | 90 days | User (own), Admin (all) |
| `device_token` | Device Identifier | Level 2 | 90 days | System (for delivery only), Admin (all) |
| `title` | Notification Content | Level 3 | 90 days | User (own), Admin (all) |
| `body` | Notification Content | Level 3 | 90 days | User (own), Admin (all) |
| `deep_link_url` | URL | Level 3 | 90 days | User (own), Admin (all) |

**Legal Basis:** GDPR Article 6(1)(b) - Contract performance (notification delivery)

**Retention Policy:**
- 90 days retention for delivery analytics
- Automatic cleanup via scheduled function
- Not included in standard data exports (user can request separately)

**Access Controls:**
- Users can view their own notification history
- Admins can view all notification deliveries
- System uses device_token for delivery only

---

### 5. `profiles` Table

**Table Purpose:** Extended user profile information (if exists)

**PII Fields:**

| Field Name | PII Type | Sensitivity | Retention Period | Access Level |
|------------|----------|-------------|------------------|--------------|
| `id` | UUID (Profile Identifier) | Level 2 | Indefinite (until account deletion) | User (own), Admin (all) |
| `full_name` | Direct Identifier | Level 1 | Indefinite (until account deletion) | User (own), Admin (all) |

**Legal Basis:** GDPR Article 6(1)(b) - Contract performance

**Retention Policy:** Same as `users` table

**Access Controls:** Same as `users` table

---

## User-Created Content Tables

The following tables contain user-generated content but are not primarily PII:

### `assignments`, `courses`, `lectures`, `study_sessions`
- **PII Content:** `user_id` (indirect identifier)
- **User Data:** Course names, assignment titles, descriptions, dates
- **Retention:** Indefinite (until account deletion)
- **Access:** User (own), Admin (all)
- **Legal Basis:** GDPR Article 6(1)(b) - Contract performance

### `reminders`
- **PII Content:** `user_id` (indirect identifier)
- **User Data:** Reminder times, types
- **Retention:** Indefinite (until account deletion)
- **Access:** User (own), Admin (all)
- **Legal Basis:** GDPR Article 6(1)(b) - Contract performance

### `streaks`
- **PII Content:** `user_id` (indirect identifier)
- **User Data:** Streak counts, activity dates
- **Retention:** Indefinite (until account deletion)
- **Access:** User (own), Admin (all)
- **Legal Basis:** GDPR Article 6(1)(b) - Contract performance

---

## Storage Locations

### Database (Supabase PostgreSQL)
- **Primary Location:** All PII is stored in Supabase PostgreSQL database
- **Encryption:** At rest encryption enabled (Supabase managed)
- **Backup:** Daily backups retained for 7 days
- **Location:** Supabase-managed infrastructure (region-specific)

### File Storage (Supabase Storage)
- **Bucket:** `logs` (system logs only)
- **PII Content:** None (logs are redacted before storage)
- **Retention:** 30 days (error logs), 7 days (general logs)

### Third-Party Services
- **Expo Push Notifications:** Device tokens (for push delivery only)
- **RevenueCat:** Subscription data (no PII, only subscription status)
- **Mixpanel:** Analytics (no PII, hashed user IDs only)
- **Sentry:** Error tracking (no PII, hashed user IDs only)

---

## Data Retention Summary

| Data Type | Retention Period | Deletion Trigger |
|-----------|------------------|------------------|
| Active User Accounts | Indefinite | User-initiated deletion |
| Deleted User Accounts | 7 days | Automatic permanent deletion |
| Admin Actions | 7 years | Legal compliance requirement |
| Notification Deliveries | 90 days | Automatic cleanup |
| System Logs | 30 days (errors), 7 days (general) | Automatic cleanup |
| Database Backups | 7 days | Automatic cleanup |

---

## Access Control Matrix

| Role | Users Table | User Devices | Admin Actions | Notification Deliveries | User Content |
|------|-------------|--------------|---------------|------------------------|--------------|
| **User (Own Data)** | Read/Write | Read (limited) | Read (own actions) | Read (own) | Read/Write |
| **User (Other Users)** | None | None | None | None | None |
| **Admin** | Read/Write (all) | Read/Write (all) | Read/Write (all) | Read (all) | Read/Write (all) |
| **System** | Read (email only) | Read (push_token only) | Write (audit) | Write/Read | Read/Write (via API) |

---

## Legal Basis for Processing

### GDPR Article 6(1)(b) - Contract Performance
- **Applies to:** User profile data, user-created content, device tokens
- **Purpose:** Provision of core app functionality
- **Retention:** Until account deletion

### GDPR Article 6(1)(f) - Legitimate Interests
- **Applies to:** Admin actions, audit logs
- **Purpose:** Security, fraud prevention, legal compliance
- **Retention:** 7 years

### GDPR Article 6(1)(a) - Consent
- **Applies to:** Marketing communications (`marketing_opt_in` field)
- **Purpose:** Marketing email opt-in
- **Retention:** Until consent withdrawn

---

## Data Export and Deletion Rights

### Right to Access (GDPR Article 15)
- Users can export all their data via `/export-user-data` endpoint
- Export includes all PII and user-created content
- Rate limited: Once per 7 days
- Formats: JSON (default), CSV (optional)

### Right to Erasure (GDPR Article 17)
- Users can request account deletion
- Soft delete: Immediate (7-day recovery period)
- Permanent deletion: After 7 days
- All PII and user-created content is permanently deleted
- Admin actions retained for 7 years (legal compliance)

### Right to Rectification (GDPR Article 16)
- Users can update their profile data at any time
- Changes are immediately reflected
- No approval required for standard fields

### Right to Portability (GDPR Article 20)
- Data export provides machine-readable format (JSON/CSV)
- Users can transfer their data to another service
- Export includes all user-created content

---

## Security Measures

### Encryption
- **At Rest:** Database encryption (Supabase managed)
- **In Transit:** TLS/SSL for all connections
- **Application Level:** No PII stored in plain text logs

### Access Controls
- **Row Level Security (RLS):** Enforced on all tables
- **Role-Based Access:** User, Admin, System roles
- **Authentication:** Supabase Auth (JWT tokens)

### Data Minimization
- Only necessary PII is collected
- No sensitive payment information stored (RevenueCat handles this)
- Device tokens excluded from data exports

---

## Third-Party Data Sharing

| Service | Data Shared | Purpose | Legal Basis |
|---------|-------------|---------|-------------|
| **Expo Push Notifications** | Device tokens only | Push notification delivery | Contract performance |
| **RevenueCat** | Subscription status only | Subscription management | Contract performance |
| **Mixpanel** | Hashed user IDs, analytics events | Usage analytics | Legitimate interests |
| **Sentry** | Hashed user IDs, error logs | Error tracking | Legitimate interests |

**Note:** No PII (email, names, etc.) is shared with third-party services.

---

## Compliance Checklist

- ✅ PII inventory complete
- ✅ Retention periods defined
- ✅ Access controls documented
- ✅ Legal basis identified
- ✅ Data export functionality implemented
- ✅ Account deletion functionality implemented
- ✅ Privacy policy accessible
- ✅ Terms of service accessible
- ✅ User consent mechanisms in place

---

## Contact Information

For data protection inquiries:
- **Email:** [Your Data Protection Officer Email]
- **Privacy Policy:** https://myelaro.com/privacy
- **Terms of Service:** https://myelaro.com/terms

---

## Document Maintenance

This document should be reviewed and updated:
- Quarterly (regular review)
- When new PII fields are added
- When retention policies change
- When legal requirements change
- After security audits

**Last Review Date:** 2025-01-31  
**Next Review Date:** 2025-04-30

