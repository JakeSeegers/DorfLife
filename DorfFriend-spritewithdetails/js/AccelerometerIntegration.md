# Smart Accelerometer Integration Guide

## Overview
The Smart Accelerometer system provides seamless motion controls for web games with intelligent permission handling. It automatically detects when permissions are needed and only shows UI prompts when necessary.

## Key Benefits
- ✅ **Zero friction on Android** - Motion controls work immediately
- ✅ **Minimal friction on iOS 13+** - Permission button only appears when needed
- ✅ **Progressive enhancement** - Graceful fallback to touch controls
- ✅ **Smart detection** - 2-second timeout to detect sensor availability
- ✅ **Production ready** - Comprehensive error handling and edge cases

## Quick Integration

### 1. Basic Implementation
```javascript
import { SmartAccelerometer, SensorUtils } from './SmartAccelerometer.js';

const accelerometer = new SmartAccelerometer();

accelerometer.initialize({
    onMotion: (data) => {
        // Handle motion data
        const tilt = SensorUtils.calculateTilt(data.accelerationIncludingGravity);
        console.log('Tilt:', tilt.tiltX, tilt.tiltY);
    },
    
    onPermissionNeeded: () => {
        // Show permission button
        document.getElementById('motion-permission-btn').style.display = 'block';
    },
    
    onReady: () => {
        // Start game with motion controls
        startGameWithMotion();
    },
    
    onFallback: () => {
        // Start game with touch controls
        startGameWithTouch();
    }
});

// Handle permission button click
document.getElementById('motion-permission-btn').addEventListener('click', () => {
    accelerometer.requestSensorPermission();
});
```

### 2. HTML Structure
```html
<button id="motion-permission-btn" style="display: none;">
    🎮 Enable Motion Controls
</button>

<div id="game-area">
    <!-- Your game content -->
</div>

<div id="fallback-controls" style="display: none;">
    <!-- Touch controls for devices without motion -->
</div>
```

## Advanced Usage

### Sensor Data Processing
```javascript
// Smooth sensor input to reduce jitter
let smoothedX = 0;
let smoothedY = 0;

accelerometer.initialize({
    onMotion: (data) => {
        const tilt = SensorUtils.calculateTilt(data.accelerationIncludingGravity);
        
        // Apply smoothing (0.8 = heavy smoothing, 0.2 = light smoothing)
        smoothedX = SensorUtils.smooth(tilt.tiltX, smoothedX, 0.8);
        smoothedY = SensorUtils.smooth(tilt.tiltY, smoothedY, 0.8);
        
        // Apply deadzone to eliminate small movements
        const deadzonedX = SensorUtils.applyDeadzone(smoothedX / 90, 0.1);
        const deadzonedY = SensorUtils.applyDeadzone(smoothedY / 90, 0.1);
        
        // Normalize to game coordinates
        const gameX = SensorUtils.normalize(deadzonedX, 1, 100);
        const gameY = SensorUtils.normalize(deadzonedY, 1, 100);
        
        updateGameObject(gameX, gameY);
    }
});
```

### Game State Management
```javascript
class MotionControlledGame {
    constructor() {
        this.accelerometer = new SmartAccelerometer();
        this.gameState = 'initializing';
        this.controlMode = null;
        
        this.initializeControls();
    }
    
    initializeControls() {
        this.accelerometer.initialize({
            onMotion: this.handleMotion.bind(this),
            onOrientation: this.handleOrientation.bind(this),
            onPermissionNeeded: this.showPermissionUI.bind(this),
            onReady: () => this.startGame('motion'),
            onFallback: () => this.startGame('touch')
        });
    }
    
    handleMotion(data) {
        if (this.gameState !== 'playing') return;
        
        // Process motion data for game controls
        const tilt = SensorUtils.calculateTilt(data.accelerationIncludingGravity);
        this.updatePlayerPosition(tilt);
    }
    
    startGame(controlMode) {
        this.controlMode = controlMode;
        this.gameState = 'playing';
        
        if (controlMode === 'touch') {
            this.setupTouchControls();
        }
        
        console.log(`Game started with ${controlMode} controls`);
    }
    
    showPermissionUI() {
        // Show permission button with context
        const permissionModal = document.getElementById('permission-modal');
        permissionModal.innerHTML = `
            <h3>Enhanced Controls Available!</h3>
            <p>Tilt your device to control the game for a more immersive experience.</p>
            <button onclick="this.requestPermission()">Enable Motion Controls</button>
            <button onclick="this.useTouchControls()">Use Touch Instead</button>
        `;
        permissionModal.style.display = 'block';
    }
}
```

### DorfFriend Integration Example
```javascript
// Integration with existing DorfFriend game
function integrateDorfFriendMotion() {
    const accelerometer = new SmartAccelerometer();
    let cameraX = 0;
    let cameraY = 0;
    
    accelerometer.initialize({
        onMotion: (data) => {
            // Use motion for camera control
            const tilt = SensorUtils.calculateTilt(data.accelerationIncludingGravity);
            
            // Smooth camera movement
            cameraX += SensorUtils.normalize(tilt.tiltX, 90, 2);
            cameraY += SensorUtils.normalize(tilt.tiltY, 90, 2);
            
            // Apply to existing camera system
            if (typeof updateCameraPosition === 'function') {
                updateCameraPosition(cameraX, cameraY);
            }
        },
        
        onPermissionNeeded: () => {
            // Show contextual permission request
            showDorfMotionPermission();
        },
        
        onReady: () => {
            // Enable motion-based camera controls
            console.log('DorfFriend: Motion camera controls enabled');
            showMotionTutorial();
        },
        
        onFallback: () => {
            // Keep existing touch/mouse controls
            console.log('DorfFriend: Using traditional controls');
        }
    });
    
    // Add to global game object
    if (typeof game !== 'undefined') {
        game.motionControls = accelerometer;
    }
}
```

