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

// Authentication flag
let isAuthenticated = false;

// Global variables
let currentDevice = null;
let allDevices = {};
let temperatureData = [];
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
    deviceIdElement = document.getElementById('device-id');
    deviceZoneElement = document.getElementById('device-zone');
    lastSeenElement = document.getElementById('last-seen');
    deviceStatusElement = document.getElementById('device-status');
    lastUpdateElement = document.getElementById('last-update');
    temperatureElement = document.getElementById('temperature');
    minTempElement = document.getElementById('min-temp');
    maxTempElement = document.getElementById('max-temp');
    avgTempElement = document.getElementById('avg-temp');
    devicesContainer = document.getElementById('devices-container');
    
    console.log('DOM elements initialized:', {
        connectionStatus: !!connectionStatus,
        deviceIdElement: !!deviceIdElement,
        deviceZoneElement: !!deviceZoneElement,
        lastSeenElement: !!lastSeenElement,
        deviceStatusElement: !!deviceStatusElement,
        lastUpdateElement: !!lastUpdateElement,
        temperatureElement: !!temperatureElement,
        minTempElement: !!minTempElement,
        maxTempElement: !!maxTempElement,
        avgTempElement: !!avgTempElement,
        devicesContainer: !!devicesContainer
    });
}

// Initialize the dashboard
function initDashboard() {
    initDOMElements();
    initChart();
    setupEventListeners();
    
    // Try to authenticate and then start listening
    attemptAuthentication();
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

// Attempt Firebase authentication
function attemptAuthentication() {
    updateConnectionStatus('connecting');
    
    // Check if Firebase Auth is available and try anonymous authentication
    if (typeof firebase.auth === 'function') {
        console.log('Attempting anonymous authentication...');
        firebase.auth().signInAnonymously()
            .then(() => {
                console.log('Anonymous authentication successful');
                isAuthenticated = true;
                startDashboard();
            })
            .catch((error) => {
                console.warn('Anonymous authentication failed:', error.message);
                console.log('Proceeding without authentication...');
                isAuthenticated = false;
                startDashboard();
            });
    } else {
        console.log('Firebase Auth not available, proceeding without authentication...');
        isAuthenticated = false;
        startDashboard();
    }
}

// Start dashboard after authentication attempt
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
    
    // Listen to the root level since data structure is different
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // Parse the data to match expected format
            allDevices = parseDeviceData(data);
            
            if (Object.keys(allDevices).length > 0) {
                console.log('Found devices:', Object.keys(allDevices));
                
                // If no current device selected, select the first one
                if (!currentDevice) {
                    currentDevice = Object.keys(allDevices)[0];
                    console.log('Auto-selected device:', currentDevice);
                }
                
                updateDevicesList();
                updateCurrentDeviceInfo();
                updateTemperatureData();
                updateLastRefreshTime();
            } else {
                console.log('No devices found in parsed data');
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

// Parse device data to handle different data structures
function parseDeviceData(data) {
    const devices = {};
    
    console.log('Raw Firebase data:', data);
    console.log('Available keys:', Object.keys(data || {}));
    
    // Handle direct device format (OPD-01, OPD-04, etc.)
    Object.keys(data || {}).forEach(key => {
        console.log(`Checking key: ${key}`, data[key]);
        
        if (key.startsWith('OPD-')) {
            console.log(`Found OPD device: ${key}`);
            
            // Check if device data exists and is an object
            if (data[key] && typeof data[key] === 'object') {
                devices[key] = {
                    zone: data[key].zone || 'Unknown Zone',
                    lastSeen: data[key].lastSeen || Date.now(),
                    logs: {}
                };
                
                // Handle logs if they exist
                if (data[key].logs && typeof data[key].logs === 'object') {
                    console.log(`Processing logs for ${key}:`, data[key].logs);
                    
                    Object.keys(data[key].logs).forEach(timestamp => {
                        // If timestamp is relative, convert to absolute
                        let absoluteTimestamp = parseInt(timestamp);
                        if (absoluteTimestamp < 1000000000000) { // If it's not already a proper timestamp
                            // Assume it's relative to device start time or use current time
                            absoluteTimestamp = Date.now() - (Object.keys(data[key].logs).length * 10000) + (parseInt(timestamp) * 10);
                        }
                        devices[key].logs[absoluteTimestamp] = data[key].logs[timestamp];
                    });
                } else {
                    // Handle case where temperature data might be at device level
                    // Look for numeric keys or temperature values
                    console.log(`No logs found for ${key}, checking for direct temperature data`);
                    
                    // Check for numeric timestamps or direct temperature readings
                    Object.keys(data[key]).forEach(subKey => {
                        if (!isNaN(subKey)) {
                            // This is likely a timestamp
                            const timestamp = parseInt(subKey);
                            const value = data[key][subKey];
                            
                            // Convert relative timestamp to absolute if needed
                            let absoluteTimestamp = timestamp;
                            if (timestamp < 1000000000000) {
                                absoluteTimestamp = Date.now() - (Object.keys(data[key]).length * 10000) + (timestamp * 10);
                            }
                            
                            devices[key].logs[absoluteTimestamp] = value;
                        } else if (subKey === 'temperature') {
                            // Direct temperature reading
                            devices[key].logs[Date.now()] = data[key][subKey];
                        }
                    });
                    
                    // If still no logs, create a dummy entry with current timestamp
                    if (Object.keys(devices[key].logs).length === 0) {
                        console.log(`No temperature data found for ${key}, creating placeholder`);
                        devices[key].logs[Date.now()] = 0; // Placeholder
                    }
                }
            }
        }
    });
    
    // Also check for devices under 'devices' key (standard format)
    if (data.devices) {
        console.log('Found devices under /devices path');
        Object.keys(data.devices).forEach(deviceId => {
            if (!devices[deviceId]) { // Don't override already parsed devices
                devices[deviceId] = data.devices[deviceId];
            }
        });
    }
    
    console.log('Parsed devices:', devices);
    console.log('Final device count:', Object.keys(devices).length);
    return devices;
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = connectionStatus;
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
        default:
            statusElement.innerHTML = '<i class="fas fa-circle"></i> Unknown';
    }
}

// Update devices list
function updateDevicesList() {
    console.log('Updating devices list. All devices:', allDevices);
    
    if (!devicesContainer) {
        console.error('devicesContainer not found');
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
        console.log(`Rendering device ${deviceId}:`, device);
        
        const deviceElement = document.createElement('div');
        deviceElement.className = `device-item ${deviceId === currentDevice ? 'active' : ''}`;
        deviceElement.onclick = () => selectDevice(deviceId);
        
        // Get latest temperature
        let latestTemp = '--';
        if (device && device.logs && Object.keys(device.logs).length > 0) {
            const logKeys = Object.keys(device.logs).sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
            console.log(`Device ${deviceId} log keys:`, logKeys);
            
            if (logKeys.length > 0) {
                const latestLog = device.logs[logKeys[0]]; // Get the most recent
                console.log(`Latest log for ${deviceId}:`, latestLog);
                if (!isNaN(latestLog) && latestLog !== null && latestLog !== undefined) {
                    latestTemp = convertTemperature(latestLog).toFixed(1) + getTemperatureUnit();
                }
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
        console.log(`Added device element for ${deviceId}`);
    });
    
    console.log('Device list update complete. Container children:', devicesContainer.children.length);
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
    console.log('Updating current device info. Current device:', currentDevice);
    console.log('Available devices:', Object.keys(allDevices));
    
    if (!currentDevice || !allDevices[currentDevice]) {
        console.log('No current device or device not found in allDevices');
        return;
    }
    
    const device = allDevices[currentDevice];
    console.log('Current device data:', device);
    
    if (deviceIdElement) deviceIdElement.textContent = currentDevice;
    if (deviceZoneElement) deviceZoneElement.textContent = device.zone || 'Unknown';
    
    // Update last seen
    if (device.lastSeen) {
        const lastSeen = new Date(device.lastSeen);
        if (lastSeenElement) lastSeenElement.textContent = formatTimeAgo(lastSeen);
        
        // Determine if device is online (last seen within 2 minutes)
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
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        temperatureElement.textContent = '--';
        minTempElement.textContent = '--' + getTemperatureUnit();
        maxTempElement.textContent = '--' + getTemperatureUnit();
        avgTempElement.textContent = '--' + getTemperatureUnit();
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
    temperatureElement.textContent = convertTemperature(latestTemp).toFixed(1);
    
    // Calculate statistics for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEntries = logEntries.filter(entry => entry.timestamp >= startOfDay.getTime());
    
    if (todayEntries.length > 0) {
        const temperatures = todayEntries.map(entry => convertTemperature(entry.temperature));
        const minTemp = Math.min(...temperatures);
        const maxTemp = Math.max(...temperatures);
        const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
        
        minTempElement.textContent = minTemp.toFixed(1) + getTemperatureUnit();
        maxTempElement.textContent = maxTemp.toFixed(1) + getTemperatureUnit();
        avgTempElement.textContent = avgTemp.toFixed(1) + getTemperatureUnit();
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
    devicesContainer.innerHTML = '<div style="text-align: center; color: #6b7280; padding: 20px;">No devices found. Make sure your ESP32 is connected and sending data.</div>';
    temperatureElement.textContent = '--';
    deviceIdElement.textContent = '--';
    deviceZoneElement.textContent = '--';
    lastSeenElement.textContent = '--';
    deviceStatusElement.textContent = '--';
}

// Auto-refresh functionality
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    refreshInterval = setInterval(() => {
        updateLastRefreshTime();
    }, settings.refreshRate);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

function updateLastRefreshTime() {
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString();
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

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

// Add loading indicator to temperature display
function showLoadingIndicator() {
    temperatureElement.innerHTML = '<div class="loading"></div>';
}

// Retry Firebase connection
function retryConnection() {
    console.log('Retrying Firebase connection...');
    updateConnectionStatus('connecting');
    
    // Re-initialize Firebase listeners
    setTimeout(() => {
        listenToDevices();
    }, 2000);
}

// Export temperature data as CSV
function exportData() {
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        showErrorMessage('No data available to export');
        return;
    }
    
    const logs = allDevices[currentDevice].logs;
    const logEntries = Object.entries(logs).map(([timestamp, temp]) => ({
        timestamp: parseInt(timestamp),
        temperature: temp,
        date: new Date(parseInt(timestamp)).toISOString()
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    // Create CSV content
    let csvContent = 'Timestamp,Date,Temperature (°C),Device ID,Zone\n';
    logEntries.forEach(entry => {
        csvContent += `${entry.timestamp},${entry.date},${entry.temperature},${currentDevice},${allDevices[currentDevice].zone || 'Unknown'}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const filename = `temperature_data_${currentDevice}_${now.toISOString().split('T')[0]}.csv`;
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initDashboard);
