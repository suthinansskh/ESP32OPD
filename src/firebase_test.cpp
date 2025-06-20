/*
 * Firebase Test File
 * 
 * This is a simple test to verify Firebase connectivity.
 * To use this test:
 * 1. Temporarily rename your main.cpp to main.cpp.bak
 * 2. Rename this file to main.cpp
 * 3. Build and upload
 * 4. Check serial monitor for Firebase connection status
 * 5. After testing, reverse the rename process
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Include token helper
#include "addons/TokenHelper.h"
// Include RTDB helper
#include "addons/RTDBHelper.h"

// Insert your network credentials
#define WIFI_SSID "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"

// Insert Firebase project API Key
#define API_KEY "AIzaSyDu96XHQVxo46thtvzVgPGvNitQX7NroWA"

// Insert RTDB URL
#define DATABASE_URL "https://opdesp32-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Define Firebase Data object
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long sendDataPrevMillis = 0;
int count = 0;
bool signupOK = false;

void setup() {
  Serial.begin(115200);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  /* Assign the API key (required) */
  config.api_key = API_KEY;

  /* Assign the RTDB URL (required) */
  config.database_url = DATABASE_URL;

  /* Sign up */
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase sign-up success");
    signupOK = true;
  } else {
    Serial.printf("Firebase sign-up failed: %s\n", config.signer.signupError.message.c_str());
  }

  /* Assign the callback function for the long-running token generation task */
  config.token_status_callback = tokenStatusCallback; // see addons/TokenHelper.h
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready() && signupOK && (millis() - sendDataPrevMillis > 15000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    
    // Write an Int number on the database path test/int
    if (Firebase.RTDB.setInt(&fbdo, "test/int", count)) {
      Serial.print("Path: ");
      Serial.println(fbdo.dataPath());
      Serial.print("Type: ");
      Serial.println(fbdo.dataType());
      Serial.print("Value: ");
      Serial.println(count);
    } else {
      Serial.println("FAILED");
      Serial.print("REASON: ");
      Serial.println(fbdo.errorReason());
    }
    
    count++;
    
    // Write a Float number on the database path test/float
    if (Firebase.RTDB.setFloat(&fbdo, "test/float", 0.01 + random(0, 100))) {
      Serial.print("Path: ");
      Serial.println(fbdo.dataPath());
      Serial.print("Type: ");
      Serial.println(fbdo.dataType());
    } else {
      Serial.println("FAILED");
      Serial.print("REASON: ");
      Serial.println(fbdo.errorReason());
    }
  }
}
