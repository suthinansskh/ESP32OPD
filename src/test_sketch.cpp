// ESP32 Minimal Test Sketch
// Use this to test if the basic functionality works without Firebase
// Then gradually add features back to identify what's causing the linker error

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Temperature sensor
#define ONE_WIRE_BUS 13
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 minimal test starting...");
  
  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
    for(;;);
  }
  
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ESP32 Test");
  display.display();
  
  // Initialize WiFi in station mode
  WiFi.mode(WIFI_STA);
  WiFi.begin("YourSSID", "YourPassword");  // Replace with your WiFi credentials
  
  // Try to connect to WiFi
  Serial.print("Connecting to WiFi");
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) {
    delay(500);
    Serial.print(".");
    attempt++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    display.setCursor(0, 20);
    display.print("IP: ");
    display.println(WiFi.localIP());
    display.display();
  } else {
    Serial.println("\nWiFi connection failed");
    
    display.setCursor(0, 20);
    display.println("WiFi failed");
    display.display();
  }
  
  // Initialize temperature sensors
  sensors.begin();
}

void loop() {
  // Request temperature
  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);
  
  // Display temperature
  if (temperature != DEVICE_DISCONNECTED_C) {
    Serial.print("Temperature: ");
    Serial.print(temperature);
    Serial.println(" °C");
    
    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("ESP32 Test");
    
    display.setTextSize(2);
    display.setCursor(0, 20);
    display.print(temperature, 1);
    display.println(" C");
    display.display();
  } else {
    Serial.println("Error reading temperature");
  }
  
  delay(2000);
}
