# Firebase Setup Guide for ESP32

## Step 1: Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Click on "Project Settings" (gear icon)

## Step 2: Get Web API Key

1. In Project Settings, go to "General" tab
2. Scroll down to "Your apps" section
3. If no web app exists, click "Add app" and select Web app
4. Copy the **Web API Key** from the config object

## Step 3: Setup Realtime Database

1. Go to "Realtime Database" in the left sidebar
2. Click "Create Database"
3. Choose location (preferably closest to your device)
4. Start in **test mode** for now (you can secure it later)
5. Copy the **Database URL** (looks like: `https://your-project-default-rtdb.firebaseio.com/`)

## Step 4: Database Rules (Important!)

In Realtime Database > Rules, set these rules for testing:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ Warning: These rules allow anyone to read/write. Use only for testing!**

For production, use more secure rules like:
```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## Step 5: Update ESP32 Code

Replace the placeholder values in `src/main.c`:

```c
#define FIREBASE_HOST "https://your-actual-project-default-rtdb.firebaseio.com/"
#define FIREBASE_AUTH "your-actual-web-api-key"
```

## Example Configuration

If your project is called "esp32-temperature" and located in "asia-southeast1":

```c
#define FIREBASE_HOST "https://esp32-temperature-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "AIzaSyABC123def456GHI789jkl012MNO345pqr"  // Example key
```

## Data Structure

Your temperature data will be stored as:
```
/devices/
  /{your-device-id}/
    /logs/
      /1234567890: 25.6
      /1234567900: 25.8
      /1234567910: 25.4
```

## Testing

1. Upload code to ESP32
2. Connect to WiFi using WiFiManager
3. Check Serial Monitor for Firebase connection status
4. Go to Firebase Console > Realtime Database to see incoming data

## Troubleshooting

- **"Firebase not ready"**: Check WiFi connection and credentials
- **"Failed to send to Firebase"**: Check database rules and URL
- **No data appearing**: Verify the database URL ends with `/`
