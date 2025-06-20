package com.esp32opd.dashboard.controller;

import com.google.firebase.database.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {
    private static final Logger logger = LoggerFactory.getLogger(DeviceController.class);

    @GetMapping
    public List<Map<String, Object>> getAllDevices() throws Exception {
        logger.info("Fetching all devices");
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("devices");
        ApiFuture<DataSnapshot> future = ref.get();
        DataSnapshot snapshot = future.get();

        List<Map<String, Object>> result = new ArrayList<>();

        for (DataSnapshot deviceSnap : snapshot.getChildren()) {
            String deviceId = deviceSnap.getKey();
            
            // Get device info
            DataSnapshot infoSnap = deviceSnap.child("info");
            
            Map<String, Object> device = new HashMap<>();
            device.put("id", deviceId);
            
            if (infoSnap.exists()) {
                // Get zone if exists
                if (infoSnap.child("zone").exists()) {
                    device.put("zone", infoSnap.child("zone").getValue(String.class));
                } else {
                    device.put("zone", "Unassigned");
                }
                
                // Get lastSeen if exists
                if (infoSnap.child("lastSeen").exists()) {
                    device.put("lastSeen", infoSnap.child("lastSeen").getValue(Long.class));
                }
                
                // Get ip if exists
                if (infoSnap.child("ip").exists()) {
                    device.put("ip", infoSnap.child("ip").getValue(String.class));
                }
                
                // Get temperature if exists
                if (infoSnap.child("temperature").exists()) {
                    device.put("temperature", infoSnap.child("temperature").getValue(Double.class));
                }
            } else {
                device.put("zone", "Unassigned");
            }

            result.add(device);
        }
        
        return result;
    }

    @GetMapping("/{deviceId}/logs")
    public Map<String, Double> getDeviceLogs(@PathVariable String deviceId, 
                                           @RequestParam(required = false) Integer limit) throws Exception {
        logger.info("Fetching logs for device {}", deviceId);
        DatabaseReference logsRef = FirebaseDatabase.getInstance()
                .getReference("devices/" + deviceId + "/logs");
        
        // If limit is provided, only get the last N entries
        Query query = limit != null ? logsRef.limitToLast(limit) : logsRef;
        
        ApiFuture<DataSnapshot> future = query.get();
        DataSnapshot snapshot = future.get();

        Map<String, Double> logs = new TreeMap<>();
        for (DataSnapshot entry : snapshot.getChildren()) {
            logs.put(entry.getKey(), entry.getValue(Double.class));
        }
        return logs;
    }

    @PostMapping("/{deviceId}/config")
    public ResponseEntity<?> setDeviceConfig(@PathVariable String deviceId, @RequestBody Map<String, Object> config) {
        logger.info("Setting config for device {}: {}", deviceId, config);
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("devices/" + deviceId + "/config");
        
        ref.setValueAsync(config).addListener(() -> {
            logger.info("Config saved successfully for device {}", deviceId);
        }, Runnable::run);
        
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{deviceId}/config")
    public Map<String, Object> getDeviceConfig(@PathVariable String deviceId) throws ExecutionException, InterruptedException {
        logger.info("Getting config for device {}", deviceId);
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("devices/" + deviceId + "/config");
        ApiFuture<DataSnapshot> future = ref.get();
        DataSnapshot snapshot = future.get();
        
        if (snapshot.exists()) {
            Map<String, Object> config = new HashMap<>();
            snapshot.getChildren().forEach(child -> {
                config.put(child.getKey(), child.getValue());
            });
            return config;
        }
        
        return new HashMap<>();
    }
    
    @PutMapping("/{deviceId}/zone")
    public ResponseEntity<?> setDeviceZone(@PathVariable String deviceId, @RequestBody Map<String, String> zoneData) {
        String zone = zoneData.get("zone");
        if (zone == null) {
            return ResponseEntity.badRequest().body("Zone is required");
        }
        
        logger.info("Setting zone for device {} to {}", deviceId, zone);
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("devices/" + deviceId + "/info/zone");
        ref.setValueAsync(zone);
        
        return ResponseEntity.ok().build();
    }
}
