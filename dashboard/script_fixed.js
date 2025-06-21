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

// Global variables
let currentDevice = null;
let allDevices = {};
let chart = null;
let currentPeriod = '1h';
let refreshInterval = null;

// Dashboard settings
const settings = {
    refreshRate: 10000,
    temperatureUnit: 'celsius',
    theme: 'light'
};

// Initialize the dashboard
function initDashboard() {
    console.log('🚀 Initializing dashboard...');
    initChart();
    setupEventListeners();
    startListeningToFirebase();
}

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById('temp-chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm',
                            day: 'MMM dd'
                        }
                    }
                },
                y: {
                    beginAtZero: false
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

    // Settings panel
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('open');
            settingsOverlay.classList.toggle('active');
        });
    }

    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
            settingsOverlay.classList.remove('active');
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }

    // Temperature unit toggle
    const tempUnitToggle = document.getElementById('temp-unit-toggle');
    if (tempUnitToggle) {
        tempUnitToggle.addEventListener('change', toggleTemperatureUnit);
    }

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', toggleAutoRefresh);
    }
}

// Start listening to Firebase
function startListeningToFirebase() {
    console.log('🔥 Starting Firebase listener...');
    updateConnectionStatus('connecting');

    // Connection status
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        updateConnectionStatus(connected ? 'connected' : 'disconnected');
    });

    // Listen to root level for OPD devices
    database.ref('/').on('value', (snapshot) => {
        console.log('📡 Received Firebase data...');
        const data = snapshot.val();
        
        if (data) {
            allDevices = parseDeviceData(data);
            console.log('✅ Parsed devices:', Object.keys(allDevices));
            
            if (Object.keys(allDevices).length > 0) {
                // Auto-select first device if none selected
                if (!currentDevice || !allDevices[currentDevice]) {
                    currentDevice = Object.keys(allDevices)[0];
                    console.log('🎯 Auto-selected device:', currentDevice);
                }
                
                updateDevicesList();
                updateCurrentDeviceInfo();
                updateTemperatureData();
            } else {
                showNoDevicesMessage();
            }
        } else {
            console.log('❌ No data received from Firebase');
            showNoDevicesMessage();
        }
    }, (error) => {
        console.error('❌ Firebase error:', error);
        updateConnectionStatus('error');
    });
}

// Parse device data from Firebase
function parseDeviceData(data) {
    const devices = {};
    
    console.log('🔍 Parsing Firebase data...');
    console.log('Raw data keys:', Object.keys(data || {}));
    
    if (!data) return devices;
    
    // Look for OPD devices at root level
    Object.keys(data).forEach(key => {
        if (key.startsWith('OPD-')) {
            console.log(`📱 Found device: ${key}`);
            const deviceData = data[key];
            
            if (deviceData && typeof deviceData === 'object') {
                devices[key] = {
                    zone: deviceData.zone || 'Unknown Zone',
                    lastSeen: deviceData.lastSeen || Date.now(),
                    logs: deviceData.logs || {}
                };
                
                console.log(`✅ Device ${key} parsed successfully`);
            }
        }
    });
    
    // Also check legacy /devices path
    if (data.devices) {
        console.log('📁 Found legacy devices under /devices');
        Object.keys(data.devices).forEach(deviceId => {
            if (!devices[deviceId]) {
                devices[deviceId] = data.devices[deviceId];
            }
        });
    }
    
    console.log(`📊 Total devices parsed: ${Object.keys(devices).length}`);
    return devices;
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (!statusElement) return;
    
    statusElement.className = `connection-status ${status}`;
    
    switch (status) {
        case 'connected':
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connected';
            break;
        case 'disconnected':
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            break;
        case 'connecting':
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Connecting...';
            break;
        case 'error':
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection Error';
            break;
    }
}

