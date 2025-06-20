# ESP32 + DS18B20 + OLED + Firebase Setup Guide

## Hardware Connections

### DS18B20 Temperature Sensor
- VCC → 3.3V
- GND → GND  
- DATA → GPIO 4 (with 4.7kΩ pull-up resistor to 3.3V)

### OLED Display (SSD1306 I2C)
- VCC → 3.3V
- GND → GND
- SDA → GPIO 21
- SCL → GPIO 22

### ESP32 Pinout Used
- GPIO 4: DS18B20 Data line
- GPIO 21: I2C SDA (OLED)
- GPIO 22: I2C SCL (OLED)

## Software Setup

### 1. PlatformIO Configuration
The `platformio.ini` file is configured with all necessary libraries:
- WiFiManager for easy WiFi setup
- Firebase Client Library
- DallasTemperature for DS18B20
- OneWire library
- Adafruit SSD1306 for OLED
- Adafruit GFX Library

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Realtime Database
4. Get your Web API Key from Project Settings
5. Get your Database URL from Realtime Database settings
6. Update the following in `src/main.c`:
   ```c
   #define FIREBASE_HOST "https://your-project-default-rtdb.firebaseio.com/"
   #define FIREBASE_AUTH "your-firebase-web-api-key"
   ```

### 3. WiFi Setup
1. Upload the code to ESP32
2. ESP32 will create a WiFi hotspot named "ESP32_Setup"
3. Connect to this hotspot with your phone/computer
4. Enter your WiFi credentials and Device ID
5. Device will connect to your WiFi and start sending data

## Features

- **Temperature Monitoring**: Reads DS18B20 sensor every 10 seconds
- **OLED Display**: Shows Device ID, Temperature, and IP Address
- **Firebase Integration**: Sends temperature data to Firebase Realtime Database
- **WiFi Manager**: Easy WiFi configuration via web interface
- **Device ID**: Persistent device identification stored in EEPROM
- **Error Handling**: Firebase connection status and error reporting

## Data Structure in Firebase
```
/devices/
  /{device_id}/
    /logs/
      /{timestamp}: temperature_value
```

## Troubleshooting

1. **OLED Not Working**: Check I2C connections and address (0x3C)
2. **Temperature Reading -127°C**: Check DS18B20 wiring and pull-up resistor
3. **Firebase Not Connecting**: Verify credentials and internet connection
4. **WiFi Issues**: Reset and reconfigure using WiFiManager

## Serial Monitor Output
Monitor at 115200 baud rate to see:
- WiFi connection status
- Device ID
- Temperature readings
- Firebase upload status
- Error messages
