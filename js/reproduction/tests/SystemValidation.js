/**
 * SystemValidation.js
 * 
 * Comprehensive validation tests for the modular reproduction system.
 * Ensures behavioral preservation and system integrity.
 */

// Mock game environment for testing
class MockGame {
    constructor() {
        this.dwarfs = [];
        this.time = 0;
    }
}

class MockDwarf {
    constructor(name, gender, isAdult = true) {
        this.name = name;
        this.gender = gender;
        this.isAdult = isAdult;
        this.x = Math.random() * 400;
        this.y = Math.random() * 300;
        
        // Personality (required for female selection)
        this.personality = {
            agreeableness: Math.random() * 100,
            openness: Math.random() * 100,
            neuroticism: Math.random() * 100,
            extraversion: Math.random() * 100,
            conscientiousness: Math.random() * 100
        };
        
        // Reproduction properties
        this.reproductionCooldown = 0;
        this.mateSeekingTimer = 0;
        this.isPregnant = false;
        this.pregnancyTimer = 0;
        
        // Target properties
        this.targetX = this.x;
        this.targetY = this.y;
        this.task = 'idle';
        this.workTimer = 0;
    }
}

// Global mock functions for testing
window.addLog = function(message, important, type) {
    console.log(`[${type || 'LOG'}] ${message}`);
};

window.Dwarf = MockDwarf;
window.canvas = { width: 800, height: 600 };

/**
 * Run comprehensive system validation tests
 */
