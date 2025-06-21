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
let devicesByZone = {};
let chart = null;
let currentPeriod = '1h';
let refreshInterval = null;
let isDarkTheme = false;

// Dashboard settings
const settings = {
    refreshRate: 10000, // 10 seconds
    temperatureUnit: 'celsius',
    theme: 'light'
};

// DOM elements
let connectionStatus, zonesContainer, chartDeviceName, chartLastUpdate;

// Initialize DOM elements
function initDOMElements() {
    connectionStatus = document.getElementById('connection-status');
    zonesContainer = document.getElementById('zones-container');
    chartDeviceName = document.getElementById('chart-device-name');
    chartLastUpdate = document.getElementById('chart-last-update');
}

// Initialize the dashboard
function initDashboard() {
    initDOMElements();
    initChart();
    setupEventListeners();
    startDashboard();
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
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1
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
                    },
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
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

    // Settings panel toggle
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

// Start dashboard
function startDashboard() {
    listenToDevices();
    startAutoRefresh();
    loadSettings();
}

// Listen to Firebase devices
function listenToDevices() {
    updateConnectionStatus('connecting');
    
    // Test Firebase connection first
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        if (connected) {
            updateConnectionStatus('connected');
        } else {
            updateConnectionStatus('disconnected');
        }
    });
    
    // Listen to the root level for real-time updates
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Parse the data
            allDevices = parseDeviceData(data);
            
            if (Object.keys(allDevices).length > 0) {
                console.log('Found devices:', Object.keys(allDevices));
                
                // Group devices by zone
                groupDevicesByZone();
                
                // Update displays
                updateDevicesDisplay();
                updateChartDisplay();
                updateLastRefreshTime();
            } else {
                showNoDevicesMessage();
            }
        } else {
            showNoDevicesMessage();
        }
    }, (error) => {
        console.error('Firebase error:', error);
        updateConnectionStatus('error');
        showErrorMessage('Failed to connect to Firebase: ' + error.message);
    });
}

// Parse device data
function parseDeviceData(data) {
    const devices = {};
    
    console.log('Raw Firebase data:', data);
    
    // Handle direct device format (OPD-01, OPD-04, etc.)
    Object.keys(data || {}).forEach(key => {
        if (key.startsWith('OPD-')) {
            console.log(`Found OPD device: ${key}`);
            
            if (data[key] && typeof data[key] === 'object') {
                devices[key] = {
                    zone: data[key].zone || 'Unknown Zone',
                    lastSeen: data[key].lastSeen || Date.now(),
                    logs: data[key].logs || {}
                };
                
                // Process logs to ensure proper timestamp format
                if (data[key].logs) {
                    const processedLogs = {};
                    Object.keys(data[key].logs).forEach(timestamp => {
                        let absoluteTimestamp = parseInt(timestamp);
                        if (absoluteTimestamp < 1000000000000) {
                            // Convert relative to absolute timestamp
                            absoluteTimestamp = Date.now() - (Object.keys(data[key].logs).length * 10000) + (parseInt(timestamp) * 10);
                        }
                        processedLogs[absoluteTimestamp] = parseFloat(data[key].logs[timestamp]);
                    });
                    devices[key].logs = processedLogs;
                }
            }
        }
    });
    
    // Also check for devices under 'devices' key
    if (data.devices) {
        Object.keys(data.devices).forEach(deviceId => {
            if (!devices[deviceId]) {
                devices[deviceId] = data.devices[deviceId];
            }
        });
    }
    
    console.log('Parsed devices:', devices);
    return devices;
}

// Group devices by zone
function groupDevicesByZone() {
    devicesByZone = {};
    
    Object.keys(allDevices).forEach(deviceId => {
        const device = allDevices[deviceId];
        const zone = device.zone || 'Unknown Zone';
        
        if (!devicesByZone[zone]) {
            devicesByZone[zone] = [];
        }
        
        devicesByZone[zone].push({
            id: deviceId,
            ...device
        });
    });
    
    console.log('Devices grouped by zone:', devicesByZone);
}

