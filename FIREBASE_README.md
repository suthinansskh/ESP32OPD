# Firebase Setup for ESP32

## Firebase Library Installation

### Using PlatformIO (Recommended)
The Firebase library is already installed in this project through the `platformio.ini` configuration:

```ini
lib_deps = 
    mobizt/Firebase Arduino Client Library for ESP8266 and ESP32@^4.4.14
```

If you need to update the library to a newer version, update the version number in `platformio.ini`.

### Using Arduino IDE
If you prefer using Arduino IDE:

1. Go to Sketch > Include Library > Manage Libraries
2. Search for "Firebase ESP32"
3. Install "Firebase Arduino Client Library for ESP8266 and ESP32" by Mobizt
4. Select the latest version

## Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select your existing project
3. Go to "Realtime Database" and create a database
4. Start in test mode (you can adjust security rules later)
5. Copy your database URL (should look like `https://your-project-id.firebaseio.com/`)

## Firebase Authentication

This project uses Anonymous Authentication. Make sure it's enabled:

1. In Firebase Console, go to "Authentication"
2. Click on "Sign-in method"
3. Enable "Anonymous" authentication

## Firebase Security Rules

For secure database access, update your Firebase security rules:

```json
{
  "rules": {
    "devices": {
      "$device_id": {
        "logs": {
          ".read": true,
          ".write": "auth != null",
          "$timestamp": {
            ".validate": "newData.isNumber() && newData.val() >= -40 && newData.val() <= 125"
          }
        },
        "info": {
          ".read": true,
          ".write": "auth != null",
          "zone": {
            ".validate": "newData.isString()"
          },
          "lastSeen": {
            ".validate": "newData.isNumber()"
          }
        }
      }
    }
  }
}
```

## Testing Firebase Connection

To test your Firebase connection:
1. Review the `firebase_test.cpp` file
2. Update your WiFi credentials and Firebase project details
3. Build and upload the sketch
4. Monitor the serial output for connection status

## Troubleshooting

If you encounter issues:

1. **Connection Problems**:
   - Verify WiFi credentials
   - Check Firebase project settings
   - Ensure API key is correct

2. **Authentication Errors**:
   - Verify Anonymous Authentication is enabled
   - Check if your device time is accurate (required for token generation)

3. **Write Permission Errors**:
   - Verify Firebase security rules
   - Ensure authentication is successful before writing data

4. **Compilation Errors**:
   - Make sure all required libraries are installed
   - Include the necessary headers: `Firebase_ESP_Client.h`, `TokenHelper.h`, and `RTDBHelper.h`

## Additional Resources

- [Firebase Arduino Client Library Documentation](https://github.com/mobizt/Firebase-ESP-Client)
- [Firebase Realtime Database Guide](https://firebase.google.com/docs/database)
- [ESP32 Firebase Examples](https://github.com/mobizt/Firebase-ESP-Client/tree/main/examples)
