// Firebase configuration - Replace with your Firebase config
const firebaseConfig = {
    // TODO: Replace with your Firebase configuration
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    databaseURL: "https://your-project-id.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

<<<<<<< HEAD
// Device configuration
const DEVICE_CONFIG = [
    { id: "esp32-01", zone: "Building 1" },
    { id: "esp32-02", zone: "Building 2" },
    { id: "esp32-03", zone: "Building 3" },
];

// Chart configurations
const chartConfigs = new Map();

// Initialize the dashboard
function initDashboard() {
    const devicesContainer = document.getElementById('devices-container');
    const zoneSelect = document.getElementById('zone-select');

    // Create device cards and charts
    DEVICE_CONFIG.forEach(device => {
        const card = createDeviceCard(device);
        devicesContainer.appendChild(card);
        initChart(device.id);
    });

    // Handle zone selection
    zoneSelect.addEventListener('change', (e) => {
        const selectedZone = e.target.value;
        filterDevices(selectedZone);
    });

    // Start real-time updates
    startRealtimeUpdates();
}

function createDeviceCard(device) {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.setAttribute('data-zone', device.zone);
    card.innerHTML = `
        <h2>Device: ${device.id} (${device.zone})</h2>
        <div class="chart-container">
            <canvas id="chart-${device.id}"></canvas>
        </div>
    `;
    return card;
}

function initChart(deviceId) {
    const ctx = document.getElementById(`chart-${deviceId}`).getContext('2d');
    const chart = new Chart(ctx, {
=======
// Global variables
let currentDevice = null;
let allDevices = {};
let temperatureData = [];
let chart = null;
let currentPeriod = '1h';

// DOM elements
const connectionStatus = document.getElementById('connection-status');
const deviceIdElement = document.getElementById('device-id');
const deviceZoneElement = document.getElementById('device-zone');
const lastSeenElement = document.getElementById('last-seen');
const deviceStatusElement = document.getElementById('device-status');
const temperatureElement = document.getElementById('temperature');
const minTempElement = document.getElementById('min-temp');
const maxTempElement = document.getElementById('max-temp');
const avgTempElement = document.getElementById('avg-temp');
const devicesContainer = document.getElementById('devices-container');

// Initialize the dashboard
function initDashboard() {
    initChart();
    setupEventListeners();
    listenToDevices();
}

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('temp-chart').getContext('2d');
    chart = new Chart(ctx, {
>>>>>>> 4773087 (Refactor dashboard script to improve structure and enhance temperature data handling)
        type: 'line',
        data: {
            labels: [],
            datasets: [{
<<<<<<< HEAD
                label: 'Temperature',
                data: [],
                borderColor: '#4f46e5',
                borderWidth: 2,
                tension: 0.4,
                fill: false
=======
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
>>>>>>> 4773087 (Refactor dashboard script to improve structure and enhance temperature data handling)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
<<<<<<< HEAD
            scales: {
                y: {
                    min: 20,
                    max: 40,
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
    chartConfigs.set(deviceId, chart);
}

function filterDevices(zone) {
    const cards = document.querySelectorAll('.device-card');
    cards.forEach(card => {
        if (zone === 'All' || card.getAttribute('data-zone') === zone) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

function startRealtimeUpdates() {
    DEVICE_CONFIG.forEach(device => {
        const deviceRef = database.ref(`devices/${device.id}/logs`);
        deviceRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                updateDeviceData(device.id, data);
            }
        });
    });
}

function updateDeviceData(deviceId, data) {
    const chart = chartConfigs.get(deviceId);
    if (!chart) return;

    const entries = Object.entries(data);
    const lastEntries = entries.slice(-20); // Show last 20 readings

    const labels = lastEntries.map(([timestamp]) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    });
    const temperatures = lastEntries.map(([, temp]) => temp);

    chart.data.labels = labels;
    chart.data.datasets[0].data = temperatures;
    chart.update();
}

// Initialize the dashboard when the page loads
=======
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM dd'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y: {
                    beginAtZero: false,
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Time period buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            updateChartData();
        });
    });
}

// Listen to Firebase devices
function listenToDevices() {
    updateConnectionStatus('connected');
    
    database.ref('devices').on('value', (snapshot) => {
        const devices = snapshot.val();
        allDevices = devices || {};
        
        if (Object.keys(allDevices).length > 0) {
            // If no current device selected, select the first one
            if (!currentDevice) {
                currentDevice = Object.keys(allDevices)[0];
            }
            
            updateDevicesList();
            updateCurrentDeviceInfo();
            updateTemperatureData();
        } else {
            showNoDevicesMessage();
        }
    }, (error) => {
        console.error('Firebase error:', error);
        updateConnectionStatus('disconnected');
    });
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = connectionStatus;
    statusElement.className = `connection-status ${status}`;
    
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
    }
}

// Update devices list
function updateDevicesList() {
    devicesContainer.innerHTML = '';
    
    Object.keys(allDevices).forEach(deviceId => {
        const device = allDevices[deviceId];
        const deviceElement = document.createElement('div');
        deviceElement.className = `device-item ${deviceId === currentDevice ? 'active' : ''}`;
        deviceElement.onclick = () => selectDevice(deviceId);
        
        // Get latest temperature
        let latestTemp = '--';
        if (device.logs) {
            const logKeys = Object.keys(device.logs).sort();
            if (logKeys.length > 0) {
                const latestLog = device.logs[logKeys[logKeys.length - 1]];
                latestTemp = latestLog.toFixed(1) + '°C';
            }
        }
        
        deviceElement.innerHTML = `
            <div>
                <div class="device-name">${deviceId}</div>
                <div class="device-zone">${device.zone || 'Unknown Zone'}</div>
            </div>
            <div class="device-temp">${latestTemp}</div>
        `;
        
        devicesContainer.appendChild(deviceElement);
    });
}

// Select a device
function selectDevice(deviceId) {
    currentDevice = deviceId;
    updateDevicesList();
    updateCurrentDeviceInfo();
    updateTemperatureData();
}

// Update current device information
function updateCurrentDeviceInfo() {
    if (!currentDevice || !allDevices[currentDevice]) return;
    
    const device = allDevices[currentDevice];
    
    deviceIdElement.textContent = currentDevice;
    deviceZoneElement.textContent = device.zone || 'Unknown';
    
    // Update last seen
    if (device.lastSeen) {
        const lastSeen = new Date(device.lastSeen);
        lastSeenElement.textContent = formatTimeAgo(lastSeen);
        
        // Determine if device is online (last seen within 2 minutes)
        const isOnline = Date.now() - lastSeen.getTime() < 2 * 60 * 1000;
        deviceStatusElement.textContent = isOnline ? 'Online' : 'Offline';
        deviceStatusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
    } else {
        lastSeenElement.textContent = 'Never';
        deviceStatusElement.textContent = 'Unknown';
        deviceStatusElement.className = 'status-indicator offline';
    }
}

// Update temperature data and statistics
function updateTemperatureData() {
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        temperatureElement.textContent = '--';
        minTempElement.textContent = '--°C';
        maxTempElement.textContent = '--°C';
        avgTempElement.textContent = '--°C';
        return;
    }
    
    const logs = allDevices[currentDevice].logs;
    const logEntries = Object.entries(logs).map(([timestamp, temp]) => ({
        timestamp: parseInt(timestamp),
        temperature: temp
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    if (logEntries.length === 0) return;
    
    // Update current temperature (latest reading)
    const latestTemp = logEntries[logEntries.length - 1].temperature;
    temperatureElement.textContent = latestTemp.toFixed(1);
    
    // Calculate statistics for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEntries = logEntries.filter(entry => entry.timestamp >= startOfDay.getTime());
    
    if (todayEntries.length > 0) {
        const temperatures = todayEntries.map(entry => entry.temperature);
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        
        minTempElement.textContent = minTemp.toFixed(1) + '°C';
        maxTempElement.textContent = maxTemp.toFixed(1) + '°C';
        avgTempElement.textContent = avgTemp.toFixed(1) + '°C';
    }
    
    // Update chart
    updateChartData();
}

// Update chart data based on selected time period
function updateChartData() {
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }
    
    const logs = allDevices[currentDevice].logs;
    const now = Date.now();
    let startTime;
    
    // Calculate start time based on period
    switch (currentPeriod) {
        case '1h':
            startTime = now - (60 * 60 * 1000);
            break;
        case '6h':
            startTime = now - (6 * 60 * 60 * 1000);
            break;
        case '24h':
            startTime = now - (24 * 60 * 60 * 1000);
            break;
        case '7d':
            startTime = now - (7 * 24 * 60 * 60 * 1000);
            break;
        default:
            startTime = now - (60 * 60 * 1000);
    }
    
    // Filter and sort data
    const filteredData = Object.entries(logs)
        .map(([timestamp, temp]) => ({
            x: parseInt(timestamp),
            y: temp
        }))
        .filter(entry => entry.x >= startTime)
        .sort((a, b) => a.x - b.x);
    
    // Update chart
    chart.data.labels = filteredData.map(entry => entry.x);
    chart.data.datasets[0].data = filteredData;
    chart.update();
}

// Show no devices message
function showNoDevicesMessage() {
    devicesContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No devices found. Make sure your ESP32 is connected and sending data.</div>';
    temperatureElement.textContent = '--';
    deviceIdElement.textContent = '--';
    deviceZoneElement.textContent = '--';
    lastSeenElement.textContent = '--';
    deviceStatusElement.textContent = '--';
}

// Format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
}

// Initialize when page loads
>>>>>>> 4773087 (Refactor dashboard script to improve structure and enhance temperature data handling)
document.addEventListener('DOMContentLoaded', initDashboard);
