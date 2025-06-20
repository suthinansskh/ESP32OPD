# ESP32 Temperature Dashboard Server

This is a Spring Boot backend application for the ESP32 Temperature Monitoring System. It provides a web interface to view temperature data and configure ESP32 devices.

## Features

- Real-time temperature monitoring
- Device configuration management
- Historical temperature data visualization
- Telegram alert integration
- Zone-based device grouping

## Prerequisites

1. JDK 17 or newer
2. Maven 3.6+
3. Firebase account with Realtime Database
4. Firebase service account credentials

## Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (if not already created)
3. Set up Realtime Database
4. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file and save it as `firebase-service-account.json` in the root of this project

### 2. Application Configuration

1. Edit `src/main/resources/application.properties` to match your Firebase database URL:
   ```
   firebase.database.url=https://your-project-id.firebaseio.com
   ```

### 3. Building and Running

```bash
# Build the application
mvn clean package

# Run the application
java -jar target/esp32-dashboard-0.0.1-SNAPSHOT.jar
```

The application will start on port 8080 by default. You can access it at `http://localhost:8080`

## Integration with ESP32 Devices

The ESP32 devices should be programmed to:

1. Send temperature data to Firebase in the following format:
   ```
   devices/{device-id}/logs/{timestamp} = temperature_value
   ```

2. Update device information:
   ```
   devices/{device-id}/info/lastSeen = timestamp
   devices/{device-id}/info/temperature = current_temperature
   devices/{device-id}/info/ip = device_ip
   devices/{device-id}/info/zone = zone_name
   ```

3. Regularly check for configuration updates:
   ```
   devices/{device-id}/config/
   ```

## API Endpoints

- `GET /api/devices` - List all devices
- `GET /api/devices/{deviceId}/logs` - Get temperature logs for a device
- `GET /api/devices/{deviceId}/config` - Get device configuration
- `POST /api/devices/{deviceId}/config` - Update device configuration
- `PUT /api/devices/{deviceId}/zone` - Update device zone

## Dashboard

The web dashboard provides the following functionality:

- Device selection and overview
- Real-time temperature display
- Historical temperature graph
- Device configuration
  - Temperature threshold for alerts
  - Telegram notification settings
  - Zone assignment

## Extending the Application

You can extend this application with additional features:

- User authentication
- Email notifications
- Data export functionality
- Mobile app integration
- Multiple sensor support
