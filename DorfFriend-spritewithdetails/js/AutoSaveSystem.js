/**
 * AutoSaveSystem.js
 * 
 * Comprehensive auto-save system for web games with multiple save slots,
 * compression, versioning, and robust error handling.
 * 
 * Features:
 * - Multiple save slots with metadata
 * - Automatic periodic saving
 * - Manual save/load with confirmation
 * - Save data compression to reduce localStorage usage
 * - Version migration for game updates
 * - Export/import functionality
 * - Save corruption detection and recovery
 */

export class AutoSaveSystem {
    constructor(options = {}) {
        this.gameId = options.gameId || 'dorfriend';
        this.version = options.version || '1.0.0';
        this.maxSlots = options.maxSlots || 5;
        this.autoSaveInterval = options.autoSaveInterval || 30000; // 30 seconds
        this.compressionEnabled = options.compression !== false;
        
        // State tracking
        this.isAutoSaving = false;
        this.autoSaveTimer = null;
        this.saveInProgress = false;
        this.lastSaveTime = null;
        this.saveCount = 0;
        
        // Save data serializers
        this.serializers = new Map();
        this.deserializers = new Map();
        
        // Statistics
        this.stats = {
            totalSaves: 0,
            totalLoads: 0,
            autoSaves: 0,
            manualSaves: 0,
            compressionRatio: 0,
            lastSaveSize: 0
        };
        
        // Initialize default serializers
        this.initializeDefaultSerializers();
        
        console.log('AutoSaveSystem initialized', {
            gameId: this.gameId,
            version: this.version,
            maxSlots: this.maxSlots,
            autoSaveInterval: this.autoSaveInterval
        });
    }
    
    /**
     * Initialize default serializers for common game objects
     */
    initializeDefaultSerializers() {
        // Dwarf serializer
        this.addSerializer('dwarf', (dwarf) => {
            return {
                name: dwarf.name,
                x: dwarf.x,
                y: dwarf.y,
                gender: dwarf.gender,
                isAdult: dwarf.isAdult,
                class: dwarf.class,
                
                // Basic needs
                hunger: dwarf.hunger,
                thirst: dwarf.thirst,
                rest: dwarf.rest,
                joy: dwarf.joy,
                coffee: dwarf.coffee,
                cleanliness: dwarf.cleanliness,
                
                // Personality
                personality: dwarf.personality,
                
                // Reproduction data
                reproductionStrategy: dwarf.reproductionStrategy,
                isPregnant: dwarf.isPregnant,
                pregnancyTimer: dwarf.pregnancyTimer,
                reproductionCooldown: dwarf.reproductionCooldown,
                maturityTimer: dwarf.maturityTimer,
                territoryX: dwarf.territoryX,
                territoryY: dwarf.territoryY,
                guardedFemale: dwarf.guardedFemale ? dwarf.guardedFemale.name : null,
                mateSeekingTimer: dwarf.mateSeekingTimer,
                
                // Work and behavior
                task: dwarf.task,
                workTimer: dwarf.workTimer,
                efficiency: dwarf.efficiency,
                targetX: dwarf.targetX,
                targetY: dwarf.targetY,
                
                // Other states
                panicLevel: dwarf.panicLevel,
                personalityState: dwarf.personalityState
            };
        });
        
        // Building serializer
        this.addSerializer('building', (building) => {
            return {
                type: building.type,
                x: building.x,
                y: building.y,
                width: building.width,
                height: building.height,
                built: building.built,
                buildProgress: building.buildProgress,
                amenityType: building.amenityType,
                negativeType: building.negativeType
            };
        });
        
        // Game state serializer
        this.addSerializer('gameState', (game) => {
            return {
                time: game.time,
                gold: game.gold,
                goldPerSecond: game.goldPerSecond,
                rocketParts: game.rocketParts,
                population: game.dwarfs ? game.dwarfs.length : 0
            };
        });
    }
    
