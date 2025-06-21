# ESP32 Temperature Monitoring System

A complete IoT temperature monitoring solution using ESP32, DS18B20 sensor, OLED display, Firebase Realtime Database, and a modern web dashboard.

## 🌟 Features

### ESP32 Firmware
- **WiFiManager Integration**: Easy WiFi configuration through captive portal
- **DS18B20 Temperature Sensor**: Accurate temperature readings
- **OLED Display**: Real-time status and temperature display
- **Firebase Integration**: Secure data transmission to cloud database
- **Custom Device Configuration**: Device ID and zone settings
- **Automatic Reconnection**: Robust connection handling

### Web Dashboard
- **Real-time Monitoring**: Live temperature updates from Firebase
- **Multi-device Support**: Monitor multiple ESP32 devices
- **Interactive Charts**: Temperature history with Chart.js
- **Time Period Filters**: 1H, 6H, 24H, 7D views
- **Statistics**: Min/Max/Average temperature calculations
- **Data Export**: Download temperature data as CSV
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Theme**: Toggle between themes
- **Connection Status**: Real-time Firebase connection monitoring

## 🛠️ Hardware Requirements

- ESP32 Development Board
- DS18B20 Temperature Sensor
- 4.7kΩ Pull-up Resistor
- 0.96" OLED Display (SSD1306)
- Breadboard and Jumper Wires

## 🔌 Wiring Diagram

```
ESP32           DS18B20         OLED Display
-----           -------         ------------
GPIO 13    <->  Data Pin        
3.3V       <->  VCC        <->  VCC
GND        <->  GND        <->  GND
GPIO 21    <->                  SDA
GPIO 22    <->                  SCL

Pull-up Resistor: 4.7kΩ between VCC and Data Pin of DS18B20
```

## 🚀 Getting Started

### 1. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Realtime Database
3. Get your Firebase configuration (API key, Database URL)
4. Update `src/main.cpp` with your Firebase credentials:

```cpp
#define API_KEY "your-api-key"
#define DATABASE_URL "your-database-url"
#define DATABASE_SECRET "your-database-secret"
```

### 2. ESP32 Firmware Upload

1. Install [PlatformIO](https://platformio.org/)
2. Open the project in VS Code with PlatformIO extension
3. Connect your ESP32 via USB
4. Upload the firmware:

```bash
pio run --target upload
```

### 3. WiFi Configuration

1. After uploading, the ESP32 will create a WiFi hotspot named "ESP32-Config"
2. Connect to this network with password "12345678"
3. Open browser and go to `192.168.4.1`
4. Configure your WiFi credentials and device settings

### 4. Web Dashboard Setup

#### Option 1: Simple File Access
Open `dashboard/index.html` in your web browser

#### Option 2: Local Server (Recommended)
```bash
cd dashboard
python3 server.py
```
Then open `http://localhost:8000`

#### Option 3: Deploy to Web Server
Upload the dashboard folder to any web hosting service

### 5. Firebase Rules (Important!)

Set your Firebase Realtime Database rules to allow read/write access:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## 📊 Data Structure

The system uses the following Firebase data structure:

```json
{
  "devices": {
    "ESP32_XXXXXX": {
      "zone": "Living Room",
      "lastSeen": 1640995200000,
      "logs": {
        "1640995200000": 25.5,
        "1640995260000": 25.7
      }
    }
  }
}
```

## 🖥️ Dashboard Features

### Real-time Monitoring
- Live temperature updates every 10 seconds
- Connection status indicator
- Multi-device support with device selection

### Data Visualization
- Interactive temperature charts
- Multiple time period views (1H, 6H, 24H, 7D)
- Min/Max/Average statistics
- Temperature trend analysis

### Data Management
- Export temperature data as CSV
- Device management and status monitoring
- Error handling and retry mechanisms

### Customization
- Settings panel for dashboard configuration
- Dark/Light theme toggle
- Adjustable refresh intervals
- Temperature unit conversion

## 🔧 Troubleshooting

### ESP32 Issues
- **WiFi Connection**: Ensure correct credentials in WiFiManager
- **Sensor Reading**: Check DS18B20 wiring and pull-up resistor
- **Firebase Auth**: Verify API key and database secret
- **OLED Display**: Confirm I2C connections (SDA: GPIO 21, SCL: GPIO 22)

### Dashboard Issues
- **No Data**: Check Firebase rules and ESP32 connection
- **Connection Error**: Verify Firebase configuration in `script.js`
- **Charts Not Loading**: Ensure internet connection for CDN resources

### Firebase Issues
- **Permission Denied**: Check database rules
- **SSL Certificate**: Ensure ESP32 has proper certificates for HTTPS

## 📁 Project Structure

```
ESP32OPD/
├── src/
│   └── main.cpp              # ESP32 firmware
├── dashboard/
│   ├── index.html            # Dashboard UI
│   ├── script.js             # Firebase integration
│   ├── style.css             # Dashboard styling
│   └── server.py             # Local development server
├── platformio.ini            # PlatformIO configuration
├── FIREBASE_SETUP.md         # Firebase setup guide
└── README.md                 # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [PlatformIO](https://platformio.org/) for the development platform
- [Firebase](https://firebase.google.com/) for real-time database
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Font Awesome](https://fontawesome.com/) for icons

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Made with ❤️ for IoT enthusiasts**
