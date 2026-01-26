# Firebase Cloud Functions Setup with pnpm

## Prerequisites

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
# or
pnpm add -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

## Initialize Firebase Functions

```bash
firebase init functions
```

When prompted:
- Select JavaScript or TypeScript
- Choose to install dependencies (or skip and use pnpm manually)

## Configure pnpm for Functions

After initialization, you have two options:

### Option 1: Use .npmrc in functions directory

Create `functions/.npmrc`:
```
package-manager=pnpm
```

### Option 2: Configure in firebase.json

Update `firebase.json` to specify pnpm:
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "packageManager": "pnpm"
  }
}
```

## Install Dependencies

```bash
cd functions
pnpm install firebase-functions firebase-admin
```

## Create the Cloud Function

Create `functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createUser = functions.https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if user is admin
  const adminDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create users');
  }

  const { email, password, displayName, role } = data;

  try {
    // Create user in Firebase Auth using Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || null,
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      displayName: displayName || null,
      role: role || 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid, email: userRecord.email };
  } catch (error) {
    console.error('Error creating user:', error);
    let errorMessage = 'Failed to create user. Please try again.';
    
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'An account with this email already exists.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new functions.https.HttpsError('internal', errorMessage);
  }
});
```

## Deploy

```bash
firebase deploy --only functions
```

## Update Frontend

You'll need to:
1. Export `functions` from `src/firebase/config.js`
2. Update `src/composables/useAdmin.js` to call the Cloud Function

## Important Notes

- **Firebase Blaze Plan Required**: Cloud Functions require a Blaze (pay-as-you-go) plan, but the free tier includes generous usage
- **pnpm Support**: Firebase CLI supports pnpm, but you may need to configure it explicitly
- **Node.js Version**: Make sure your functions use a compatible Node.js version (check `functions/package.json`)