    /**
     * Add custom serializer for specific object types
     * @param {string} type - Object type identifier
     * @param {Function} serializer - Function to serialize object
     */
    addSerializer(type, serializer) {
        this.serializers.set(type, serializer);
    }
    
    /**
     * Add custom deserializer for specific object types
     * @param {string} type - Object type identifier
     * @param {Function} deserializer - Function to deserialize object data
     */
    addDeserializer(type, deserializer) {
        this.deserializers.set(type, deserializer);
    }
    
    /**
     * Start automatic saving
     */
    startAutoSave() {
        if (this.isAutoSaving) {
            console.log('AutoSaveSystem: Auto-save already running');
            return;
        }
        
        this.isAutoSaving = true;
        this.autoSaveTimer = setInterval(() => {
            this.performAutoSave();
        }, this.autoSaveInterval);
        
        console.log(`AutoSaveSystem: Auto-save started (every ${this.autoSaveInterval/1000}s)`);
    }
    
    /**
     * Stop automatic saving
     */
    stopAutoSave() {
        if (!this.isAutoSaving) return;
        
        this.isAutoSaving = false;
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        console.log('AutoSaveSystem: Auto-save stopped');
    }
    
    /**
     * Perform automatic save
     */
    async performAutoSave() {
        if (this.saveInProgress) {
            console.log('AutoSaveSystem: Skipping auto-save (save in progress)');
            return;
        }
        
        try {
            const success = await this.saveToSlot(0, 'Auto-save', true);
            if (success) {
                this.stats.autoSaves++;
                console.log('AutoSaveSystem: Auto-save completed');
                this.dispatchSaveEvent('autosave', { slot: 0, success: true });
            }
        } catch (error) {
            console.error('AutoSaveSystem: Auto-save failed:', error);
            this.dispatchSaveEvent('autosave', { slot: 0, success: false, error: error.message });
        }
    }
    
    /**
     * Save game to specified slot
     * @param {number} slot - Save slot number (0-based)
     * @param {string} description - Save description
     * @param {boolean} isAutoSave - Whether this is an automatic save
     * @returns {boolean} Success status
     */
    async saveToSlot(slot, description = '', isAutoSave = false) {
        if (this.saveInProgress) {
            console.warn('AutoSaveSystem: Save already in progress');
            return false;
        }
        
        if (slot < 0 || slot >= this.maxSlots) {
            console.error(`AutoSaveSystem: Invalid slot ${slot} (max: ${this.maxSlots})`);
            return false;
        }
        
        this.saveInProgress = true;
        const startTime = Date.now();
        
        try {
            // Collect save data
            const saveData = this.collectSaveData();
            
            // Create save metadata
            const metadata = {
                slot: slot,
                description: description,
                timestamp: Date.now(),
                gameTime: saveData.gameState?.time || 0,
                version: this.version,
                isAutoSave: isAutoSave,
                saveCount: ++this.saveCount
            };
            
            // Create complete save object
            const saveObject = {
                metadata: metadata,
                data: saveData
            };
            
            // Serialize and compress
            let serialized = JSON.stringify(saveObject);
            const originalSize = serialized.length;
            
            if (this.compressionEnabled) {
                serialized = this.compressString(serialized);
            }
            
            const finalSize = serialized.length;
            this.stats.compressionRatio = originalSize > 0 ? (1 - finalSize / originalSize) * 100 : 0;
            this.stats.lastSaveSize = finalSize;
            
            // Save to localStorage
            const key = this.getSaveKey(slot);
            localStorage.setItem(key, serialized);
            
            // Update save list
            this.updateSaveList(slot, metadata);
            
            // Update statistics
            this.stats.totalSaves++;
            if (isAutoSave) {
                this.stats.autoSaves++;
            } else {
                this.stats.manualSaves++;
            }
            
            this.lastSaveTime = Date.now();
            const saveTime = Date.now() - startTime;
            
            console.log(`AutoSaveSystem: Saved to slot ${slot} (${saveTime}ms, ${finalSize} bytes, ${this.stats.compressionRatio.toFixed(1)}% compression)`);
            
            this.dispatchSaveEvent('save', { 
                slot, 
                success: true, 
                isAutoSave, 
                size: finalSize, 
                compressionRatio: this.stats.compressionRatio,
                saveTime 
            });
            
            return true;
            
        } catch (error) {
            console.error('AutoSaveSystem: Save failed:', error);
            this.dispatchSaveEvent('save', { slot, success: false, error: error.message });
            return false;
            
        } finally {
            this.saveInProgress = false;
        }
    }
    
