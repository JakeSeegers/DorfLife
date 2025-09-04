/**
 * YellowStrategy.js
 * 
 * Sneaky reproduction strategy implementation.
 * Preserves exact behavior from original sneakyMating() function.
 * 
 * Yellow males wait for opportunities when no guards are nearby,
 * then attempt quick mating before being detected.
 */

import { BaseStrategy } from './BaseStrategy.js';
import { REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';

export class YellowStrategy extends BaseStrategy {
    constructor(config, world, eventBus) {
        super(config, world, eventBus);
        this.strategyConfig = config.YELLOW_STRATEGY;
    }
    
    /**
     * Execute sneaky strategy behavior
     * Preserves exact logic from original sneakyMating() method
     * 
     * @param {Object} male - Male dwarf executing sneaky behavior
     */
    execute(male) {
        const availableFemales = this.world.getAvailableFemales();
        if (availableFemales.length === 0) {
            this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
            return;
        }
        
        // Select target female (exact same random selection as original)
        const targetFemale = this.selectRandomFemale(availableFemales);
        
        // Execute sneaky behavior
        this.sneakyMating(male, targetFemale);
        
        // Set cooldown timer (exact same as original)
        this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
    }
    
    /**
     * Attempt sneaky mating when guards are not present
     * Preserves exact behavior from original sneakyMating() method
     * 
     * @param {Object} male - Sneaky male dwarf
     * @param {Object} female - Target female dwarf
     */
    sneakyMating(male, female) {
        const distance = this.world.calculateDistance(male, female);
        
        // Check for guards nearby (exact same logic as original)
        const guardsNearby = this.world.getNearbyMales(
            female,
            this.strategyConfig.guardDetectionRadius,
            male // exclude self
        );
        
        const hasGuardsNearby = guardsNearby.length > 0;
        
        // Emit sneaky attempt event
        this.eventBus.emit(REPRODUCTION_EVENTS.SNEAKY_ATTEMPT, {
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
            guardsNearby: hasGuardsNearby,
            guardsDetected: guardsNearby.map(guard => ({
                name: guard.name,
                strategy: guard.reproductionStrategy,
                distance: this.world.calculateDistance(female, guard)
            })),
            timestamp: Date.now()
        });
        
        // Behavior depends on guard presence (exact same logic as original)
        if (!hasGuardsNearby && distance < this.strategyConfig.matingDistance) {
            // No guards nearby and close enough - attempt mating
            if (Math.random() < this.strategyConfig.matingChance) {
                this.attemptMating(male, female);
            }
        } else if (hasGuardsNearby) {
            // Guards nearby - move to hiding position (exact same as original)
            this.moveToHidingPosition(male, female);
        }
        // If guards nearby but not close enough, do nothing (same as original)
    }
    
    /**
     * Move to hiding position when guards are detected
     * Preserves exact positioning logic from original implementation
     * 
     * @param {Object} male - Sneaky male dwarf
     * @param {Object} female - Female being approached
     */
    moveToHidingPosition(male, female) {
        // Calculate hiding position (exact same as original)
        const hideX = female.x + Math.random() * this.strategyConfig.hidingRange - (this.strategyConfig.hidingRange / 2);
        const hideY = female.y + Math.random() * this.strategyConfig.hidingRange - (this.strategyConfig.hidingRange / 2);
        
        this.world.setDwarfTarget(male, hideX, hideY);
        
        this.eventBus.emit(REPRODUCTION_EVENTS.SNEAKY_ATTEMPT, {
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
            action: 'hiding',
            hidePosition: {
                x: hideX,
                y: hideY
            },
            timestamp: Date.now()
        });
    }
    
    /**
     * Check if area around female is clear of guards
     * @param {Object} female - Female to check around
     * @returns {boolean} Whether area is clear of competing males
     */
    isAreaClear(female) {
        const guardsNearby = this.world.getNearbyMales(
            female,
            this.strategyConfig.guardDetectionRadius
        );
        return guardsNearby.length === 0;
    }
    
    /**
     * Get nearby guards around a female
     * @param {Object} female - Female to check around
     * @param {Object} excludeMale - Male to exclude from results
     * @returns {Array} Array of nearby guard males
     */
    getNearbyGuards(female, excludeMale = null) {
        return this.world.getNearbyMales(
            female,
            this.strategyConfig.guardDetectionRadius,
            excludeMale
        );
    }
    
    /**
     * Calculate optimal approach timing based on guard positions
     * @param {Object} male - Sneaky male dwarf
     * @param {Object} female - Target female
     * @returns {Object} Timing analysis
     */
    analyzeApproachTiming(male, female) {
        const guards = this.getNearbyGuards(female, male);
        const distance = this.world.calculateDistance(male, female);
        
        return {
            distance,
            guardsPresent: guards.length > 0,
            guardCount: guards.length,
            canAttempt: guards.length === 0 && distance < this.strategyConfig.matingDistance,
            shouldHide: guards.length > 0
        };
    }
    
    /**
     * Get strategy name
     * @returns {string} Strategy identifier
     */
    getName() {
        return 'yellow';
    }
    
    /**
     * Get strategy display name
     * @returns {string} Human-readable strategy name
     */
    getDisplayName() {
        return 'Sneaky';
    }
    
    /**
     * Get strategy configuration
     * @returns {Object} Strategy-specific configuration
     */
    getConfig() {
        return this.strategyConfig;
    }
    
    /**
     * Validate male dwarf is compatible with sneaky strategy
     * @param {Object} male - Male dwarf to validate
     * @returns {boolean} Whether male is valid for sneaky strategy
     */
    validateMale(male) {
        return male && 
               male.reproductionStrategy === 'yellow';
    }
}

/**
 * Factory function for creating YellowStrategy instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {YellowStrategy} New yellow strategy instance
 */
export function createYellowStrategy(config, world, eventBus) {
    return new YellowStrategy(config, world, eventBus);
}