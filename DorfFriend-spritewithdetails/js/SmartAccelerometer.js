/**
 * SmartAccelerometer.js
 * 
 * Smart accelerometer permission pattern for web games.
 * Automatically detects when permissions are needed and only shows
 * permission UI when necessary, providing seamless experience on Android
 * and minimal friction on iOS 13+.
 * 
 * Usage:
 *   const accelerometer = new SmartAccelerometer();
 *   accelerometer.initialize({
 *     onMotion: (data) => { /* handle motion data */ },
 *     onPermissionNeeded: () => { /* show permission button */ },
 *     onReady: () => { /* start game */ }
 *   });
 */

export class SmartAccelerometer {
    constructor() {
        // State tracking
        this.sensorsWorking = false;
        this.gameStarted = false;
        this.permissionRequested = false;
        this.detectionTimeout = null;
        this.detectionPeriod = 2000; // 2 seconds
        
        // Configuration
        this.config = {
            onMotion: null,
            onOrientation: null,
            onPermissionNeeded: null,
            onPermissionGranted: null,
            onPermissionDenied: null,
            onReady: null,
            onFallback: null
        };
        
        // Sensor data
        this.lastMotionData = null;
        this.lastOrientationData = null;
        
        // Device detection
        this.isIOS = this.detectIOS();
        this.requiresPermission = this.detectPermissionRequirement();
        
        console.log('SmartAccelerometer initialized', {
            isIOS: this.isIOS,
            requiresPermission: this.requiresPermission
        });
    }
    
    /**
     * Initialize the accelerometer system
     * @param {Object} config - Configuration object with callbacks
     */
    initialize(config = {}) {
        this.config = { ...this.config, ...config };
        
        console.log('SmartAccelerometer: Starting initialization');
        
        // Start immediate sensor detection
        this.startSensorDetection();
        
        // Set detection timeout
        this.detectionTimeout = setTimeout(() => {
            this.handleDetectionTimeout();
        }, this.detectionPeriod);
    }
    
    /**
     * Start listening for sensor events immediately
     */
    startSensorDetection() {
        // Add motion event listener
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', this.handleDeviceMotion.bind(this), true);
        }
        