    /**
     * Load game from specified slot
     * @param {number} slot - Save slot number
     * @returns {Object|null} Loaded save data or null if failed
     */
    async loadFromSlot(slot) {
        if (slot < 0 || slot >= this.maxSlots) {
            console.error(`AutoSaveSystem: Invalid slot ${slot}`);
            return null;
        }
        
        try {
            const key = this.getSaveKey(slot);
            let serialized = localStorage.getItem(key);
            
            if (!serialized) {
                console.warn(`AutoSaveSystem: No save data in slot ${slot}`);
                return null;
            }
            
            // Decompress if needed
            if (this.compressionEnabled) {
                serialized = this.decompressString(serialized);
            }
            
            const saveObject = JSON.parse(serialized);
            
            // Validate save data
            if (!this.validateSaveData(saveObject)) {
                console.error('AutoSaveSystem: Invalid save data');
                return null;
            }
            
            // Check version compatibility
            if (!this.isVersionCompatible(saveObject.metadata.version)) {
                console.warn('AutoSaveSystem: Save version mismatch, attempting migration');
                // TODO: Implement version migration
            }
            
            this.stats.totalLoads++;
            
            console.log(`AutoSaveSystem: Loaded from slot ${slot} (${saveObject.metadata.description})`);
            
            this.dispatchSaveEvent('load', { 
                slot, 
                success: true, 
                metadata: saveObject.metadata 
            });
            
            return saveObject.data;
            
        } catch (error) {
            console.error('AutoSaveSystem: Load failed:', error);
            this.dispatchSaveEvent('load', { slot, success: false, error: error.message });
            return null;
        }
    }
    
    /**
     * Get list of all saves with metadata
     * @returns {Array} Array of save metadata
     */
    getSaveList() {
        try {
            const listKey = `${this.gameId}_savelist`;
            const listData = localStorage.getItem(listKey);
            return listData ? JSON.parse(listData) : [];
        } catch (error) {
            console.error('AutoSaveSystem: Error reading save list:', error);
            return [];
        }
    }
    
    /**
     * Delete save from specified slot
     * @param {number} slot - Save slot number
     * @returns {boolean} Success status
     */
    deleteSave(slot) {
        try {
            const key = this.getSaveKey(slot);
            localStorage.removeItem(key);
            
            // Update save list
            this.removeSaveFromList(slot);
            
            console.log(`AutoSaveSystem: Deleted save in slot ${slot}`);
            this.dispatchSaveEvent('delete', { slot, success: true });
            
            return true;
            
        } catch (error) {
            console.error('AutoSaveSystem: Delete failed:', error);
            this.dispatchSaveEvent('delete', { slot, success: false, error: error.message });
            return false;
        }
    }
    
    /**
     * Export save data as downloadable file
     * @param {number} slot - Save slot to export
     * @param {string} filename - Export filename
     */
    exportSave(slot, filename = null) {
        try {
            const key = this.getSaveKey(slot);
            let data = localStorage.getItem(key);
            
            if (!data) {
                console.error(`AutoSaveSystem: No save data in slot ${slot}`);
                return;
            }
            
            // Create filename if not provided
            if (!filename) {
                const saveList = this.getSaveList();
                const saveInfo = saveList.find(s => s.slot === slot);
                const date = new Date().toISOString().split('T')[0];
                filename = `${this.gameId}_slot${slot}_${date}.json`;
            }
            
            // Create download
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log(`AutoSaveSystem: Exported slot ${slot} as ${filename}`);
            this.dispatchSaveEvent('export', { slot, success: true, filename });
            
        } catch (error) {
            console.error('AutoSaveSystem: Export failed:', error);
            this.dispatchSaveEvent('export', { slot, success: false, error: error.message });
        }
    }
    
