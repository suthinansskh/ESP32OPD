#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <esp_heap_caps.h>

// ESP32 memory optimization
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <esp_heap_caps.h>
#define ENABLE_RTDB
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Firebase setup - Replace with your actual Firebase credentials
#define FIREBASE_HOST "https://opdesp32-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "AIzaSyDu96XHQVxo46thtvzVgPGvNitQX7NroWA"
#define FIREBASE_DATABASE_SECRET "4BaURFRlzUbwiWp3dO1kciwxYjqUY9AaRrw3EQ6r"

// Firebase objects
FirebaseData fbdo;         // Firebase Data object
FirebaseAuth auth;         // Firebase Authentication object
FirebaseConfig config;     // Firebase configuration object

// Variables for Firebase connection status
bool firebaseInitialized = false;
unsigned long firebaseReconnectTimer = 0;
const unsigned long FIREBASE_RECONNECT_INTERVAL = 30000; // 30 seconds

// DS18B20
#define ONE_WIRE_BUS 13
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Device ID config
char deviceID[32] = "";
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 0;
const int   daylightOffset_sec = 0;

// Temperature reading interval (5 seconds)
const unsigned long TEMP_READ_INTERVAL = 5000;
unsigned long lastTempRead = 0;

void saveDeviceID(const char* id) {
  EEPROM.begin(64);
  for (int i = 0; i < 32; i++) EEPROM.write(i, id[i]);
  EEPROM.commit();
}

void loadDeviceID() {
  EEPROM.begin(64);
  for (int i = 0; i < 32; i++) deviceID[i] = EEPROM.read(i);
}

void updateDisplay(float temperature) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("Device: ");
  display.println(deviceID);
  
  display.setTextSize(2);
  display.setCursor(0, 20);
  display.print(temperature, 1);
  display.print(" C");
  
  display.setTextSize(1);
  display.setCursor(0, 45);
  display.print("IP: ");
  display.println(WiFi.localIP());
  
  // Show Firebase status
  display.setCursor(0, 55);
  display.print("FB: ");
  display.println(firebaseInitialized ? "Connected" : "Disconnected");
  
  display.display();
}

bool testFirebaseConnection() {
  if (!Firebase.ready()) {
    Serial.println("Firebase not ready");
    return false;
  }
  
  // Try to write a test value
  Serial.println("Testing Firebase connection...");
  char testPath[50];
  snprintf(testPath, sizeof(testPath), "devices/%s/test", deviceID);
  
  if (Firebase.RTDB.setInt(&fbdo, testPath, millis())) {
    Serial.println("Firebase test successful!");
    return true;
  } else {
    Serial.print("Firebase test failed: ");
    Serial.println(fbdo.errorReason());
    return false;
  }
}