// Update devices display by zone
function updateDevicesDisplay() {
    if (!zonesContainer) return;
    
    zonesContainer.innerHTML = '';
    
    Object.keys(devicesByZone).forEach(zoneName => {
        const devices = devicesByZone[zoneName];
        
        // Create zone group
        const zoneGroup = document.createElement('div');
        zoneGroup.className = 'zone-group';
        
        // Zone header
        const zoneHeader = document.createElement('div');
        zoneHeader.className = 'zone-header';
        zoneHeader.innerHTML = `
            <i class="fas fa-map-marker-alt"></i>
            <span>${zoneName} (${devices.length} devices)</span>
        `;
        
        // Zone devices container
        const zoneDevices = document.createElement('div');
        zoneDevices.className = 'zone-devices';
        
        devices.forEach(device => {
            const deviceCard = createDeviceCard(device);
            zoneDevices.appendChild(deviceCard);
        });
        
        zoneGroup.appendChild(zoneHeader);
        zoneGroup.appendChild(zoneDevices);
        zonesContainer.appendChild(zoneGroup);
    });
}

// Create device card
function createDeviceCard(device) {
    const deviceCard = document.createElement('div');
    deviceCard.className = `device-card ${device.id === currentDevice ? 'active' : ''}`;
    deviceCard.onclick = () => selectDevice(device.id);
    
    // Get device status
    const status = getDeviceStatus(device);
    const latestTemp = getLatestTemperature(device);
    const lastSeen = device.lastSeen ? new Date(device.lastSeen) : null;
    const logCount = Object.keys(device.logs || {}).length;
    
    deviceCard.innerHTML = `
        <div class="device-header">
            <div class="device-name">${device.id}</div>
            <div class="device-status">
                <span class="status-dot ${status.class}"></span>
                ${status.text}
            </div>
        </div>
        <div class="device-info">
            <div class="device-stat">
                <div class="device-stat-label">Temperature</div>
                <div class="device-stat-value temp-current">${latestTemp}</div>
            </div>
            <div class="device-stat">
                <div class="device-stat-label">Last Seen</div>
                <div class="device-stat-value">${lastSeen ? formatTimeAgo(lastSeen) : 'Never'}</div>
            </div>
            <div class="device-stat">
                <div class="device-stat-label">Data Points</div>
                <div class="device-stat-value">${logCount}</div>
            </div>
            <div class="device-stat">
                <div class="device-stat-label">Last Update</div>
                <div class="device-stat-value">${new Date().toLocaleTimeString()}</div>
            </div>
        </div>
    `;
    
    return deviceCard;
}

// Get device status
function getDeviceStatus(device) {
    if (!device.lastSeen) {
        return { class: 'status-offline', text: 'Unknown' };
    }
    
    const now = Date.now();
    const lastSeen = device.lastSeen;
    const timeDiff = now - lastSeen;
    
    if (timeDiff < 2 * 60 * 1000) { // 2 minutes
        return { class: 'status-online', text: 'Online' };
    } else if (timeDiff < 10 * 60 * 1000) { // 10 minutes
        return { class: 'status-warning', text: 'Warning' };
    } else {
        return { class: 'status-offline', text: 'Offline' };
    }
}

// Get latest temperature
function getLatestTemperature(device) {
    if (!device.logs || Object.keys(device.logs).length === 0) {
        return '--°C';
    }
    
    const timestamps = Object.keys(device.logs).map(t => parseInt(t)).sort((a, b) => b - a);
    const latestTimestamp = timestamps[0];
    const temp = device.logs[latestTimestamp];
    
    if (isNaN(temp)) return '--°C';
    
    return convertTemperature(temp).toFixed(1) + getTemperatureUnit();
}

