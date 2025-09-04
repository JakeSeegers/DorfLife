/**
 * PregnancyManager.js
 * 
 * Manages pregnancy progression and birth events.
 * Preserves exact timing and behavior from original implementation.
 * 
 * Handles pregnancy timer updates, birth conditions, and
 * baby creation with exact behavioral fidelity.
 */

import { REPRODUCTION_EVENTS } from '../events/ReproductionEventBus.js';

export class PregnancyManager {
    constructor(config, world, eventBus, reproductionSystem) {
        this.config = config;
        this.world = world;
        this.eventBus = eventBus;
        this.reproductionSystem = reproductionSystem;
        
        // Pregnancy tracking
        this.pregnantFemales = new Set();
    }
    
    /**
     * Update pregnancy progression for all pregnant females
     * Should be called each game tick
     */
    updatePregnancies() {
        const allDwarfs = this.world.getAllDwarfs();
        
        for (const dwarf of allDwarfs) {
            if (dwarf.isPregnant) {
                this.updatePregnancy(dwarf);
            }
        }
    }
    
    /**
     * Update pregnancy progression for a single female
     * Preserves exact logic from original Dwarf.update() method
     * 
     * @param {Object} female - Pregnant female dwarf
     */
    updatePregnancy(female) {
        if (!female.isPregnant) return;
        
        // Track pregnant female
        this.pregnantFemales.add(female);
        
        // Increment pregnancy timer (exact same as original)
        female.pregnancyTimer++;
        
        // Check if pregnancy is complete (exact same threshold as original)
        if (female.pregnancyTimer >= this.config.PREGNANCY_DURATION) {
            this.giveBirth(female);
        }
    }
    
    /**
     * Handle birth event
     * Preserves exact behavior from original giveBirth() method
     * 
     * @param {Object} mother - Female giving birth
     */
    giveBirth(mother) {
        if (!mother.isPregnant) return;
        
        // Remove from pregnant tracking
        this.pregnantFemales.delete(mother);
        
        // Reset pregnancy state (exact same as original)
        mother.isPregnant = false;
        mother.pregnancyTimer = 0;
        mother.reproductionCooldown = this.config.FEMALE_REPRODUCTION_COOLDOWN;
        
        // Create baby with random position offset (exact same as original)
        const offsetRange = this.config.SPATIAL.babySpawnRadius;
        const babyX = mother.x + Math.random() * offsetRange - (offsetRange / 2);
        const babyY = mother.y + Math.random() * offsetRange - (offsetRange / 2);
        
        // Create new dwarf (not adult, random name)
        const baby = this.world.createDwarf(babyX, babyY, null, false);
        
        // Initialize baby's reproduction traits through the system
        if (this.reproductionSystem) {
            this.reproductionSystem.initializeReproductionTraits(baby);
        }
        
        // Add baby to world
        this.world.addDwarf(baby);
        
        // Log birth message (exact same as original)
        this.world.addLog(`${mother.name} gave birth to ${baby.name}!`, true, 'success');
        
        // Emit birth event
        this.eventBus.emit(REPRODUCTION_EVENTS.BIRTH, {
            mother: {
                name: mother.name,
                x: mother.x,
                y: mother.y,
                reproductionCooldown: mother.reproductionCooldown
            },
            baby: {
                name: baby.name,
                x: baby.x,
                y: baby.y,
                gender: baby.gender,
                reproductionStrategy: baby.reproductionStrategy || null
            },
            pregnancyDuration: mother.pregnancyTimer,
            timestamp: Date.now()
        });
        
        console.log(`PregnancyManager: ${mother.name} gave birth to ${baby.name}`);
    }
    
    /**
     * Start pregnancy for a female
     * @param {Object} female - Female dwarf
     * @param {Object} male - Male dwarf (for event tracking)
     */
    startPregnancy(female, male) {
        if (female.isPregnant) return false;
        
        female.isPregnant = true;
        female.pregnancyTimer = 0;
        this.pregnantFemales.add(female);
        
        this.eventBus.emit(REPRODUCTION_EVENTS.PREGNANCY_START, {
            female: {
                name: female.name,
                x: female.x,
                y: female.y
            },
            male: {
                name: male.name,
                strategy: male.reproductionStrategy
            },
            expectedDuration: this.config.PREGNANCY_DURATION,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    /**
     * Get all currently pregnant females
     * @returns {Array} Array of pregnant female dwarfs
     */
    getPregnantFemales() {
        // Clean up the set by removing non-pregnant females
        for (const female of this.pregnantFemales) {
            if (!female.isPregnant) {
                this.pregnantFemales.delete(female);
            }
        }
        
        return Array.from(this.pregnantFemales);
    }
    
    /**
     * Get pregnancy statistics
     * @returns {Object} Pregnancy and birth statistics
     */
    getStatistics() {
        const pregnantFemales = this.getPregnantFemales();
        
        const pregnancyData = pregnantFemales.map(female => ({
            name: female.name,
            timer: female.pregnancyTimer,
            progress: (female.pregnancyTimer / this.config.PREGNANCY_DURATION * 100).toFixed(1),
            timeRemaining: this.config.PREGNANCY_DURATION - female.pregnancyTimer
        }));
        
        return {
            totalPregnant: pregnantFemales.length,
            pregnancies: pregnancyData,
            averageProgress: pregnantFemales.length > 0 
                ? (pregnantFemales.reduce((sum, f) => sum + f.pregnancyTimer, 0) / pregnantFemales.length / this.config.PREGNANCY_DURATION * 100).toFixed(1)
                : 0
        };
    }
    
    /**
     * Force birth for testing purposes
     * @param {Object} female - Female to force birth for
     */
    forceBirth(female) {
        if (!female.isPregnant) return false;
        
        console.log(`PregnancyManager: Forcing birth for ${female.name}`);
        this.giveBirth(female);
        return true;
    }
    
    /**
     * Check if female is ready to give birth
     * @param {Object} female - Female to check
     * @returns {boolean} Whether birth should occur
     */
    isReadyForBirth(female) {
        return female.isPregnant && 
               female.pregnancyTimer >= this.config.PREGNANCY_DURATION;
    }
    
    /**
     * Get expected birth time for a pregnant female
     * @param {Object} female - Pregnant female
     * @returns {number} Ticks remaining until birth (or -1 if not pregnant)
     */
    getTimeUntilBirth(female) {
        if (!female.isPregnant) return -1;
        
        return Math.max(0, this.config.PREGNANCY_DURATION - female.pregnancyTimer);
    }
}

/**
 * Factory function for creating PregnancyManager instances
 * @param {Object} config - Reproduction configuration
 * @param {Object} world - World interface
 * @param {Object} eventBus - Event bus for communication
 * @param {Object} reproductionSystem - Main reproduction system reference
 * @returns {PregnancyManager} New pregnancy manager instance
 */
export function createPregnancyManager(config, world, eventBus, reproductionSystem) {
    return new PregnancyManager(config, world, eventBus, reproductionSystem);
}