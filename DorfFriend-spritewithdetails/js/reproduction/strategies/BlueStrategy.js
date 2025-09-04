/**
 * BlueStrategy.js
 * 
 * Guardian reproduction strategy implementation.
 * Preserves exact behavior from original guardFemale() function.
 * 
 * Blue males guard a specific female by staying close and
 * attempting mating when within guard distance.
 */

import { BaseStrategy } from './BaseStrategy.js';
import { REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';

export class BlueStrategy extends BaseStrategy {
    constructor(config, world, eventBus) {
        super(config, world, eventBus);
        this.strategyConfig = config.BLUE_STRATEGY;
    }
    
    /**
     * Execute guardian strategy behavior
     * Preserves exact logic from original guardFemale() method
     * 
     * @param {Object} male - Male dwarf executing guardian behavior
     */
    execute(male) {
        const availableFemales = this.world.getAvailableFemales();
        if (availableFemales.length === 0) {
            // Clear guarded female if no females available
            male.guardedFemale = null;
            this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
            return;
        }
        
        // Select target female (exact same random selection as original)
        const targetFemale = this.selectRandomFemale(availableFemales);
        
        // Execute guardian behavior
        this.guardFemale(male, targetFemale);
        
        // Set cooldown timer (exact same as original)
        this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
    }
    
    /**
     * Guard a specific female by staying close
     * Preserves exact behavior from original guardFemale() method
     * 
     * @param {Object} male - Guardian male dwarf
     * @param {Object} female - Female dwarf to guard
     */
    guardFemale(male, female) {
        // Set guarded female reference (exact same as original)
        male.guardedFemale = female;
        
        // Position near female with random offset (exact same as original)
        const offsetX = Math.random() * this.strategyConfig.maxGuardRange - (this.strategyConfig.maxGuardRange / 2);
        const offsetY = Math.random() * this.strategyConfig.maxGuardRange - (this.strategyConfig.maxGuardRange / 2);
        
        this.world.setDwarfTarget(
            male,
            female.x + offsetX,
            female.y + offsetY
        );
        
        // Calculate distance for mating check (exact same as original)
        const distance = this.world.calculateDistance(male, female);
        
        // Emit guarding event
        this.eventBus.emit(REPRODUCTION_EVENTS.FEMALE_GUARDED, {
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
            distance,
            targetPosition: {
                x: male.targetX,
                y: male.targetY
            },
            timestamp: Date.now()
        });
        
        // Attempt mating if within guard distance (exact same conditions as original)
        if (distance < this.strategyConfig.guardDistance && 
            Math.random() < this.strategyConfig.matingChance) {
            this.attemptMating(male, female);
        }
    }
    
    /**
     * Check if male is currently guarding a female
     * @param {Object} male - Male dwarf to check
     * @returns {boolean} Whether male is actively guarding
     */
    isGuarding(male) {
        return male.guardedFemale !== null && male.guardedFemale !== undefined;
    }
    
    /**
     * Get the female being guarded by this male
     * @param {Object} male - Male dwarf
     * @returns {Object|null} Guarded female or null
     */
    getGuardedFemale(male) {
        return male.guardedFemale || null;
    }
    
    /**
     * Clear guarded female reference
     * @param {Object} male - Male dwarf to clear guard for
     */
    clearGuard(male) {
        if (male.guardedFemale) {
            const previouslyGuarded = male.guardedFemale;
            male.guardedFemale = null;
            
            this.eventBus.emit(REPRODUCTION_EVENTS.FEMALE_GUARDED, {
                male: {
                    name: male.name,
                    x: male.x,
                    y: male.y
                },
                female: {
                    name: previouslyGuarded.name,
                    x: previouslyGuarded.x,
                    y: previouslyGuarded.y
                },
                action: 'guard_cleared',
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Get strategy name
     * @returns {string} Strategy identifier
     */
    getName() {
        return 'blue';
    }
    
    /**
     * Get strategy display name
     * @returns {string} Human-readable strategy name
     */
    getDisplayName() {
        return 'Guardian';
    }
    
    /**
     * Get strategy configuration
     * @returns {Object} Strategy-specific configuration
     */
    getConfig() {
        return this.strategyConfig;
    }
    
    /**
     * Validate male dwarf has required guardian properties
     * @param {Object} male - Male dwarf to validate
     * @returns {boolean} Whether male has required properties
     */
    validateMale(male) {
        return male && 
               male.reproductionStrategy === 'blue' &&
               male.hasOwnProperty('guardedFemale'); // May be null, but property should exist
    }
    
    /**
     * Initialize guardian-specific properties for a male dwarf
     * @param {Object} male - Male dwarf to initialize
     */
    initializeMale(male) {
        if (male.reproductionStrategy === 'blue') {
            male.guardedFemale = null;
        }
    }
}

/**
 * Factory function for creating BlueStrategy instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {BlueStrategy} New blue strategy instance
 */
export function createBlueStrategy(config, world, eventBus) {
    return new BlueStrategy(config, world, eventBus);
}