// Select a device
function selectDevice(deviceId) {
    currentDevice = deviceId;
    
    // Update device cards
    document.querySelectorAll('.device-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Find and activate the selected device card
    document.querySelectorAll('.device-card').forEach(card => {
        const deviceName = card.querySelector('.device-name').textContent;
        if (deviceName === deviceId) {
            card.classList.add('active');
        }
    });
    
    // Update chart
    updateChartDisplay();
    
    console.log('Selected device:', deviceId);
}

// Update chart display
function updateChartDisplay() {
    if (!currentDevice || !allDevices[currentDevice]) {
        // Show "Select a device" message
        if (chartDeviceName) {
            chartDeviceName.textContent = 'Select a device to view chart';
        }
        if (chartLastUpdate) {
            chartLastUpdate.textContent = '--';
        }
        
        // Clear chart
        chart.data.labels = [];
        chart.data.datasets[0].data = [];
        chart.update();
        return;
    }
    
    const device = allDevices[currentDevice];
    
    // Update chart info
    if (chartDeviceName) {
        chartDeviceName.textContent = `${currentDevice} (${device.zone})`;
    }
    if (chartLastUpdate) {
        chartLastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    }
    
    // Update chart data
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
    chart.data.labels = filteredData.map(entry => new Date(entry.x));
    chart.data.datasets[0].data = filteredData;
    chart.data.datasets[0].label = `Temperature (${getTemperatureUnit()})`;
    chart.update();
    
    console.log(`Updated chart with ${filteredData.length} data points for ${currentPeriod}`);
}

// Update connection status
function updateConnectionStatus(status) {
    if (!connectionStatus) return;
    
    connectionStatus.className = `connection-status ${status}`;
    
    switch (status) {
        case 'connected':
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
            break;
        case 'disconnected':
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
            break;
        case 'connecting':
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connecting...';
            break;
        case 'error':
            connectionStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection Error';
            break;
        default:
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Unknown';
    }
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
    if (zonesContainer) {
        zonesContainer.innerHTML = `
            <div style="text-align: center; color: #6b7280; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>No devices found</h3>
                <p>Make sure your ESP32 is connected and sending data to Firebase.</p>
            </div>
        `;
    }
    
    if (chartDeviceName) {
        chartDeviceName.textContent = 'No devices available';
    }
    if (chartLastUpdate) {
        chartLastUpdate.textContent = '--';
    }
}

// Auto-refresh functionality
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        updateLastRefreshTime();
        // Firebase will automatically trigger updates via the listener
    }, settings.refreshRate);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function updateLastRefreshTime() {
    if (chartLastUpdate && currentDevice) {
        chartLastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
    }
}

// Settings functions
function loadSettings() {
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
    }
    
    // Apply loaded settings
    if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
        isDarkTheme = true;
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) themeToggle.checked = true;
    }
    
    const tempUnitToggle = document.getElementById('temp-unit-toggle');
    if (tempUnitToggle) {
        tempUnitToggle.checked = settings.temperatureUnit === 'fahrenheit';
    }
    
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.checked = refreshInterval !== null;
    }
}

function saveSettings() {
    localStorage.setItem('dashboardSettings', JSON.stringify(settings));
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme');
    settings.theme = isDarkTheme ? 'dark' : 'light';
    saveSettings();
}

function toggleTemperatureUnit() {
    settings.temperatureUnit = settings.temperatureUnit === 'celsius' ? 'fahrenheit' : 'celsius';
    saveSettings();
    
    // Update all displays
    updateDevicesDisplay();
    updateChartData();
}

function toggleAutoRefresh() {
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle.checked) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
}

// Utility functions
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
    }
}

function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #f5c6cb;
        z-index: 1000;
        max-width: 400px;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: #721c24; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

// Retry connection
function retryConnection() {
    console.log('Retrying Firebase connection...');
    updateConnectionStatus('connecting');
    
    // Re-initialize Firebase listeners
    setTimeout(() => {
        listenToDevices();
    }, 2000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initDashboard);
