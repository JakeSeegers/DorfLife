/**
 * ReproductionEventBus.js
 * 
 * Event-driven communication system for the reproduction module.
 * Provides loose coupling between reproduction system components
 * and enables debugging, logging, and future extensibility.
 * 
 * Events preserve all behavioral information from the original
 * implementation while allowing for enhanced monitoring and testing.
 */

export class ReproductionEventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        this.debugMode = false;
    }
    
    /**
     * Subscribe to an event type
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function to execute
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    subscribe(eventType, callback, options = {}) {
        if (typeof callback !== 'function') {
            throw new Error(`Event callback must be a function, got: ${typeof callback}`);
        }
        
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0
        };
        
        const listeners = this.listeners.get(eventType);
        listeners.push(listener);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);
        
        // Return unsubscribe function
        return () => this.unsubscribe(eventType, callback);
    }
    
    /**
     * Subscribe to an event that fires only once
     * @param {string} eventType - Event type to listen for
     * @param {Function} callback - Callback function to execute
     * @param {Object} options - Additional options
     * @returns {Function} Unsubscribe function
     */
    once(eventType, callback, options = {}) {
        return this.subscribe(eventType, callback, { ...options, once: true });
    }
    
    /**
     * Unsubscribe from an event
     * @param {string} eventType - Event type to unsubscribe from
     * @param {Function} callback - Callback function to remove
     */
    unsubscribe(eventType, callback) {
        const listeners = this.listeners.get(eventType);
        if (!listeners) return;
        
        const index = listeners.findIndex(listener => listener.callback === callback);
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        
        if (listeners.length === 0) {
            this.listeners.delete(eventType);
        }
    }
    
    /**
     * Emit an event to all subscribers
     * @param {string} eventType - Event type to emit
     * @param {Object} eventData - Event data payload
     */
    emit(eventType, eventData = {}) {
        const eventObject = {
            type: eventType,
            timestamp: Date.now(),
            data: eventData
        };
        
        // Add to event history
        this._addToHistory(eventObject);
        
        // Debug logging
        if (this.debugMode) {
            console.log(`[ReproductionEventBus] ${eventType}:`, eventData);
        }
        
        const listeners = this.listeners.get(eventType);
        if (!listeners) return;
        
        // Create a copy to avoid issues if listeners are modified during emission
        const listenersCopy = [...listeners];
        
        for (const listener of listenersCopy) {
            try {
                listener.callback(eventObject);
                
                // Remove one-time listeners
                if (listener.once) {
                    this.unsubscribe(eventType, listener.callback);
                }
            } catch (error) {
                console.error(`[ReproductionEventBus] Error in event listener for ${eventType}:`, error);
            }
        }
    }
    
    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
    
    /**
     * Get event history
     * @param {string} [eventType] - Filter by event type
     * @param {number} [limit] - Limit number of results
     * @returns {Array} Array of historical events
     */
    getEventHistory(eventType = null, limit = null) {
        let history = this.eventHistory;
        
        if (eventType) {
            history = history.filter(event => event.type === eventType);
        }
        
        if (limit && limit > 0) {
            history = history.slice(-limit);
        }
        
        return [...history]; // Return copy to prevent external modification
    }
    
    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
    
    /**
     * Get statistics about event activity
     * @returns {Object} Event statistics
     */
    getStats() {
        const eventCounts = {};
        const recentEvents = this.eventHistory.slice(-100);
        
        for (const event of this.eventHistory) {
            eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
        }
        
        const now = Date.now();
        const recentEventCounts = {};
        for (const event of recentEvents) {
            if (now - event.timestamp < 60000) { // Last minute
                recentEventCounts[event.type] = (recentEventCounts[event.type] || 0) + 1;
            }
        }
        
        return {
            totalEvents: this.eventHistory.length,
            eventTypes: Object.keys(eventCounts).length,
            eventCounts,
            recentEventCounts,
            activeListeners: Array.from(this.listeners.keys()).length
        };
    }
    
    /**
     * Add event to history with size limit
     * @private
     */
    _addToHistory(eventObject) {
        this.eventHistory.push(eventObject);
        
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
}

/**
 * Event type constants for the reproduction system
 * These match the key behavioral events from the original implementation
 */
