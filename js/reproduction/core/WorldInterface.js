/**
 * WorldInterface.js
 * 
 * Abstraction layer that decouples the reproduction system from direct
 * game object manipulation. Provides clean interface for world queries
 * and mutations while preserving exact original behavior.
 * 
 * This layer allows for easier testing, debugging, and future modifications
 * without breaking the reproduction system logic.
 */

export class WorldInterface {
    constructor(gameReference) {
        if (!gameReference) {
            throw new Error('WorldInterface requires a valid game reference');
        }
        
        this.game = gameReference;
        
        // Cache for performance optimization (invalidated when dwarfs change)
        this._spatialCache = new Map();
        this._lastDwarfCount = 0;
    }
    
    /**
     * Get all dwarfs in the world
     * @returns {Array} Array of all dwarf objects
     */
    getAllDwarfs() {
        return this.game.dwarfs || [];
    }
    
    /**
     * Get all adult dwarfs
     * @returns {Array} Array of adult dwarf objects
     */
    getAdultDwarfs() {
        return this.getAllDwarfs().filter(dwarf => dwarf.isAdult);
    }
    
    /**
     * Get all available females (adult, not pregnant, reproduction cooldown <= 0)
     * Preserves exact filtering logic from original seekMating() function
     * 
     * @returns {Array} Array of available female dwarfs
     */
    getAvailableFemales() {
        return this.getAllDwarfs().filter(dwarf => {
            return dwarf.isAdult && 
                   dwarf.gender === 'female' && 
                   !dwarf.isPregnant && 
                   dwarf.reproductionCooldown <= 0;
        });
    }
    
    /**
     * Get all adult males
     * @returns {Array} Array of adult male dwarfs
     */
    getAdultMales() {
        return this.getAdultDwarfs().filter(dwarf => dwarf.gender === 'male');
    }
    
    /**
     * Get nearby dwarfs within specified radius of a center point
     * Preserves exact distance calculation from original implementation
     * 
     * @param {Object} centerDwarf - Dwarf at center of search
     * @param {number} radius - Search radius in world units
     * @param {Function} [additionalFilter] - Optional additional filter function
     * @returns {Array} Array of nearby dwarfs matching criteria
     */
    getNearbyDwarfs(centerDwarf, radius, additionalFilter = null) {
        const allDwarfs = this.getAllDwarfs();
        let nearbyDwarfs = allDwarfs.filter(dwarf => {
            if (dwarf === centerDwarf) return false;
            
            const distance = this.calculateDistance(centerDwarf, dwarf);
            return distance < radius;
        });
        
        if (additionalFilter) {
            nearbyDwarfs = nearbyDwarfs.filter(additionalFilter);
        }
        
        return nearbyDwarfs;
    }
    
    /**
     * Get nearby males within specified radius, excluding specified male
     * Used for territory competition detection and guard detection
     * 
     * @param {Object} centerPoint - Point to search around (dwarf or {x, y})
     * @param {number} radius - Search radius
     * @param {Object} excludeMale - Male dwarf to exclude from results
     * @returns {Array} Array of nearby male dwarfs
     */
    getNearbyMales(centerPoint, radius, excludeMale = null) {
        return this.getNearbyDwarfs(centerPoint, radius, dwarf => {
            return dwarf.gender === 'male' && 
                   dwarf.isAdult && 
                   dwarf !== excludeMale;
        });
    }
    
    /**
     * Get nearby males around a female for mate evaluation
     * Preserves exact logic from evaluateMales() function
     * 
     * @param {Object} female - Female dwarf to search around
     * @param {number} radius - Search radius (default 40 from original)
     * @returns {Array} Array of nearby eligible male dwarfs
     */
    getNearbyMalesForFemale(female, radius = 40) {
        return this.getNearbyDwarfs(female, radius, dwarf => {
            return dwarf.isAdult && dwarf.gender === 'male';
        });
    }
    
