#include <WiFi.h>
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <EEPROM.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Firebase setup - Replace with your actual Firebase credentials
#define FIREBASE_HOST "https://opdesp32-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define FIREBASE_AUTH "AIzaSyDu96XHQVxo46thtvzVgPGvNitQX7NroWA"  // Your actual Firebase Web API Key
#define FIREBASE_DATABASE_SECRET "4BaURFRlzUbwiWp3dO1kciwxYjqUY9AaRrw3EQ6r"  // Firebase Database Secret
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Include token helper
#include "addons/TokenHelper.h"
// Include RTDB helper  
#include "addons/RTDBHelper.h"

// DS18B20
#define ONE_WIRE_BUS 13
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Device ID config
char deviceID[32] = "";

void saveDeviceID(const char* id) {
  EEPROM.begin(64);
  for (int i = 0; i < 32; i++) EEPROM.write(i, id[i]);
  EEPROM.commit();
}

void loadDeviceID() {
  EEPROM.begin(64);
  for (int i = 0; i < 32; i++) deviceID[i] = EEPROM.read(i);
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

  // Firebase configuration
  config.api_key = FIREBASE_AUTH;
  config.database_url = FIREBASE_HOST;
  
  // Assign the callback function for the long running token generation task
  config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h
  
  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Serial.println("Firebase.begin() called");
  
  Firebase.reconnectWiFi(true);

  // Sign up anonymously.
  Serial.println("Signing up anonymously...");
  if (Firebase.signUp(&config, &auth, "", "")){
    Serial.println("Sign up success");
  }
  else{
    Serial.printf("Sign up failed: %s\n", config.signer.signupError.message.c_str());
  }
  
  // Wait for Firebase to initialize
  Serial.println("Waiting for Firebase initialization...");
  unsigned long startTime = millis();
  while (!Firebase.ready() && (millis() - startTime) < 15000) {
    Serial.print(".");
    delay(1000);
  }
  
  if (Firebase.ready()) {
    Serial.println("\nFirebase ready!");
  } else {
    Serial.println("\nFirebase failed to initialize after 30 seconds");
    // Try a simple test connection
    String testPath = "/test";
    if (Firebase.RTDB.setString(&fbdo, testPath.c_str(), "hello")) {
      Serial.println("Test write successful - Firebase is working!");
    } else {
      Serial.println(String("Test write failed: ") + fbdo.errorReason());
    }
  }
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  // Check if temperature reading is valid
  if (tempC == DEVICE_DISCONNECTED_C) {
    tempC = -999.0; // Invalid reading indicator
    Serial.println("Error: DS18B20 sensor disconnected!");
  }

  // Display on OLED
  display.clearDisplay();
  display.setCursor(0, 0);
  display.printf("Device: %s\n", deviceID);
  
  if (tempC == -999.0) {
    display.printf("Temp: ERROR\n");
  } else {
    display.printf("Temp: %.2f C\n", tempC);
  }
  
  display.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  display.printf("WiFi: %s\n", WiFi.status() == WL_CONNECTED ? "OK" : "ERROR");
  display.printf("Firebase: %s", Firebase.ready() ? "OK" : "ERROR");
  display.display();

  // Send to Firebase only if temperature is valid
  if (Firebase.ready() && strlen(deviceID) > 0 && tempC != -999.0) {
    String path = String("/devices/") + deviceID + "/logs/" + String(millis());
    if (Firebase.RTDB.setFloat(&fbdo, path.c_str(), tempC)) {
      Serial.println(String("✅ Sent to Firebase: ") + path + " = " + String(tempC));
    } else {
      Serial.println(String("❌ Failed to send to Firebase: ") + fbdo.errorReason());
      Serial.println(String("Error Code: ") + String(fbdo.errorCode()));
    }
  } else {
    if (tempC == -999.0) {
      Serial.println("⚠️ Skipping Firebase upload - invalid temperature reading");
    } else if (!Firebase.ready()) {
      Serial.println(String("⚠️ Firebase not ready - check API key and internet connection"));
      Serial.println(String("Firebase error details: ") + fbdo.errorReason());
    } else if (strlen(deviceID) == 0) {
      Serial.println("⚠️ Device ID not set");
    }
  }

  delay(10000);
}
