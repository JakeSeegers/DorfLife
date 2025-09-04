/**
 * OrangeStrategy.js
 * 
 * Territorial reproduction strategy implementation.
 * Preserves exact behavior from original establishTerritory() function.
 * 
 * Orange males establish territory around females and aggressively
 * displace competing males within their territory radius.
 */

import { BaseStrategy } from './BaseStrategy.js';
import { REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';

export class OrangeStrategy extends BaseStrategy {
    constructor(config, world, eventBus) {
        super(config, world, eventBus);
        this.strategyConfig = config.ORANGE_STRATEGY;
    }
    
    /**
     * Execute territorial strategy behavior
     * Preserves exact logic from original establishTerritory() method
     * 
     * @param {Object} male - Male dwarf executing territorial behavior
     */
    execute(male) {
        const availableFemales = this.world.getAvailableFemales();
        if (availableFemales.length === 0) {
            this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
            return;
        }
        
        // Select target female (exact same random selection as original)
        const targetFemale = this.selectRandomFemale(availableFemales);
        
        // Execute territorial behavior
        this.establishTerritory(male, targetFemale);
        
        // Set cooldown timer (exact same as original)
        this.setMateSeekingTimer(male, this.strategyConfig.cooldown);
    }
    
    /**
     * Establish territory around target female
     * Preserves exact behavior from original establishTerritory() method
     * 
     * @param {Object} male - Territorial male dwarf
     * @param {Object} female - Target female dwarf
     */
    establishTerritory(male, female) {
        const distance = this.world.calculateDistance(male, female);
        
        // Only establish territory if within territory radius (exact same as original)
        if (distance < this.strategyConfig.territoryRadius) {
            // Set territory center to female's position (exact same as original)
            male.territoryX = female.x;
            male.territoryY = female.y;
            
            // Find competitors within competitor distance (exact same logic as original)
            const competitors = this.world.getNearbyMales(
                female,
                this.strategyConfig.competitorDistance,
                male // exclude self
            );
            
            let competitorsDisplaced = 0;
            
            // Displace competitors with 10% chance each (exact same as original)
            competitors.forEach(competitor => {
                if (Math.random() < this.strategyConfig.displacementChance) {
                    this.displaceCompetitor(male, competitor);
                    competitorsDisplaced++;
                }
            });
            
            // Emit territory established event
            this.eventBus.emit(REPRODUCTION_EVENTS.TERRITORY_ESTABLISHED, {
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
                    x: male.territoryX,
                    y: male.territoryY,
                    radius: this.strategyConfig.territoryRadius
                },
                competitorsFound: competitors.length,
                competitorsDisplaced,
                timestamp: Date.now()
            });
            
            // Attempt mating if close enough (exact same conditions as original)
            if (distance < this.strategyConfig.matingDistance && 
                Math.random() < this.strategyConfig.matingChance) {
                this.attemptMating(male, female);
            }
        }
    }
    
    /**
     * Displace a competitor male
     * Preserves exact behavior from original territorial displacement logic
     * 
     * @param {Object} territorial - Territorial male doing the displacing
     * @param {Object} competitor - Competitor male being displaced
     */
    displaceCompetitor(territorial, competitor) {
        const canvasDimensions = this.world.getCanvasDimensions();
        
        // Calculate flee target (exact same logic as original)
        const fleeTarget = {
            x: territorial.x < competitor.x ? canvasDimensions.width : 0,
            y: territorial.y < competitor.y ? canvasDimensions.height : 0
        };
        
        // Set competitor to flee state (exact same as original)
        this.world.setDwarfTask(competitor, 'fleeing', 180); // 180 ticks flee timer
        this.world.setDwarfTarget(competitor, fleeTarget.x, fleeTarget.y);
        
        // Emit displacement event
        this.eventBus.emit(REPRODUCTION_EVENTS.COMPETITOR_DISPLACED, {
            territorial: {
                name: territorial.name,
                strategy: territorial.reproductionStrategy,
                x: territorial.x,
                y: territorial.y
            },
            displaced: {
                name: competitor.name,
                strategy: competitor.reproductionStrategy,
                x: competitor.x,
                y: competitor.y,
                newTask: 'fleeing'
            },
            fleeTarget,
            timestamp: Date.now()
        });
    }
    
    /**
     * Get strategy name
     * @returns {string} Strategy identifier
     */
    getName() {
        return 'orange';
    }
    
    /**
     * Get strategy display name
     * @returns {string} Human-readable strategy name
     */
    getDisplayName() {
        return 'Territorial';
    }
    
    /**
     * Get strategy configuration
     * @returns {Object} Strategy-specific configuration
     */
    getConfig() {
        return this.strategyConfig;
    }
    
    /**
     * Validate male dwarf has required territorial properties
     * @param {Object} male - Male dwarf to validate
     * @returns {boolean} Whether male has required properties
     */
    validateMale(male) {
        return male && 
               typeof male.territoryX === 'number' &&
               typeof male.territoryY === 'number' &&
               male.reproductionStrategy === 'orange';
    }
}

/**
 * Factory function for creating OrangeStrategy instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @returns {OrangeStrategy} New orange strategy instance
 */
export function createOrangeStrategy(config, world, eventBus) {
    return new OrangeStrategy(config, world, eventBus);
}