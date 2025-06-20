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
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature',
                data: [],
                borderColor: '#4f46e5',
                borderWidth: 2,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
document.addEventListener('DOMContentLoaded', initDashboard);