## Configuration Options

### Detection Settings
```javascript
const accelerometer = new SmartAccelerometer();

// Customize detection timeout (default: 2000ms)
accelerometer.detectionPeriod = 1500; // 1.5 seconds

// Initialize with custom configuration
accelerometer.initialize({
    // Callbacks
    onMotion: handleMotion,
    onOrientation: handleOrientation,
    onPermissionNeeded: showPermissionButton,
    onPermissionGranted: hidePermissionButton,
    onPermissionDenied: handlePermissionDenied,
    onReady: startGame,
    onFallback: setupAlternativeControls
});
```

### Sensor Utility Functions
```javascript
// Available utility functions
const utils = SensorUtils;

// Calculate device tilt from acceleration
const tilt = utils.calculateTilt(motionData.accelerationIncludingGravity);

// Smooth sensor input (reduces jitter)
const smoothed = utils.smooth(currentValue, previousValue, 0.8);

// Apply deadzone (ignore small movements)
const deadzoned = utils.applyDeadzone(value, 0.1);

// Normalize to desired range
const normalized = utils.normalize(sensorValue, 10, 100);
```

## Testing Checklist

### Device Testing
- [ ] **Android Chrome** - Sensors work immediately, no permission needed
- [ ] **iOS Safari 13+** - Permission button appears, works after granted
- [ ] **iOS Safari 12-** - Sensors work immediately or fallback gracefully
- [ ] **Desktop** - Fallback controls appear immediately

### Edge Cases
- [ ] **Permission denied** - Fallback controls appear
- [ ] **Sensors not supported** - Fallback controls appear
- [ ] **Partial sensor support** - Works with available sensors
- [ ] **Network issues** - Module loading handled gracefully

### User Experience
- [ ] **Loading state** - Clear feedback during detection period
- [ ] **Permission context** - Users understand why permission is needed
- [ ] **Fallback quality** - Touch controls provide good alternative
- [ ] **Visual feedback** - Clear indication of control mode

## Browser Compatibility

| Browser | Version | Motion Support | Permission Required |
|---------|---------|----------------|-------------------|
| Chrome Android | All | ✅ Yes | ❌ No |
| Firefox Android | All | ✅ Yes | ❌ No |
| Safari iOS | 13+ | ✅ Yes | ✅ Yes |
| Safari iOS | <13 | ✅ Yes | ❌ No |
| Chrome Desktop | All | ❌ No | N/A |
| Safari Desktop | All | ❌ No | N/A |

## Performance Considerations

### Optimization Tips
```javascript
// Throttle sensor updates for better performance
let lastUpdate = 0;
const updateThrottle = 16; // ~60fps

accelerometer.initialize({
    onMotion: (data) => {
        const now = Date.now();
        if (now - lastUpdate < updateThrottle) return;
        lastUpdate = now;
        
        // Process motion data
        handleGameMotion(data);
    }
});

// Clean up when not needed
window.addEventListener('beforeunload', () => {
    accelerometer.destroy();
});
```

### Memory Management
```javascript
// Proper cleanup
class GameWithMotion {
    constructor() {
        this.accelerometer = new SmartAccelerometer();
    }
    
    destroy() {
        this.accelerometer.destroy();
        this.accelerometer = null;
    }
}
```

## Debug Commands

### Browser Console
```javascript
// Check sensor status
accelerometer.getStatus();

// Get latest sensor data
accelerometer.getLatestData();

// Test utility functions
SensorUtils.calculateTilt({x: 0, y: 5, z: 10});
```

### Development Logging
```javascript
// Enable detailed logging
console.log('Accelerometer status:', accelerometer.getStatus());

// Monitor events in real-time
accelerometer.config.onMotion = (data) => {
    console.log('Motion:', data);
    // Your game logic here
};
```

## Common Issues & Solutions

### Issue: Permission button doesn't appear on iOS
**Solution**: Ensure you're testing on iOS 13+ with Safari. Use device simulator or real device.

### Issue: Sensors work but data is jumpy
**Solution**: Apply smoothing and deadzone:
```javascript
const smoothed = SensorUtils.smooth(rawValue, previousValue, 0.8);
const clean = SensorUtils.applyDeadzone(smoothed, 0.1);
```

### Issue: Game starts before sensors are ready
**Solution**: Only initialize game in the `onReady` callback:
```javascript
accelerometer.initialize({
    onReady: () => {
        // Safe to start game here
        initializeGameWithMotion();
    }
});
```

### Issue: Fallback controls not working
**Solution**: Test fallback independently:
```javascript
accelerometer.initialize({
    onFallback: () => {
        console.log('Testing fallback controls');
        setupTouchControls();
    }
});
```

This smart accelerometer system provides a robust foundation for motion-controlled web games with excellent cross-platform compatibility and user experience.