void logTemperature(float temperature) {
  if (!Firebase.ready() || !firebaseInitialized) {
    Serial.println("Firebase not ready");
    return;
  }

  // Get current timestamp
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return;
  }

  char timestamp[24];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  
  char devicePath[100];
  snprintf(devicePath, sizeof(devicePath), "devices/%s/logs/%s", deviceID, timestamp);
  
  if (Firebase.RTDB.setFloat(&fbdo, devicePath, temperature)) {
    Serial.print("Temperature logged: ");
    Serial.println(temperature);
    
    // Also update latest reading separately for quick access
    char latestPath[50];
    snprintf(latestPath, sizeof(latestPath), "devices/%s/latest", deviceID);
    Firebase.RTDB.setFloat(&fbdo, latestPath, temperature);
    
    // Update device info
    char infoPath[50];
    snprintf(infoPath, sizeof(infoPath), "devices/%s/info", deviceID);
    FirebaseJson json;
    json.set("lastSeen", (int)time(NULL));
    json.set("temperature", temperature);
    json.set("status", "online");
    
    // Get zone if it exists, otherwise use default
    FirebaseJson jsonZone;
    char zonePath[60];
    snprintf(zonePath, sizeof(zonePath), "devices/%s/info/zone", deviceID);
    if (!Firebase.RTDB.getJSON(&fbdo, zonePath)) {
      // If zone doesn't exist yet, set default zone
      json.set("zone", "Building 1");
    }
    
    // Format IP address
    char ipStr[16];
    snprintf(ipStr, sizeof(ipStr), "%d.%d.%d.%d", 
             WiFi.localIP()[0], WiFi.localIP()[1], 
             WiFi.localIP()[2], WiFi.localIP()[3]);
    json.set("ip", ipStr);
    
    // Set ESP32 metadata
    json.set("deviceType", "ESP32-Temperature");
    json.set("firmwareVersion", "1.0");
    json.set("battery", 100);  // Placeholder, for battery-powered devices
    
    Firebase.RTDB.updateNodeAsync(&fbdo, infoPath, &json);
  } else {
    Serial.print("Failed to log temperature: ");
    Serial.println(fbdo.errorReason());
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Starting...");
  
  sensors.begin();

  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print("Starting...");
  display.display();

  WiFiManager wm;
  WiFiManagerParameter custom_id("device_id", "Device ID", deviceID, 32);
  wm.addParameter(&custom_id);

  if (!wm.autoConnect("ESP32_Setup")) {
    Serial.println("Failed to connect. Restarting...");
    delay(3000);
    ESP.restart();
  }

  strcpy(deviceID, custom_id.getValue());
  saveDeviceID(deviceID);
  loadDeviceID();

  Serial.print("Connected! Device ID: ");
  Serial.println(deviceID);
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Init time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  // Firebase configuration
  config.api_key = FIREBASE_AUTH;
  config.database_url = FIREBASE_HOST;
  config.token_status_callback = tokenStatusCallback;
  
  // Initialize Firebase
  Serial.println("Initializing Firebase...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Wait for Firebase to be ready
  unsigned long firebaseTimeout = millis();
  while (!Firebase.ready() && millis() - firebaseTimeout < 10000) {
    Serial.print(".");
    delay(300);
  }
    if (Firebase.ready()) {
    Serial.println("\nFirebase connected successfully!");
    
    // Test the connection
    if (testFirebaseConnection()) {
      firebaseInitialized = true;
      
      // Update device info with connection status
      char infoPath[50];
      snprintf(infoPath, sizeof(infoPath), "devices/%s/info", deviceID);
      FirebaseJson json;
      json.set("status", "online");
      json.set("lastConnected", (int)time(NULL));
      json.set("firmwareVersion", "1.0");
      json.set("deviceType", "ESP32-Temperature-Monitor");
      json.set("zone", "Building 1");  // Default zone, can be updated via dashboard
      Firebase.RTDB.setJSON(&fbdo, infoPath, &json);
      
      Serial.println("Device info updated in Firebase");
    } else {
      Serial.println("Firebase test failed, check configuration");
    }
  } else {
    Serial.println("\nFailed to initialize Firebase");
  }
}

// Config variables
float tempThreshold = 30.0;
String telegramBotToken = "";
String telegramChatId = "";
bool alertEnabled = false;
unsigned long configCheckInterval = 60000; // Check config every minute
unsigned long lastConfigCheck = 0;

void checkDeviceConfig() {
  if (!Firebase.ready() || !firebaseInitialized) {
    return;
  }
  
  Serial.println("Checking device configuration...");
  
  char configPath[50];
  snprintf(configPath, sizeof(configPath), "devices/%s/config", deviceID);
  
  char fullPath[80];
  
  // Check for alert enabled setting
  snprintf(fullPath, sizeof(fullPath), "devices/%s/config/alertEnabled", deviceID);
  if (Firebase.RTDB.getBool(&fbdo, fullPath)) {
    alertEnabled = fbdo.boolData();
    Serial.print("Alert enabled: ");
    Serial.println(alertEnabled ? "Yes" : "No");
  }
  
  // Check for threshold setting
  snprintf(fullPath, sizeof(fullPath), "devices/%s/config/threshold", deviceID);
  if (Firebase.RTDB.getFloat(&fbdo, fullPath)) {
    tempThreshold = fbdo.floatData();
    Serial.print("Temperature threshold: ");
    Serial.println(tempThreshold);
  }
  
  // Check for Telegram token
  snprintf(fullPath, sizeof(fullPath), "devices/%s/config/telegramToken", deviceID);
  if (Firebase.RTDB.getString(&fbdo, fullPath)) {
    telegramBotToken = fbdo.stringData();
    Serial.println("Telegram token updated");
  }
  
  // Check for chat ID
  snprintf(fullPath, sizeof(fullPath), "devices/%s/config/chatId", deviceID);
  if (Firebase.RTDB.getString(&fbdo, fullPath)) {
    telegramChatId = fbdo.stringData();
    Serial.println("Telegram chat ID updated");
  }
}

void sendTelegramAlert(float temperature) {
  if (!alertEnabled || telegramBotToken.length() < 10 || telegramChatId.length() < 3) {
    return;
  }
  
  // This is a placeholder for Telegram functionality
  // For a real implementation, you would use a library like
  // "WiFiClientSecure" and "UniversalTelegramBot"
  Serial.println("ALERT: Temperature threshold exceeded!");
  Serial.print("Would send Telegram alert: Temperature is ");
  Serial.println(temperature);
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Handle temperature reading
  if (currentMillis - lastTempRead >= TEMP_READ_INTERVAL) {
    lastTempRead = currentMillis;
    
    sensors.requestTemperatures();
    float temperature = sensors.getTempCByIndex(0);
    
    if (temperature != DEVICE_DISCONNECTED_C) {
      updateDisplay(temperature);
      logTemperature(temperature);
      
      // Check if temperature exceeds threshold
      if (alertEnabled && temperature > tempThreshold) {
        sendTelegramAlert(temperature);
      }
    } else {
      Serial.println("Error reading temperature");
    }
  }

  // Check for configuration updates
  if (currentMillis - lastConfigCheck >= configCheckInterval) {
    lastConfigCheck = currentMillis;
    checkDeviceConfig();
  }

  // Handle WiFi reconnection if needed
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    WiFi.begin();
    
    // Wait briefly for connection
    unsigned long wifiStartTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - wifiStartTime < 10000) {
      delay(500);
      Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nWiFi reconnected!");
    }
  }
  
  // Handle Firebase reconnection if needed
  if (!Firebase.ready() && currentMillis - firebaseReconnectTimer >= FIREBASE_RECONNECT_INTERVAL) {
    firebaseReconnectTimer = currentMillis;
    Serial.println("Attempting to reconnect to Firebase...");
    
    if (Firebase.ready()) {
      Serial.println("Firebase is now ready");
      firebaseInitialized = true;
    } else {
      Serial.println("Firebase reconnection required");
      Firebase.begin(&config, &auth);
    }
  }
}