        // Add orientation event listener
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this), true);
        }
        
        console.log('SmartAccelerometer: Event listeners added');
    }
    
    /**
     * Handle device motion events
     * @param {DeviceMotionEvent} event - Motion event data
     */
    handleDeviceMotion(event) {
        if (!this.sensorsWorking) {
            console.log('SmartAccelerometer: Motion sensors detected working');
            this.markSensorsWorking();
        }
        
        // Store motion data
        this.lastMotionData = {
            acceleration: event.acceleration,
            accelerationIncludingGravity: event.accelerationIncludingGravity,
            rotationRate: event.rotationRate,
            timestamp: event.timeStamp || Date.now()
        };
        
        // Call user callback if sensors are confirmed working
        if (this.sensorsWorking && this.config.onMotion) {
            this.config.onMotion(this.lastMotionData);
        }
    }
    
    /**
     * Handle device orientation events
     * @param {DeviceOrientationEvent} event - Orientation event data
     */
    handleDeviceOrientation(event) {
        if (!this.sensorsWorking && (event.alpha !== null || event.beta !== null || event.gamma !== null)) {
            console.log('SmartAccelerometer: Orientation sensors detected working');
            this.markSensorsWorking();
        }
        
        // Store orientation data
        this.lastOrientationData = {
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: event.absolute,
            timestamp: Date.now()
        };
        
        // Call user callback if sensors are confirmed working
        if (this.sensorsWorking && this.config.onOrientation) {
            this.config.onOrientation(this.lastOrientationData);
        }
    }
    
    /**
     * Mark sensors as working and start game
     */
    markSensorsWorking() {
        if (this.sensorsWorking) return; // Already marked
        
        this.sensorsWorking = true;
        
        // Clear detection timeout
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = null;
        }
        
        // Start game
        this.startGame();
    }
    
    /**
     * Handle detection timeout (sensors didn't work automatically)
     */
    handleDetectionTimeout() {
        console.log('SmartAccelerometer: Detection timeout - sensors not working automatically');
        
        this.detectionTimeout = null;
        
        if (this.sensorsWorking) {
            // Sensors started working just before timeout
            return;
        }
        
        if (this.requiresPermission) {
            // Show permission button for iOS 13+
            console.log('SmartAccelerometer: Showing permission button');
            if (this.config.onPermissionNeeded) {
                this.config.onPermissionNeeded();
            }
        } else {
            // Sensors not supported or not working
            console.log('SmartAccelerometer: Falling back to alternative controls');
            this.handleFallback();
        }
    }
    
    /**
     * Request sensor permissions (iOS 13+)
     * Call this from your permission button click handler
     */
    async requestSensorPermission() {
        if (this.permissionRequested) {
            console.log('SmartAccelerometer: Permission already requested');
            return;
        }
        
        this.permissionRequested = true;
        
        console.log('SmartAccelerometer: Requesting sensor permissions');
        
        try {
            let motionPermission = 'granted';
            let orientationPermission = 'granted';
            
            // Request motion permission if available
            if (typeof DeviceMotionEvent !== 'undefined' && 
                typeof DeviceMotionEvent.requestPermission === 'function') {
                motionPermission = await DeviceMotionEvent.requestPermission();
                console.log('SmartAccelerometer: Motion permission:', motionPermission);
            }
            
            // Request orientation permission if available
            if (typeof DeviceOrientationEvent !== 'undefined' && 
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                orientationPermission = await DeviceOrientationEvent.requestPermission();
                console.log('SmartAccelerometer: Orientation permission:', orientationPermission);
            }
            
            if (motionPermission === 'granted' || orientationPermission === 'granted') {
                console.log('SmartAccelerometer: Permission granted');
                
                // Start detection again with a shorter timeout
                this.detectionTimeout = setTimeout(() => {
                    if (!this.sensorsWorking) {
                        console.log('SmartAccelerometer: Sensors still not working after permission');
                        this.handleFallback();
                    }
                }, 1000);
                
                if (this.config.onPermissionGranted) {
                    this.config.onPermissionGranted();
                }
            } else {
                console.log('SmartAccelerometer: Permission denied');
                this.handlePermissionDenied();
            }
        } catch (error) {
            console.error('SmartAccelerometer: Error requesting permissions:', error);
            this.handlePermissionDenied();
        }
    }
    
    /**
     * Handle permission denied scenario
     */
    handlePermissionDenied() {
        console.log('SmartAccelerometer: Permission denied, falling back');
        
        if (this.config.onPermissionDenied) {
            this.config.onPermissionDenied();
        }
        
        this.handleFallback();
    }
    
    /**
     * Handle fallback to alternative controls
     */
    handleFallback() {
        console.log('SmartAccelerometer: Using fallback controls');
        
        if (this.config.onFallback) {
            this.config.onFallback();
        } else {
            // Default fallback behavior
            console.log('SmartAccelerometer: No fallback configured');
        }
    }
    
    /**
     * Start the game
     */
    startGame() {
        if (this.gameStarted) return;
        
        this.gameStarted = true;
        console.log('SmartAccelerometer: Starting game');
        
        if (this.config.onReady) {
            this.config.onReady();
        }
    }
    
    /**
     * Detect if device is iOS
     * @returns {boolean} True if iOS device
     */
    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }
    
    /**
     * Detect if device requires permission for sensors
     * @returns {boolean} True if permission is required
     */
    detectPermissionRequirement() {
        return this.isIOS && 
               typeof DeviceMotionEvent !== 'undefined' &&
               typeof DeviceMotionEvent.requestPermission === 'function';
    }
    
    /**
     * Get current sensor status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            sensorsWorking: this.sensorsWorking,
            gameStarted: this.gameStarted,
            permissionRequested: this.permissionRequested,
            isIOS: this.isIOS,
            requiresPermission: this.requiresPermission,
            hasMotionData: !!this.lastMotionData,
            hasOrientationData: !!this.lastOrientationData
        };
    }
    
    /**
     * Get latest sensor data
     * @returns {Object} Latest motion and orientation data
     */
    getLatestData() {
        return {
            motion: this.lastMotionData,
            orientation: this.lastOrientationData,
            timestamp: Date.now()
        };
    }
    
    /**
     * Clean up event listeners and timers
     */
    destroy() {
        console.log('SmartAccelerometer: Cleaning up');
        
        // Remove event listeners
        if (window.DeviceMotionEvent) {
            window.removeEventListener('devicemotion', this.handleDeviceMotion.bind(this), true);
        }
        
        if (window.DeviceOrientationEvent) {
            window.removeEventListener('deviceorientation', this.handleDeviceOrientation.bind(this), true);
        }
        
        // Clear timeout
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
            this.detectionTimeout = null;
        }
        
        // Reset state
        this.sensorsWorking = false;
        this.gameStarted = false;
        this.permissionRequested = false;
    }
}

/**
 * Utility functions for common sensor calculations
 */
export class SensorUtils {
    /**
     * Calculate tilt angles from acceleration data
     * @param {Object} acceleration - Acceleration data
     * @returns {Object} Tilt angles in degrees
     */
    static calculateTilt(acceleration) {
        if (!acceleration || (!acceleration.x && !acceleration.y && !acceleration.z)) {
            return { tiltX: 0, tiltY: 0 };
        }
        
        const { x, y, z } = acceleration;
        
        // Calculate tilt angles in degrees
        const tiltX = Math.atan2(y, z) * (180 / Math.PI);
        const tiltY = Math.atan2(-x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
        
        return { tiltX, tiltY };
    }
    
    /**
     * Normalize sensor values to a range
     * @param {number} value - Raw sensor value
     * @param {number} maxInput - Maximum expected input value
     * @param {number} maxOutput - Maximum output value
     * @returns {number} Normalized value
     */
    static normalize(value, maxInput = 10, maxOutput = 1) {
        const clamped = Math.max(-maxInput, Math.min(maxInput, value));
        return (clamped / maxInput) * maxOutput;
    }
    
    /**
     * Apply deadzone to sensor input
     * @param {number} value - Input value
     * @param {number} deadzone - Deadzone threshold
     * @returns {number} Value with deadzone applied
     */
    static applyDeadzone(value, deadzone = 0.1) {
        const absValue = Math.abs(value);
        if (absValue < deadzone) return 0;
        
        const sign = value < 0 ? -1 : 1;
        return sign * ((absValue - deadzone) / (1 - deadzone));
    }
    
    /**
     * Smooth sensor input using exponential smoothing
     * @param {number} currentValue - Current sensor value
     * @param {number} previousValue - Previous smoothed value
     * @param {number} smoothing - Smoothing factor (0-1)
     * @returns {number} Smoothed value
     */
    static smooth(currentValue, previousValue = 0, smoothing = 0.8) {
        return smoothing * previousValue + (1 - smoothing) * currentValue;
    }
}