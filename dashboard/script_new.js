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
let selectedDevices = new Set(); // For multiple device selection
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
            datasets: [] // Start with empty datasets for multiple devices
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
                    borderColor: '#4a90e2',
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
            
            // Update chart based on selection mode
            if (selectedDevices.size > 0) {
                updateMultiDeviceChart();
            } else {
                updateChartData();
            }
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

    // Device dropdown change
    const deviceDropdown = document.getElementById('device-dropdown');
    if (deviceDropdown) {
        deviceDropdown.addEventListener('change', handleDeviceDropdownChange);
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
                
                // Update device details if a device is selected
                if (currentDevice) {
                    updateDeviceDetails(currentDevice);
                }
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
    
    // Add click handler that doesn't interfere with checkbox
    deviceCard.addEventListener('click', (e) => {
        // Don't trigger selection if clicking on checkbox
        if (e.target.type !== 'checkbox') {
            selectDevice(device.id);
        }
    });
    
    // Get device status
    const status = getDeviceStatus(device);
    const latestTemp = getLatestTemperature(device);
    const lastSeen = device.lastSeen ? new Date(device.lastSeen) : null;
    const logCount = Object.keys(device.logs || {}).length;
    
    deviceCard.innerHTML = `
        <div class="device-header">
            <div class="device-name-section">
                <input type="checkbox" class="device-checkbox" data-device-id="${device.id}" 
                       onchange="toggleDeviceSelection('${device.id}')" 
                       ${selectedDevices.has(device.id) ? 'checked' : ''}>
                <div class="device-name">${device.id}</div>
            </div>
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

// Helper function to format temperature for display
function formatTemperature(temp) {
    if (isNaN(temp)) return '--°C';
    return convertTemperature(temp).toFixed(1) + getTemperatureUnit();
}

// Select a device
function selectDevice(deviceId) {
    console.log('Selecting device:', deviceId);
    
    // Validate device exists
    if (!allDevices[deviceId]) {
        console.error('Device not found:', deviceId);
        return;
    }
    
    currentDevice = deviceId;
    
    // Update device cards visual state
    document.querySelectorAll('.device-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Find and activate the selected device card
    document.querySelectorAll('.device-card').forEach(card => {
        const deviceName = card.querySelector('.device-name')?.textContent;
        if (deviceName === deviceId) {
            card.classList.add('active');
        }
    });
    
    // Update device details panel
    updateDeviceDetails(deviceId);
    
    // Update chart display with selected device data
    updateChartDisplay();
    
    // Add visual feedback
    showNotification(`Device ${deviceId} selected for chart display`, 'success');
    
    console.log('Device selection completed:', deviceId);
}

// Update device details section
function updateDeviceDetails(deviceId) {
    const container = document.getElementById('device-info-container');
    if (container) {
        container.innerHTML = '';
    }
}

// Action functions for device details
function viewDeviceHistory(deviceId) {
    // Open history page with device pre-selected
    window.open(`quick_history.html?device=${encodeURIComponent(deviceId)}`, '_blank');
}

function exportDeviceData(deviceId) {
    if (!allDevices[deviceId]) {
        alert('Device data not available');
        return;
    }
    
    const device = allDevices[deviceId];
    const logs = device.logs || {};
    
    // Prepare CSV data
    const csvData = [
        ['Timestamp', 'Temperature', 'Zone', 'Device ID']
    ];
    
    Object.values(logs).forEach(log => {
        csvData.push([
            new Date(log.timestamp).toISOString(),
            log.temperature,
            device.zone || 'Unknown',
            deviceId
        ]);
    });
    
    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    // Download CSV file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deviceId}_temperature_data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function refreshDeviceData(deviceId) {
    // Refresh the specific device data
    console.log('Refreshing data for device:', deviceId);
    
    // Show loading indicator
    const refreshBtn = event.target.closest('.action-btn');
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    refreshBtn.disabled = true;
    
    // Simulate refresh (in real implementation, this would fetch from Firebase)
    setTimeout(() => {
        refreshBtn.innerHTML = originalHTML;
        refreshBtn.disabled = false;
        
        // Update the device details
        updateDeviceDetails(deviceId);
        
        // Show success message
        showNotification('Device data refreshed successfully', 'success');
    }, 1500);
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Update chart display
function updateChartDisplay() {
    // If we have selected devices for multi-view, use multi-device chart
    if (selectedDevices.size > 0) {
        updateMultiDeviceChart();
        return;
    }
    
    // Fall back to single device mode
    if (!currentDevice || !allDevices[currentDevice]) {
        // Show "Select a device" message
        if (chartDeviceName) {
            chartDeviceName.textContent = 'Select devices using checkboxes to view chart';
            chartDeviceName.style.color = '#666';
        }
        if (chartLastUpdate) {
            chartLastUpdate.textContent = 'Use checkboxes to select multiple devices';
            chartLastUpdate.style.color = '#666';
        }
        
        // Clear chart with placeholder message
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
        
        console.log('Chart cleared - no devices selected');
        return;
    }
    
    const device = allDevices[currentDevice];
    
    // Update chart info header for single device
    if (chartDeviceName) {
        chartDeviceName.textContent = `${currentDevice} (${device.zone || 'Unknown Zone'})`;
        chartDeviceName.style.color = '#4a90e2';
    }
    if (chartLastUpdate) {
        chartLastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
        chartLastUpdate.style.color = '#666';
    }
    
    // Update chart data for single device
    updateChartData();
    
    console.log(`Chart updated for single device: ${currentDevice}`);
}

// Update chart data based on selected time period
function updateChartData() {
    if (!currentDevice || !allDevices[currentDevice] || !allDevices[currentDevice].logs) {
        // Clear chart when no device is selected or no data available
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
        console.log('Chart cleared - no data available');
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
    
    // Filter and sort data with better error handling
    const filteredData = Object.entries(logs)
        .map(([timestamp, temp]) => {
            const parsedTimestamp = parseInt(timestamp);
            const parsedTemp = parseFloat(temp);
            
            // Skip invalid data points
            if (isNaN(parsedTimestamp) || isNaN(parsedTemp)) {
                return null;
            }
            
            return {
                x: parsedTimestamp,
                y: convertTemperature(parsedTemp)
            };
        })
        .filter(entry => entry !== null && entry.x >= startTime)
        .sort((a, b) => a.x - b.x);
    
    // Update chart with validation
    if (filteredData.length === 0) {
        // Show empty state for selected time period
        chart.data.labels = [];
        chart.data.datasets = [];
        console.log(`No data available for ${currentDevice} in ${currentPeriod} period`);
    } else {
        // Create single device dataset
        const device = allDevices[currentDevice];
        const dataset = {
            label: `${currentDevice} (${device.zone || 'Unknown'}) - Temperature (${getTemperatureUnit()})`,
            data: filteredData,
            borderColor: '#4a90e2',
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: '#4a90e2',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2
        };
        
        // Update with actual data
        chart.data.labels = filteredData.map(entry => new Date(entry.x));
        chart.data.datasets = [dataset];
        console.log(`Updated chart with ${filteredData.length} data points for ${currentDevice} (${currentPeriod} period)`);
    }
    
    // Update the chart
    chart.update('none'); // Use 'none' for faster updates without animation
}

// Update chart with multiple devices
function updateMultiDeviceChart() {
    if (selectedDevices.size === 0) {
        // Clear chart when no devices selected
        chart.data.labels = [];
        chart.data.datasets = [];
        chart.update();
        
        // Update chart header
        if (chartDeviceName) {
            chartDeviceName.textContent = 'Select devices to view chart';
            chartDeviceName.style.color = '#666';
        }
        if (chartLastUpdate) {
            chartLastUpdate.textContent = 'No devices selected';
            chartLastUpdate.style.color = '#666';
        }
        return;
    }
    
    // Collect all timestamps from selected devices
    const allTimestamps = new Set();
    const deviceDataSets = {};
    
    selectedDevices.forEach(deviceId => {
        const device = allDevices[deviceId];
        if (device && device.logs) {
            const logs = device.logs;
            const now = Date.now();
            let startTime;
            
            // Calculate start time based on current period
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
            
            // Filter and process device data
            const filteredData = Object.entries(logs)
                .map(([timestamp, temp]) => ({
                    x: parseInt(timestamp),
                    y: convertTemperature(temp)
                }))
                .filter(entry => entry.x >= startTime)
                .sort((a, b) => a.x - b.x);
            
            deviceDataSets[deviceId] = filteredData;
            
            // Collect timestamps
            filteredData.forEach(entry => allTimestamps.add(entry.x));
        }
    });
    
    // Create sorted timestamp array
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Create datasets for each device
    const datasets = [];
    let colorIndex = 0;
    
    selectedDevices.forEach(deviceId => {
        const device = allDevices[deviceId];
        if (deviceDataSets[deviceId]) {
            const borderColor = generateDeviceColor(colorIndex);
            const backgroundColor = generateDeviceBackgroundColor(borderColor);
            
            datasets.push({
                label: `${deviceId} (${device.zone || 'Unknown'})`,
                data: deviceDataSets[deviceId],
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1
            });
            
            colorIndex++;
        }
    });
    
    // Update chart
    chart.data.labels = sortedTimestamps.map(timestamp => new Date(timestamp));
    chart.data.datasets = datasets;
    chart.update();
    
    // Update chart header
    if (chartDeviceName) {
        const deviceNames = Array.from(selectedDevices).slice(0, 3).join(', ');
        const extraCount = selectedDevices.size > 3 ? ` +${selectedDevices.size - 3} more` : '';
        chartDeviceName.textContent = `${deviceNames}${extraCount}`;
        chartDeviceName.style.color = '#4a90e2';
    }
    if (chartLastUpdate) {
        chartLastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
        chartLastUpdate.style.color = '#666';
    }
    
    console.log(`Chart updated with ${selectedDevices.size} devices`);
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

// Helper function to format time
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Helper function to get time since last seen
function getTimeSince(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
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

// Multiple device selection functionality
function toggleDeviceSelection(deviceId) {
    if (selectedDevices.has(deviceId)) {
        selectedDevices.delete(deviceId);
        console.log(`Device ${deviceId} removed from selection`);
    } else {
        selectedDevices.add(deviceId);
        console.log(`Device ${deviceId} added to selection`);
    }
    
    // Update visual state
    updateDeviceSelectionVisuals();
    
    // Update chart with multiple devices
    updateMultiDeviceChart();
    
    // Show notification
    const count = selectedDevices.size;
    if (count === 0) {
        showNotification('No devices selected for chart', 'info');
    } else if (count === 1) {
        showNotification(`1 device selected for chart`, 'success');
    } else {
        showNotification(`${count} devices selected for chart`, 'success');
    }
}

function updateDeviceSelectionVisuals() {
    // Update device cards visual state
    document.querySelectorAll('.device-card').forEach(card => {
        const checkbox = card.querySelector('.device-checkbox');
        const deviceId = checkbox?.dataset.deviceId;
        
        if (deviceId) {
            if (selectedDevices.has(deviceId)) {
                card.classList.add('selected');
                checkbox.checked = true;
            } else {
                card.classList.remove('selected');
                checkbox.checked = false;
            }
        }
    });
    
    // Update selection counter
    const selectionCount = document.getElementById('selection-count');
    if (selectionCount) {
        const count = selectedDevices.size;
        selectionCount.textContent = count === 0 ? 'No devices selected' : 
                                    count === 1 ? '1 device selected' : 
                                    `${count} devices selected`;
    }
}

function selectAllDevices() {
    selectedDevices.clear();
    Object.keys(allDevices).forEach(deviceId => {
        selectedDevices.add(deviceId);
    });
    updateDeviceSelectionVisuals();
    updateMultiDeviceChart();
    showNotification(`${selectedDevices.size} devices selected for chart`, 'success');
}

function clearAllSelections() {
    selectedDevices.clear();
    updateDeviceSelectionVisuals();
    updateMultiDeviceChart();
    showNotification('All device selections cleared', 'info');
}

// Generate colors for multiple devices
function generateDeviceColor(index) {
    const colors = [
        '#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', 
        '#9b59b6', '#1abc9c', '#34495e', '#e67e22',
        '#8e44ad', '#16a085', '#2c3e50', '#d35400'
    ];
    return colors[index % colors.length];
}

function generateDeviceBackgroundColor(borderColor) {
    // Convert border color to background color with transparency
    const rgb = borderColor.match(/\d+/g);
    if (rgb) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.1)`;
    }
    return borderColor.replace('rgb', 'rgba').replace(')', ', 0.1)');
}

// Populate device dropdown
function populateDeviceDropdown(devices) {
    const dropdown = document.getElementById('device-dropdown');
    dropdown.innerHTML = '<option value="">-- Select a Device --</option>'; // Reset options
    Object.keys(devices).forEach(deviceId => {
        const option = document.createElement('option');
        option.value = deviceId;
        option.textContent = devices[deviceId].name || deviceId;
        dropdown.appendChild(option);
    });
}

// Handle device dropdown change
function handleDeviceDropdownChange() {
    const dropdown = document.getElementById('device-dropdown');
    const selectedDeviceId = dropdown.value;
    const message = document.getElementById('single-device-message');

    if (selectedDeviceId) {
        currentDevice = selectedDeviceId;
        message.textContent = `Selected device: ${allDevices[selectedDeviceId].name || selectedDeviceId}`;
        updateChartData(selectedDeviceId); // Update chart for the selected device
    } else {
        currentDevice = null;
        message.textContent = 'No device selected';
    }
}

// Call this function after fetching devices
populateDeviceDropdown(allDevices);