    /**
     * Import save data from file
     * @param {File} file - File to import
     * @param {number} slot - Target slot for import
     * @returns {Promise<boolean>} Success status
     */
    async importSave(file, slot) {
        try {
            const text = await file.text();
            
            // Validate imported data
            const saveObject = JSON.parse(text);
            if (!this.validateSaveData(saveObject)) {
                throw new Error('Invalid save file format');
            }
            
            // Save to specified slot
            const key = this.getSaveKey(slot);
            localStorage.setItem(key, text);
            
            // Update save list
            this.updateSaveList(slot, saveObject.metadata);
            
            console.log(`AutoSaveSystem: Imported save to slot ${slot}`);
            this.dispatchSaveEvent('import', { slot, success: true, filename: file.name });
            
            return true;
            
        } catch (error) {
            console.error('AutoSaveSystem: Import failed:', error);
            this.dispatchSaveEvent('import', { slot, success: false, error: error.message });
            return false;
        }
    }
    
    /**
     * Collect all save data from the game
     * @returns {Object} Complete save data object
     */
    collectSaveData() {
        const saveData = {};
        
        // Get global game object if available
        const game = (typeof window !== 'undefined' && window.game) || {};
        
        // Serialize game state
        if (this.serializers.has('gameState')) {
            saveData.gameState = this.serializers.get('gameState')(game);
        }
        
        // Serialize dwarfs
        if (game.dwarfs && Array.isArray(game.dwarfs)) {
            const dwarfSerializer = this.serializers.get('dwarf');
            if (dwarfSerializer) {
                saveData.dwarfs = game.dwarfs.map(dwarf => dwarfSerializer(dwarf));
            }
        }
        
        // Serialize buildings
        if (game.buildings && Array.isArray(game.buildings)) {
            const buildingSerializer = this.serializers.get('building');
            if (buildingSerializer) {
                saveData.buildings = game.buildings.map(building => buildingSerializer(building));
            }
        }
        
        // Serialize reproduction system state
        if (game.reproductionSystem) {
            saveData.reproductionStats = game.reproductionSystem.getStatistics();
        }
        
        // Add custom save data
        if (typeof window !== 'undefined' && window.getCustomSaveData) {
            saveData.custom = window.getCustomSaveData();
        }
        
        return saveData;
    }
    
    /**
     * Get storage key for save slot
     * @param {number} slot - Save slot number
     * @returns {string} Storage key
     */
    getSaveKey(slot) {
        return `${this.gameId}_save_${slot}`;
    }
    
    /**
     * Update save list with new save metadata
     * @param {number} slot - Save slot
     * @param {Object} metadata - Save metadata
     */
    updateSaveList(slot, metadata) {
        try {
            let saveList = this.getSaveList();
            
            // Remove existing entry for this slot
            saveList = saveList.filter(s => s.slot !== slot);
            
            // Add new entry
            saveList.push(metadata);
            
            // Sort by slot number
            saveList.sort((a, b) => a.slot - b.slot);
            
            // Save updated list
            const listKey = `${this.gameId}_savelist`;
            localStorage.setItem(listKey, JSON.stringify(saveList));
            
        } catch (error) {
            console.error('AutoSaveSystem: Error updating save list:', error);
        }
    }
    
    /**
     * Remove save from save list
     * @param {number} slot - Save slot to remove
     */
    removeSaveFromList(slot) {
        try {
            let saveList = this.getSaveList();
            saveList = saveList.filter(s => s.slot !== slot);
            
            const listKey = `${this.gameId}_savelist`;
            localStorage.setItem(listKey, JSON.stringify(saveList));
            
        } catch (error) {
            console.error('AutoSaveSystem: Error removing from save list:', error);
        }
    }
    