export const REPRODUCTION_EVENTS = {
    // Mating events
    MATING_ATTEMPT: 'mating_attempt',
    MATING_SUCCESS: 'mating_success', 
    MATING_FAILURE: 'mating_failure',
    
    // Pregnancy and birth events
    PREGNANCY_START: 'pregnancy_start',
    BIRTH: 'birth',
    
    // Strategy-specific events
    TERRITORY_ESTABLISHED: 'territory_established',
    COMPETITOR_DISPLACED: 'competitor_displaced',
    FEMALE_GUARDED: 'female_guarded',
    SNEAKY_ATTEMPT: 'sneaky_attempt',
    
    // Mate selection events
    FEMALE_EVALUATION: 'female_evaluation',
    MATE_SELECTED: 'mate_selected',
    MATE_REJECTED: 'mate_rejected',
    
    // Cooldown events
    REPRODUCTION_COOLDOWN_START: 'reproduction_cooldown_start',
    REPRODUCTION_COOLDOWN_END: 'reproduction_cooldown_end',
    
    // System events
    STRATEGY_ASSIGNED: 'strategy_assigned',
    MATURITY_REACHED: 'maturity_reached'
};

/**
 * Event data creators for consistent event structure
 * These ensure all events contain the necessary data for debugging and analysis
 */
export const EventDataCreators = {
    /**
     * Create mating attempt event data
     */
    matingAttempt(male, female, strategy, distance, success) {
        return {
            male: {
                name: male.name,
                strategy: male.reproductionStrategy,
                x: male.x,
                y: male.y
            },
            female: {
                name: female.name,
                x: female.x,
                y: female.y,
                isPregnant: female.isPregnant,
                reproductionCooldown: female.reproductionCooldown
            },
            strategy,
            distance,
            success,
            timestamp: Date.now()
        };
    },
    
    /**
     * Create birth event data
     */
    birth(mother, baby) {
        return {
            mother: {
                name: mother.name,
                x: mother.x,
                y: mother.y
            },
            baby: {
                name: baby.name,
                x: baby.x,
                y: baby.y,
                gender: baby.gender
            },
            timestamp: Date.now()
        };
    },
    
    /**
     * Create territory establishment event data
     */
    territoryEstablished(male, female, territoryX, territoryY, competitorsDisplaced) {
        return {
            male: {
                name: male.name,
                x: male.x,
                y: male.y
            },
            female: {
                name: female.name,
                x: female.x,
                y: female.y
            },
            territory: {
                x: territoryX,
                y: territoryY
            },
            competitorsDisplaced,
            timestamp: Date.now()
        };
    },
    
    /**
     * Create competitor displacement event data
     */
    competitorDisplaced(territorial, displaced, fleeTarget) {
        return {
            territorial: {
                name: territorial.name,
                strategy: territorial.reproductionStrategy,
                x: territorial.x,
                y: territorial.y
            },
            displaced: {
                name: displaced.name,
                strategy: displaced.reproductionStrategy,
                x: displaced.x,
                y: displaced.y
            },
            fleeTarget,
            timestamp: Date.now()
        };
    },
    
    /**
     * Create female evaluation event data
     */
    femaleEvaluation(female, males, selectedMale, scores) {
        return {
            female: {
                name: female.name,
                personality: { ...female.personality },
                x: female.x,
                y: female.y
            },
            evaluatedMales: males.map(male => ({
                name: male.name,
                strategy: male.reproductionStrategy,
                score: scores[male.name] || 0
            })),
            selectedMale: selectedMale ? {
                name: selectedMale.name,
                strategy: selectedMale.reproductionStrategy,
                score: scores[selectedMale.name] || 0
            } : null,
            timestamp: Date.now()
        };
    }
};

/**
 * Factory function for creating ReproductionEventBus instances
 * @param {Object} options - Configuration options
 * @returns {ReproductionEventBus} New event bus instance
 */
export function createEventBus(options = {}) {
    const eventBus = new ReproductionEventBus();
    
    if (options.debugMode) {
        eventBus.setDebugMode(true);
    }
    
    if (options.maxHistorySize) {
        eventBus.maxHistorySize = options.maxHistorySize;
    }
    
    return eventBus;
}