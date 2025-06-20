#!/bin/bash
echo "Starting ESP32 Temperature Dashboard Server..."
echo
echo "Make sure you have:"
echo "1. Java 17 or later installed"
echo "2. Created the firebase-service-account.json file"
echo
echo "Building the application..."

cd $(dirname "$0")
./mvnw clean package

if [ $? -ne 0 ]; then
  echo
  echo "Build failed. Please fix the errors and try again."
  read -p "Press Enter to continue..."
  exit 1
fi

echo
echo "Build successful!"
echo
echo "Starting the server..."
echo

java -jar target/esp32-dashboard-0.0.1-SNAPSHOT.jar

read -p "Press Enter to continue..."
