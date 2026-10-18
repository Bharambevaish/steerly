# Firestore indexes needed by functions

Merge into `firestore.indexes.json` at the repo root.

```json
{
  "indexes": [
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "phone", "order": "ASCENDING" },
        { "fieldPath": "uid", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "reminderSent", "order": "ASCENDING" },
        { "fieldPath": "start", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "paidAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": [
    { "collectionGroup": "invites", "fieldPath": "phone", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "students", "fieldPath": "llTestDate", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "students", "fieldPath": "dlTestDate", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "enquiries", "fieldPath": "followUpAt", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "vehicles", "fieldPath": "insuranceExpiry", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "vehicles", "fieldPath": "pucExpiry", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] },
    { "collectionGroup": "vehicles", "fieldPath": "fitnessExpiry", "indexes": [
      { "order": "ASCENDING", "queryScope": "COLLECTION" },
      { "order": "DESCENDING", "queryScope": "COLLECTION" },
      { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" } ] }
  ]
}
```

Where each one is used:

- `students (phone, uid)` collection group: `verifyOtp` auto-links a student record.
- `bookings (status, reminderSent, start)` collection group: `lessonReminders`.
- `payments (status, paidAt)`: `getDashboardStats` revenue.
- Field overrides (collection-group single-field): `verifyOtp` invites lookup, `dailyDigest` (test dates, follow-ups, vehicle expiries).

Equality-only queries (`users.phone`, `students.phone`, `bookings.studentId`, `members.role`, `schools.subscription.status`) need no extra index.

Also recommended: a **TTL policy** on collection `otpRequests`, field `ttl`.