export async function runValidationTests() {
    console.log('🧪 Starting Reproduction System Validation Tests...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    try {
        // Test 1: Configuration Validation
        await testConfigurationValidation(results);
        
        // Test 2: World Interface
        await testWorldInterface(results);
        
        // Test 3: Event Bus
        await testEventBus(results);
        
        // Test 4: Strategy Factory
        await testStrategyFactory(results);
        
        // Test 5: Female Selection
        await testFemaleSelection(results);
        
        // Test 6: Orange Strategy Behavior
        await testOrangeStrategy(results);
        
        // Test 7: Blue Strategy Behavior
        await testBlueStrategy(results);
        
        // Test 8: Yellow Strategy Behavior
        await testYellowStrategy(results);
        
        // Test 9: System Integration
        await testSystemIntegration(results);
        
        // Test 10: Pregnancy and Birth
        await testPregnancySystem(results);
        
    } catch (error) {
        console.error('❌ Test suite failed with error:', error);
        results.failed++;
    }
    
    // Print results
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📋 Total: ${results.tests.length}`);
    
    if (results.failed === 0) {
        console.log('\n🎉 All tests passed! System is ready for integration.');
    } else {
        console.log('\n⚠️  Some tests failed. Review errors before integration.');
    }
    
    return results;
}

async function testConfigurationValidation(results) {
    console.log('1️⃣ Testing Configuration Validation...');
    
    try {
        const { REPRODUCTION_CONFIG, validateConfig } = await import('../config/ReproductionConfig.js');
        
        // Test valid configuration
        validateConfig();
        recordTest(results, 'Configuration validation passes', true);
        
        // Test invalid configuration
        try {
            const invalidConfig = { ...REPRODUCTION_CONFIG };
            invalidConfig.MATING_SUCCESS_RATE = -1;
            validateConfig(invalidConfig);
            recordTest(results, 'Invalid configuration detection', false, 'Should have thrown error');
        } catch (error) {
            recordTest(results, 'Invalid configuration detection', true);
        }
        
        // Test strategy configs
        const orangeConfig = REPRODUCTION_CONFIG.ORANGE_STRATEGY;
        const blueConfig = REPRODUCTION_CONFIG.BLUE_STRATEGY;
        const yellowConfig = REPRODUCTION_CONFIG.YELLOW_STRATEGY;
        
        recordTest(results, 'Orange strategy config exists', !!orangeConfig);
        recordTest(results, 'Blue strategy config exists', !!blueConfig);
        recordTest(results, 'Yellow strategy config exists', !!yellowConfig);
        
        // Verify key constants match original
        recordTest(results, 'Mating success rate is 70%', REPRODUCTION_CONFIG.MATING_SUCCESS_RATE === 0.7);
        recordTest(results, 'Pregnancy duration is 3600', REPRODUCTION_CONFIG.PREGNANCY_DURATION === 3600);
        recordTest(results, 'Orange territory radius is 80', orangeConfig.territoryRadius === 80);
        recordTest(results, 'Blue guard distance is 30', blueConfig.guardDistance === 30);
        recordTest(results, 'Yellow detection radius is 50', yellowConfig.guardDetectionRadius === 50);
        
        console.log('✅ Configuration validation tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Configuration module import', false, error.message);
        console.log('❌ Configuration validation tests failed\n');
    }
}

async function testWorldInterface(results) {
    console.log('2️⃣ Testing World Interface...');
    
    try {
        const { WorldInterface } = await import('../core/WorldInterface.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        
        recordTest(results, 'WorldInterface creation', !!world);
        
        // Add test dwarfs
        const male1 = new MockDwarf('Male1', 'male');
        const male2 = new MockDwarf('Male2', 'male');
        const female1 = new MockDwarf('Female1', 'female');
        const female2 = new MockDwarf('Female2', 'female');
        female2.isPregnant = true;
        
        mockGame.dwarfs = [male1, male2, female1, female2];
        
        // Test queries
        const allDwarfs = world.getAllDwarfs();
        recordTest(results, 'Get all dwarfs', allDwarfs.length === 4);
        
        const availableFemales = world.getAvailableFemales();
        recordTest(results, 'Get available females', availableFemales.length === 1);
        
        const nearbyDwarfs = world.getNearbyDwarfs(male1, 1000);
        recordTest(results, 'Get nearby dwarfs', nearbyDwarfs.length === 3);
        
        // Test distance calculation
        const distance = world.calculateDistance(male1, female1);
        recordTest(results, 'Distance calculation', typeof distance === 'number' && distance >= 0);
        
        console.log('✅ World Interface tests completed\n');
        
    } catch (error) {
        recordTest(results, 'World Interface import', false, error.message);
        console.log('❌ World Interface tests failed\n');
    }
}

async function testEventBus(results) {
    console.log('3️⃣ Testing Event Bus...');
    
    try {
        const { ReproductionEventBus, REPRODUCTION_EVENTS } = await import('../events/ReproductionEventBus.js');
        
        const eventBus = new ReproductionEventBus();
        recordTest(results, 'EventBus creation', !!eventBus);
        
        // Test event subscription and emission
        let eventReceived = false;
        const unsubscribe = eventBus.subscribe(REPRODUCTION_EVENTS.MATING_SUCCESS, (event) => {
            eventReceived = true;
        });
        
        eventBus.emit(REPRODUCTION_EVENTS.MATING_SUCCESS, { test: 'data' });
        recordTest(results, 'Event subscription and emission', eventReceived);
        
        // Test unsubscription
        unsubscribe();
        eventReceived = false;
        eventBus.emit(REPRODUCTION_EVENTS.MATING_SUCCESS, { test: 'data2' });
        recordTest(results, 'Event unsubscription', !eventReceived);
        
        // Test event history
        const history = eventBus.getEventHistory();
        recordTest(results, 'Event history tracking', history.length > 0);
        
        console.log('✅ Event Bus tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Event Bus import', false, error.message);
        console.log('❌ Event Bus tests failed\n');
    }
}

async function testStrategyFactory(results) {
    console.log('4️⃣ Testing Strategy Factory...');
    
    try {
        const { StrategyFactory } = await import('../strategies/StrategyFactory.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const strategyFactory = new StrategyFactory(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'StrategyFactory creation', !!strategyFactory);
        
        // Test strategy retrieval
        const orangeStrategy = strategyFactory.getStrategy('orange');
        const blueStrategy = strategyFactory.getStrategy('blue');
        const yellowStrategy = strategyFactory.getStrategy('yellow');
        
        recordTest(results, 'Orange strategy exists', !!orangeStrategy);
        recordTest(results, 'Blue strategy exists', !!blueStrategy);
        recordTest(results, 'Yellow strategy exists', !!yellowStrategy);
        
        // Test strategy assignment
        const male = new MockDwarf('TestMale', 'male');
        strategyFactory.assignRandomStrategy(male);
        recordTest(results, 'Strategy assignment', ['orange', 'blue', 'yellow'].includes(male.reproductionStrategy));
        
        // Test strategy validation
        const isValid = strategyFactory.validateStrategy(male);
        recordTest(results, 'Strategy validation', isValid);
        
        console.log('✅ Strategy Factory tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Strategy Factory import', false, error.message);
        console.log('❌ Strategy Factory tests failed\n');
    }
}

async function testFemaleSelection(results) {
    console.log('5️⃣ Testing Female Selection System...');
    
    try {
        const { FemaleSelection } = await import('../systems/FemaleSelection.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const femaleSelection = new FemaleSelection(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'FemaleSelection creation', !!femaleSelection);
        
        // Test mate scoring
        const female = new MockDwarf('TestFemale', 'female');
        female.personality.agreeableness = 80; // High agreeableness
        
        const blueMale = new MockDwarf('BlueMale', 'male');
        blueMale.reproductionStrategy = 'blue';
        
        const orangeMale = new MockDwarf('OrangeMale', 'male');
        orangeMale.reproductionStrategy = 'orange';
        
        const blueScore = femaleSelection.scoreMate(female, blueMale);
        const orangeScore = femaleSelection.scoreMate(female, orangeMale);
        
        recordTest(results, 'Female scoring produces numbers', typeof blueScore === 'number' && typeof orangeScore === 'number');
        recordTest(results, 'High agreeableness prefers blue over orange', blueScore > orangeScore);
        
        console.log('✅ Female Selection tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Female Selection import', false, error.message);
        console.log('❌ Female Selection tests failed\n');
    }
}

async function testOrangeStrategy(results) {
    console.log('6️⃣ Testing Orange (Territorial) Strategy...');
    
    try {
        const { OrangeStrategy } = await import('../strategies/OrangeStrategy.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const orangeStrategy = new OrangeStrategy(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'OrangeStrategy creation', !!orangeStrategy);
        recordTest(results, 'Orange strategy name', orangeStrategy.getName() === 'orange');
        
        // Test with mock male
        const male = new MockDwarf('OrangeMale', 'male');
        male.reproductionStrategy = 'orange';
        male.territoryX = male.x;
        male.territoryY = male.y;
        
        const female = new MockDwarf('TestFemale', 'female');
        female.x = male.x + 50; // Within territory range
        female.y = male.y + 50;
        
        mockGame.dwarfs = [male, female];
        
        // Test validation
        const isValid = orangeStrategy.validateMale(male);
        recordTest(results, 'Orange male validation', isValid);
        
        console.log('✅ Orange Strategy tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Orange Strategy import', false, error.message);
        console.log('❌ Orange Strategy tests failed\n');
    }
}

async function testBlueStrategy(results) {
    console.log('7️⃣ Testing Blue (Guardian) Strategy...');
    
    try {
        const { BlueStrategy } = await import('../strategies/BlueStrategy.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const blueStrategy = new BlueStrategy(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'BlueStrategy creation', !!blueStrategy);
        recordTest(results, 'Blue strategy name', blueStrategy.getName() === 'blue');
        
        // Test with mock male
        const male = new MockDwarf('BlueMale', 'male');
        male.reproductionStrategy = 'blue';
        male.guardedFemale = null;
        
        const isValid = blueStrategy.validateMale(male);
        recordTest(results, 'Blue male validation', isValid);
        
        console.log('✅ Blue Strategy tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Blue Strategy import', false, error.message);
        console.log('❌ Blue Strategy tests failed\n');
    }
}

async function testYellowStrategy(results) {
    console.log('8️⃣ Testing Yellow (Sneaky) Strategy...');
    
    try {
        const { YellowStrategy } = await import('../strategies/YellowStrategy.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const yellowStrategy = new YellowStrategy(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'YellowStrategy creation', !!yellowStrategy);
        recordTest(results, 'Yellow strategy name', yellowStrategy.getName() === 'yellow');
        
        // Test with mock male
        const male = new MockDwarf('YellowMale', 'male');
        male.reproductionStrategy = 'yellow';
        
        const isValid = yellowStrategy.validateMale(male);
        recordTest(results, 'Yellow male validation', isValid);
        
        console.log('✅ Yellow Strategy tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Yellow Strategy import', false, error.message);
        console.log('❌ Yellow Strategy tests failed\n');
    }
}

async function testSystemIntegration(results) {
    console.log('9️⃣ Testing System Integration...');
    
    try {
        const { createReproductionSystem } = await import('../systems/ReproductionSystem.js');
        
        const mockGame = new MockGame();
        const reproductionSystem = createReproductionSystem({
            gameReference: mockGame
        });
        
        recordTest(results, 'ReproductionSystem creation', !!reproductionSystem);
        
        // Test system validation
        const validation = reproductionSystem.validateSystem();
        recordTest(results, 'System validation', validation.isValid);
        
        // Test dwarf initialization
        const male = new MockDwarf('TestMale', 'male');
        reproductionSystem.initializeReproductionTraits(male);
        recordTest(results, 'Male strategy initialization', !!male.reproductionStrategy);
        
        const female = new MockDwarf('TestFemale', 'female');
        reproductionSystem.initializeReproductionTraits(female);
        recordTest(results, 'Female trait initialization', female.reproductionStrategy === null || female.reproductionStrategy === undefined);
        
        // Test statistics
        const stats = reproductionSystem.getStatistics();
        recordTest(results, 'Statistics generation', !!stats);
        
        console.log('✅ System Integration tests completed\n');
        
    } catch (error) {
        recordTest(results, 'System Integration import', false, error.message);
        console.log('❌ System Integration tests failed\n');
    }
}

async function testPregnancySystem(results) {
    console.log('🔟 Testing Pregnancy System...');
    
    try {
        const { PregnancyManager } = await import('../systems/PregnancyManager.js');
        const { REPRODUCTION_CONFIG } = await import('../config/ReproductionConfig.js');
        const { WorldInterface } = await import('../core/WorldInterface.js');
        const { ReproductionEventBus } = await import('../events/ReproductionEventBus.js');
        
        const mockGame = new MockGame();
        const world = new WorldInterface(mockGame);
        const eventBus = new ReproductionEventBus();
        const pregnancyManager = new PregnancyManager(REPRODUCTION_CONFIG, world, eventBus);
        
        recordTest(results, 'PregnancyManager creation', !!pregnancyManager);
        
        // Test pregnancy progression
        const female = new MockDwarf('PregnantFemale', 'female');
        female.isPregnant = true;
        female.pregnancyTimer = 0;
        
        pregnancyManager.updatePregnancy(female);
        recordTest(results, 'Pregnancy timer increment', female.pregnancyTimer === 1);
        
        // Test birth readiness
        female.pregnancyTimer = REPRODUCTION_CONFIG.PREGNANCY_DURATION;
        const readyForBirth = pregnancyManager.isReadyForBirth(female);
        recordTest(results, 'Birth readiness check', readyForBirth);
        
        console.log('✅ Pregnancy System tests completed\n');
        
    } catch (error) {
        recordTest(results, 'Pregnancy System import', false, error.message);
        console.log('❌ Pregnancy System tests failed\n');
    }
}

function recordTest(results, testName, passed, errorMessage = '') {
    results.tests.push({
        name: testName,
        passed,
        error: errorMessage
    });
    
    if (passed) {
        results.passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        results.failed++;
        console.log(`  ❌ ${testName}${errorMessage ? `: ${errorMessage}` : ''}`);
    }
}

// Auto-run tests if this script is loaded directly
if (typeof window !== 'undefined' && !window.testRunning) {
    window.testRunning = true;
    runValidationTests().then(results => {
        window.testResults = results;
        console.log('🔬 Validation tests complete. Results stored in window.testResults');
    });
}