    /**
     * Calculate distance between two objects with x,y coordinates
     * Uses exact same math as original distanceTo() method
     * 
     * @param {Object} obj1 - First object with x,y properties
     * @param {Object} obj2 - Second object with x,y properties
     * @returns {number} Distance between objects
     */
    calculateDistance(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Add a new dwarf to the world
     * Preserves exact behavior from original giveBirth() function
     * 
     * @param {Object} dwarf - Dwarf object to add
     */
    addDwarf(dwarf) {
        if (!this.game.dwarfs) {
            this.game.dwarfs = [];
        }
        
        this.game.dwarfs.push(dwarf);
        this._invalidateCache();
    }
    
    /**
     * Add log message to game log system
     * Preserves exact behavior from original addLog() function
     * 
     * @param {string} message - Log message text
     * @param {boolean} important - Whether message is important
     * @param {string} type - Message type ('success', 'warning', etc.)
     */
    addLog(message, important = false, type = null) {
        // Use global addLog function from original implementation
        if (typeof addLog === 'function') {
            addLog(message, important, type);
        } else {
            // Fallback for testing environments
            console.log(`[${type || 'LOG'}] ${message}`);
        }
    }
    
    /**
     * Get canvas dimensions for boundary calculations
     * Used for territorial displacement flee calculations
     * 
     * @returns {Object} Canvas dimensions {width, height}
     */
    getCanvasDimensions() {
        // Access global canvas object from original implementation
        if (typeof canvas !== 'undefined' && canvas) {
            return {
                width: canvas.width,
                height: canvas.height
            };
        }
        
        // Fallback dimensions for testing
        return {
            width: 800,
            height: 600
        };
    }
    
    /**
     * Set dwarf target position for movement
     * Preserves exact behavior from strategy implementations
     * 
     * @param {Object} dwarf - Dwarf to set target for
     * @param {number} x - Target x coordinate
     * @param {number} y - Target y coordinate
     */
    setDwarfTarget(dwarf, x, y) {
        dwarf.targetX = x;
        dwarf.targetY = y;
    }
    
    /**
     * Set dwarf task and work timer
     * Preserves exact behavior from territorial displacement
     * 
     * @param {Object} dwarf - Dwarf to set task for
     * @param {string} task - Task name
     * @param {number} workTimer - Duration of task in ticks
     */
    setDwarfTask(dwarf, task, workTimer = 0) {
        dwarf.task = task;
        if (workTimer > 0) {
            dwarf.workTimer = workTimer;
        }
    }
    
    /**
     * Create a new dwarf with specified parameters
     * Preserves exact constructor behavior from original Dwarf class
     * 
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate  
     * @param {string} name - Dwarf name (null for random)
     * @param {boolean} isAdult - Whether dwarf starts as adult
     * @returns {Object} New dwarf object
     */
    createDwarf(x, y, name = null, isAdult = false) {
        // This will need to use the original Dwarf constructor
        // For now, we'll assume it's globally available
        if (typeof Dwarf === 'function') {
            return new Dwarf(x, y, name, isAdult);
        }
        
        throw new Error('Dwarf constructor not available in global scope');
    }
    
    /**
     * Get population statistics for debugging and monitoring
     * @returns {Object} Population statistics
     */
    getPopulationStats() {
        const allDwarfs = this.getAllDwarfs();
        const adults = this.getAdultDwarfs();
        const males = this.getAdultMales();
        const females = adults.filter(d => d.gender === 'female');
        const pregnant = females.filter(d => d.isPregnant);
        
        const malesByStrategy = {
            orange: males.filter(m => m.reproductionStrategy === 'orange').length,
            blue: males.filter(m => m.reproductionStrategy === 'blue').length,
            yellow: males.filter(m => m.reproductionStrategy === 'yellow').length
        };
        
        return {
            total: allDwarfs.length,
            adults: adults.length,
            children: allDwarfs.length - adults.length,
            males: males.length,
            females: females.length,
            pregnant: pregnant.length,
            availableFemales: this.getAvailableFemales().length,
            malesByStrategy
        };
    }
    
    /**
     * Invalidate spatial cache when dwarf population changes
     * @private
     */
    _invalidateCache() {
        this._spatialCache.clear();
        this._lastDwarfCount = this.getAllDwarfs().length;
    }
    
    /**
     * Check if spatial cache needs invalidation
     * @private
     */
    _checkCacheInvalidation() {
        const currentCount = this.getAllDwarfs().length;
        if (currentCount !== this._lastDwarfCount) {
            this._invalidateCache();
        }
    }
}

/**
 * Factory function for creating WorldInterface instances
 * Provides convenient interface for dependency injection
 * 
 * @param {Object} gameReference - Game object reference
 * @returns {WorldInterface} New WorldInterface instance
 */
export function createWorldInterface(gameReference) {
    return new WorldInterface(gameReference);
}