// Update devices list
function updateDevicesList() {
    console.log('📝 Updating devices list...');
    const devicesContainer = document.getElementById('devices-container');
    if (!devicesContainer) {
        console.error('❌ devices-container not found');
        return;
    }
    
    devicesContainer.innerHTML = '';
    
    const deviceKeys = Object.keys(allDevices);
    console.log('Device keys to display:', deviceKeys);
    
    if (deviceKeys.length === 0) {
        devicesContainer.innerHTML = '<div class="device-item">No devices found</div>';
        return;
    }
    
    deviceKeys.forEach(deviceId => {
        const device = allDevices[deviceId];
        console.log(`🔧 Creating element for device: ${deviceId}`);
        
        const deviceElement = document.createElement('div');
        deviceElement.className = `device-item ${deviceId === currentDevice ? 'active' : ''}`;
        deviceElement.onclick = () => selectDevice(deviceId);
        
        // Get latest temperature
        let latestTemp = '--';
        if (device.logs && Object.keys(device.logs).length > 0) {
            const logKeys = Object.keys(device.logs).sort((a, b) => parseInt(b) - parseInt(a));
            const latestLog = device.logs[logKeys[0]];
            if (!isNaN(latestLog)) {
                latestTemp = convertTemperature(latestLog).toFixed(1) + getTemperatureUnit();
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
        console.log(`✅ Added device element: ${deviceId}`);
    });
    
    console.log(`📊 Devices list updated. Total elements: ${devicesContainer.children.length}`);
}

// Select a device
function selectDevice(deviceId) {
    console.log(`🎯 Selecting device: ${deviceId}`);
    currentDevice = deviceId;
    updateDevicesList();
    updateCurrentDeviceInfo();
    updateTemperatureData();
}

// Update current device information
function updateCurrentDeviceInfo() {
    if (!currentDevice || !allDevices[currentDevice]) return;
    
    const device = allDevices[currentDevice];
    
    const deviceIdElement = document.getElementById('device-id');
    const deviceZoneElement = document.getElementById('device-zone');
    const lastSeenElement = document.getElementById('last-seen');
    const deviceStatusElement = document.getElementById('device-status');
    
    if (deviceIdElement) deviceIdElement.textContent = currentDevice;
    if (deviceZoneElement) deviceZoneElement.textContent = device.zone || 'Unknown';
    
    // Update last seen
    if (device.lastSeen) {
        const lastSeen = new Date(device.lastSeen);
        if (lastSeenElement) lastSeenElement.textContent = formatTimeAgo(lastSeen);
        
        const isOnline = Date.now() - lastSeen.getTime() < 2 * 60 * 1000;
        if (deviceStatusElement) {
            deviceStatusElement.textContent = isOnline ? 'Online' : 'Offline';
            deviceStatusElement.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }
    } else {
        if (lastSeenElement) lastSeenElement.textContent = 'Never';
        if (deviceStatusElement) {
            deviceStatusElement.textContent = 'Unknown';
            deviceStatusElement.className = 'status-indicator offline';
        }
    }
}

// Update temperature data and statistics
function updateTemperatureData() {
    const temperatureElement = document.getElementById('temperature');
    const minTempElement = document.getElementById('min-temp');
    const maxTempElement = document.getElementById('max-temp');
    const avgTempElement = document.getElementById('avg-temp');
    
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        if (temperatureElement) temperatureElement.textContent = '--';
        if (minTempElement) minTempElement.textContent = '--' + getTemperatureUnit();
        if (maxTempElement) maxTempElement.textContent = '--' + getTemperatureUnit();
        if (avgTempElement) avgTempElement.textContent = '--' + getTemperatureUnit();
        return;
    }
    
    const logs = allDevices[currentDevice].logs;
    const logEntries = Object.entries(logs).map(([timestamp, temp]) => ({
        timestamp: parseInt(timestamp),
        temperature: parseFloat(temp)
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    if (logEntries.length === 0) return;
    
    // Update current temperature (latest reading)
    const latestTemp = logEntries[logEntries.length - 1].temperature;
    if (temperatureElement) {
        temperatureElement.textContent = convertTemperature(latestTemp).toFixed(1);
    }
    
    // Calculate statistics for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEntries = logEntries.filter(entry => entry.timestamp >= startOfDay.getTime());
    
    if (todayEntries.length > 0) {
        const temperatures = todayEntries.map(entry => convertTemperature(entry.temperature));
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        
        if (minTempElement) minTempElement.textContent = minTemp.toFixed(1) + getTemperatureUnit();
        if (maxTempElement) maxTempElement.textContent = maxTemp.toFixed(1) + getTemperatureUnit();
        if (avgTempElement) avgTempElement.textContent = avgTemp.toFixed(1) + getTemperatureUnit();
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
            y: convertTemperature(temp)
        }))
        .filter(entry => entry.x >= startTime)
        .sort((a, b) => a.x - b.x);
    
    // Update chart
    chart.data.labels = filteredData.map(entry => entry.x);
    chart.data.datasets[0].data = filteredData;
    chart.data.datasets[0].label = `Temperature (${getTemperatureUnit()})`;
    chart.update();
}

// Temperature conversion functions
function convertTemperature(celsius) {
    if (settings.temperatureUnit === 'fahrenheit') {
        return (celsius * 9/5) + 32;
    }
    return celsius;
}

function getTemperatureUnit() {
    return settings.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
}

// Show no devices message
function showNoDevicesMessage() {
    const devicesContainer = document.getElementById('devices-container');
    if (devicesContainer) {
        devicesContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No devices found. Make sure your ESP32 is connected and sending data.</div>';
    }
    
    const temperatureElement = document.getElementById('temperature');
    const deviceIdElement = document.getElementById('device-id');
    const deviceZoneElement = document.getElementById('device-zone');
    const lastSeenElement = document.getElementById('last-seen');
    const deviceStatusElement = document.getElementById('device-status');
    
    if (temperatureElement) temperatureElement.textContent = '--';
    if (deviceIdElement) deviceIdElement.textContent = '--';
    if (deviceZoneElement) deviceZoneElement.textContent = '--';
    if (lastSeenElement) lastSeenElement.textContent = '--';
    if (deviceStatusElement) deviceStatusElement.textContent = '--';
}

// Settings functions
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    settings.theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
}

function toggleTemperatureUnit() {
    settings.temperatureUnit = settings.temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
    
    // Update all temperature displays
    updateTemperatureData();
    updateDevicesList();
}

function toggleAutoRefresh() {
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle.checked) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        const lastUpdateElement = document.getElementById('last-update');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleTimeString();
        }
    }, settings.refreshRate);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
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
document.addEventListener('DOMContentLoaded', initDashboard);