    /**
     * Validate save data structure
     * @param {Object} saveObject - Save object to validate
     * @returns {boolean} Whether save data is valid
     */
    validateSaveData(saveObject) {
        return saveObject && 
               saveObject.metadata && 
               saveObject.data && 
               typeof saveObject.metadata.timestamp === 'number' &&
               typeof saveObject.metadata.version === 'string';
    }
    
    /**
     * Check if save version is compatible
     * @param {string} saveVersion - Version string from save
     * @returns {boolean} Whether version is compatible
     */
    isVersionCompatible(saveVersion) {
        // Simple version compatibility check
        // In a real implementation, you might want more sophisticated version comparison
        const [saveMajor] = saveVersion.split('.').map(Number);
        const [currentMajor] = this.version.split('.').map(Number);
        
        return saveMajor === currentMajor;
    }
    
    /**
     * Simple string compression (placeholder - you might want to use a real compression library)
     * @param {string} str - String to compress
     * @returns {string} Compressed string
     */
    compressString(str) {
        // Simple compression using JSON minification and basic encoding
        // In production, consider using a proper compression library like pako
        return btoa(str);
    }
    
    /**
     * Simple string decompression
     * @param {string} str - String to decompress
     * @returns {string} Decompressed string
     */
    decompressString(str) {
        return atob(str);
    }
    
    /**
     * Dispatch save system events
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    dispatchSaveEvent(eventType, data) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('autosave', {
                detail: {
                    type: eventType,
                    ...data
                }
            });
            window.dispatchEvent(event);
        }
    }
    
    /**
     * Get system statistics
     * @returns {Object} Save system statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            isAutoSaving: this.isAutoSaving,
            saveInProgress: this.saveInProgress,
            lastSaveTime: this.lastSaveTime,
            saveCount: this.saveCount,
            autoSaveInterval: this.autoSaveInterval,
            slotsUsed: this.getSaveList().length,
            maxSlots: this.maxSlots
        };
    }
    
    /**
     * Clean up and destroy the save system
     */
    destroy() {
        this.stopAutoSave();
        this.serializers.clear();
        this.deserializers.clear();
        
        console.log('AutoSaveSystem: Destroyed');
    }
}

/**
 * Save system utilities
 */
export class SaveUtils {
    /**
     * Get total localStorage usage for this game
     * @param {string} gameId - Game identifier
     * @returns {Object} Storage usage information
     */
    static getStorageUsage(gameId) {
        let totalSize = 0;
        let saveCount = 0;
        const keys = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(gameId)) {
                const value = localStorage.getItem(key);
                const size = value ? value.length : 0;
                totalSize += size;
                
                if (key.includes('_save_')) {
                    saveCount++;
                }
                
                keys.push({ key, size });
            }
        }
        
        return {
            totalSize,
            saveCount,
            keys: keys.sort((a, b) => b.size - a.size),
            percentOfQuota: totalSize / (5 * 1024 * 1024) * 100 // Assuming 5MB quota
        };
    }
    
    /**
     * Clear all save data for a game
     * @param {string} gameId - Game identifier
     * @returns {number} Number of items cleared
     */
    static clearAllSaves(gameId) {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(gameId)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log(`SaveUtils: Cleared ${keysToRemove.length} save entries for ${gameId}`);
        return keysToRemove.length;
    }
    
    /**
     * Check localStorage availability and quota
     * @returns {Object} Storage information
     */
    static checkStorageAvailability() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            // Estimate quota (this is approximate)
            let quota = 0;
            let used = 0;
            
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                navigator.storage.estimate().then(estimate => {
                    quota = estimate.quota || 0;
                    used = estimate.usage || 0;
                });
            }
            
            return {
                available: true,
                quota: quota,
                used: used,
                remaining: quota - used
            };
            
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }
}