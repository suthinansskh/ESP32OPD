// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDu96XHQVxo46thtvzVgPGvNitQX7NroWA",
    authDomain: "opdesp32.firebaseapp.com",
    databaseURL: "https://opdesp32-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "opdesp32",
    storageBucket: "opdesp32.appspot.com",
    messagingSenderId: "1082565443865",
    appId: "1:1082565443865:web:8d64cf638398724a993a84"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get elements
const temperatureElement = document.getElementById('temperature');
const deviceIdElement = document.getElementById('device-id');
const uptimeElement = document.getElementById('uptime');
const tempChartCanvas = document.getElementById('temp-chart').getContext('2d');

// Chart.js setup
const chart = new Chart(tempChartCanvas, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Temperature (°C)',
            data: [],
            borderColor: 'rgba(24, 119, 242, 1)',
            backgroundColor: 'rgba(24, 119, 242, 0.2)',
            borderWidth: 2,
            fill: true,
        }]
    },
    options: {
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'second'
                }
            },
            y: {
                beginAtZero: false
            }
        }
    }
});

// Listen for data changes
database.ref('devices').on('value', (snapshot) => {
    const devices = snapshot.val();
    if (devices) {
        // For simplicity, we'll display the first device found
        const deviceId = Object.keys(devices)[0];
        const deviceData = devices[deviceId];

        deviceIdElement.textContent = deviceId;

        if (deviceData.logs) {
            const logKeys = Object.keys(deviceData.logs);
            const latestLogKey = logKeys[logKeys.length - 1];
            const latestLog = deviceData.logs[latestLogKey];

            temperatureElement.textContent = latestLog.toFixed(2);

            // Update chart
            const now = new Date(parseInt(latestLogKey));
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(latestLog);

            // Limit chart data points
            if (chart.data.labels.length > 50) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.update();
        }

        // Calculate and display uptime (assuming start time is the first log)
        if (deviceData.logs) {
            const firstLogKey = Object.keys(deviceData.logs)[0];
            const startTime = parseInt(firstLogKey);
            const currentTime = Date.now();
            const uptimeSeconds = Math.floor((currentTime - startTime) / 1000);
            const hours = Math.floor(uptimeSeconds / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;
            uptimeElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        }
    }
});
