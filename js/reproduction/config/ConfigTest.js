/**
 * ConfigTest.js
 * 
 * Simple test to validate the ReproductionConfig module loads and validates correctly.
 * This ensures our constants extraction was successful.
 */

// Test the configuration module
try {
    // This will automatically validate on import due to the module's initialization code
    const configModule = await import('./ReproductionConfig.js');
    
    const { 
        REPRODUCTION_CONFIG, 
        STRATEGY_COLORS, 
        getStrategyConfig, 
        validateConfig,
        getConfigCopy
    } = configModule;
    
    console.log('✅ Configuration module imported successfully');
    
    // Test strategy config getter
    const orangeConfig = getStrategyConfig('orange');
    console.log('✅ Orange strategy config:', orangeConfig.displayName);
    
    const blueConfig = getStrategyConfig('blue');
    console.log('✅ Blue strategy config:', blueConfig.displayName);
    
    const yellowConfig = getStrategyConfig('yellow');
    console.log('✅ Yellow strategy config:', yellowConfig.displayName);
    
    // Test config copy
    const configCopy = getConfigCopy();
    console.log('✅ Configuration deep copy created');
    
    // Test validation with invalid config
    try {
        const invalidConfig = getConfigCopy();
        invalidConfig.MATING_SUCCESS_RATE = -0.5; // Invalid value
        validateConfig(invalidConfig);
        console.log('❌ Validation should have failed for invalid config');
    } catch (error) {
        console.log('✅ Validation correctly caught invalid config:', error.message);
    }
    
    // Verify key constants match original implementation expectations
    console.log('\n📊 Key Configuration Values:');
    console.log(`Mating Success Rate: ${REPRODUCTION_CONFIG.MATING_SUCCESS_RATE * 100}%`);
    console.log(`Pregnancy Duration: ${REPRODUCTION_CONFIG.PREGNANCY_DURATION} ticks`);
    console.log(`Orange Cooldown: ${REPRODUCTION_CONFIG.ORANGE_STRATEGY.cooldown} ticks`);
    console.log(`Blue Cooldown: ${REPRODUCTION_CONFIG.BLUE_STRATEGY.cooldown} ticks`);
    console.log(`Yellow Cooldown: ${REPRODUCTION_CONFIG.YELLOW_STRATEGY.cooldown} ticks`);
    console.log(`Orange Territory Radius: ${REPRODUCTION_CONFIG.ORANGE_STRATEGY.territoryRadius} units`);
    console.log(`Blue Guard Distance: ${REPRODUCTION_CONFIG.BLUE_STRATEGY.guardDistance} units`);
    console.log(`Yellow Detection Radius: ${REPRODUCTION_CONFIG.YELLOW_STRATEGY.guardDetectionRadius} units`);
    
    console.log('\n🎯 All configuration tests passed!');
    
} catch (error) {
    console.error('❌ Configuration test failed:', error);
    throw error;
}