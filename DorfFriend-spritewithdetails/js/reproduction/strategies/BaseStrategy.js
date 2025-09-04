/**
 * BaseStrategy.js
 * 
 * Abstract base class for male reproduction strategies.
 * Defines common interface and shared functionality while
 * preserving exact behavioral patterns from original implementation.
 */

export class BaseStrategy {
    constructor(config, world, eventBus) {
        if (this.constructor === BaseStrategy) {
            throw new Error('BaseStrategy is abstract and cannot be instantiated directly');
        }
        
        this.config = config;
        this.world = world;
        this.eventBus = eventBus;
        
        // Validate required dependencies
        if (!config || !world || !eventBus) {
            throw new Error('BaseStrategy requires config, world, and eventBus dependencies');
        }
    }
    
    /**
     * Execute strategy-specific behavior for a male dwarf
     * Must be implemented by concrete strategy classes
     * 
     * @param {Object} male - Male dwarf executing the strategy
     * @abstract
     */
    execute(male) {
        throw new Error('execute() method must be implemented by concrete strategy classes');
    }
    
    /**
     * Get the name of this strategy
     * @returns {string} Strategy name
     * @abstract
     */
    getName() {
        throw new Error('getName() method must be implemented by concrete strategy classes');
    }
    
    /**
     * Attempt mating between male and female
     * Preserves exact behavior from original attemptMating() method
     * 
     * @param {Object} male - Male dwarf attempting mating
     * @param {Object} female - Female dwarf being courted
     * @returns {boolean} Whether mating was successful
     */
    attemptMating(male, female) {
        // Check preconditions (exact same as original)
        if (female.reproductionCooldown > 0 || female.isPregnant) {
            this.eventBus.emit('mating_failure', {
                male: male.name,
                female: female.name,
                reason: 'female_not_available',
                timestamp: Date.now()
            });
            return false;
        }
        
        // Calculate distance for event logging
        const distance = this.world.calculateDistance(male, female);
        
        // 70% success rate (exact same as original)
        const success = Math.random() < this.config.MATING_SUCCESS_RATE;
        
        // Emit mating attempt event
        this.eventBus.emit('mating_attempt', {
            male: male.name,
            female: female.name,
            strategy: male.reproductionStrategy,
            distance,
            success,
            timestamp: Date.now()
        });
        
        if (success) {
            // Set pregnancy and cooldowns (exact same as original)
            female.isPregnant = true;
            female.pregnancyTimer = 0;
            female.reproductionCooldown = this.config.FEMALE_REPRODUCTION_COOLDOWN;
            male.reproductionCooldown = this.config.MALE_REPRODUCTION_COOLDOWN;
            
            // Log success message (exact same as original)
            this.world.addLog(
                `${male.name} (${male.reproductionStrategy}) and ${female.name} are expecting!`,
                true,
                'success'
            );
            
            // Emit success event
            this.eventBus.emit('mating_success', {
                male: male.name,
                female: female.name,
                strategy: male.reproductionStrategy,
                timestamp: Date.now()
            });
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Set mate seeking timer for the male
     * Preserves exact timing from original implementation
     * 
     * @param {Object} male - Male dwarf to set timer for
     * @param {number} cooldown - Cooldown duration in ticks
     */
    setMateSeekingTimer(male, cooldown) {
        male.mateSeekingTimer = cooldown;
    }
    
    /**
     * Check if mating conditions are met for distance and probability
     * Common logic extracted from all strategies
     * 
     * @param {Object} male - Male dwarf
     * @param {Object} female - Female dwarf  
     * @param {number} requiredDistance - Maximum distance for mating
     * @param {number} matingChance - Probability per tick of attempting mating
     * @returns {boolean} Whether mating should be attempted
     */
    shouldAttemptMating(male, female, requiredDistance, matingChance) {
        const distance = this.world.calculateDistance(male, female);
        return distance < requiredDistance && Math.random() < matingChance;
    }
    
    /**
     * Select random target from available females
     * Preserves exact selection logic from original seekMating()
     * 
     * @param {Array} availableFemales - Array of available female dwarfs
     * @returns {Object|null} Selected female or null if none available
     */
    selectRandomFemale(availableFemales) {
        if (availableFemales.length === 0) return null;
        return availableFemales[Math.floor(Math.random() * availableFemales.length)];
    }
}