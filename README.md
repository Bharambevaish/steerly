# Steerly - Driving School Management Suite

Steerly is a white-label platform for driving schools. This repository houses two connected applications that share the same Firebase backend:

1. **`customer-app/`** - A customer-facing mobile application built with **React Native** and **Expo** (TypeScript template).
2. **`admin-dashboard/`** - An administrative web dashboard built with **React**, **Vite**, and **Tailwind CSS v3**.

---

## Architecture Overview

```
steerly/
├── customer-app/          # Mobile app for students/customers (Expo + React Native)
│   ├── firebase.js        # Firebase configuration (Auth & Firestore)
│   └── ...
├── admin-dashboard/       # Web portal for driving school staff & admins (Vite + React + Tailwind)
│   ├── src/
│   │   ├── firebase.js    # Firebase configuration (Auth & Firestore)
│   │   └── ...
│   └── ...
├── .gitignore             # Shared git ignore rules
└── README.md              # Project documentation
```

### Shared Backend (Firebase)
Both applications connect to the same Firebase project:
- **Project ID**: `prince-driving-school`
- **Firebase Authentication**: Manages users, credentials, and access roles.
- **Cloud Firestore**: Real-time database shared across mobile and web.
- **Firebase Storage**: File and asset storage bucket.

---

## Getting Started

### 1. Customer Mobile App (`customer-app`)
To run the mobile app on an emulator or your physical device using Expo Go:

```bash
cd customer-app
npm install        # (already installed during initial setup)
npx expo start
```

Press:
- `a` to open in Android Emulator
- `i` to open in iOS Simulator (macOS only)
- `w` to open in web browser
- Or scan the QR code using the **Expo Go** app on your phone.

---

### 2. Admin Web Dashboard (`admin-dashboard`)
To start the local web development server for the administrative dashboard:

```bash
cd admin-dashboard
npm install        # (already installed during initial setup)
npm run dev
```

The terminal will provide a local URL (typically `http://localhost:5173`) that you can open in any browser.

To build the admin dashboard for production:
```bash
npm run build
```
