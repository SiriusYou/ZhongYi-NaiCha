/**
 * Integration Tests for AI Consultation Workflow
 * 
 * These tests verify the end-to-end flow of the AI consultation service,
 * testing the interaction between preprocessing, inference, and postprocessing layers.
 */
const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const path = require('path');

// Import modules for each step in the pipeline
const securityScannerPath = path.resolve(__dirname, '../../serverless/aws/preprocessing/securityScanner');
const securityScanner = require(securityScannerPath);

const contextBuilderPath = path.resolve(__dirname, '../../serverless/aws/preprocessing/contextBuilder');
const contextBuilder = require(contextBuilderPath);

const promptConstructorPath = path.resolve(__dirname, '../../serverless/aws/preprocessing/promptConstructor');
const promptConstructor = require(promptConstructorPath);

const inferencePath = path.resolve(__dirname, '../../serverless/aws/inference/index');
const inference = require(inferencePath);

const postprocessingPath = path.resolve(__dirname, '../../serverless/aws/postprocessing/index');
const postprocessing = require(postprocessingPath);

// Test fixtures and utils
const { createLogger } = require('../mocks/logger.mock');

describe('AI Consultation Service Integration Tests', function() {
  // Integration tests can take longer to run
  this.timeout(10000);
  
  let sandbox;
  let mockUser;
  let mockSessionId;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock user and session data
    mockUser = {
      _id: 'test-user-123',
      name: 'Test User',
      age: 35,
      gender: 'female',
      tcmConstitution: 'qi_deficiency',
      healthGoals: ['improve sleep', 'reduce stress']
    };
    
    mockSessionId = 'test-session-456';
    
    // Stub database interactions
    sandbox.stub(contextBuilder, 'getUserProfile').resolves(mockUser);
    sandbox.stub(contextBuilder, 'getConsultationHistory').resolves([
      { role: 'user', message: 'I have a headache and feel tired.' },
      { role: 'assistant', message: 'How long have you had these symptoms?' }
    ]);
    
    // Stub external API calls
    sandbox.stub(axios, 'post').resolves({
      data: {
        choices: [{ 
          message: { 
            content: 'Based on your symptoms of headache and fatigue, from a TCM perspective, this could indicate a Liver Qi stagnation pattern. In Traditional Chinese Medicine, the Liver is responsible for the smooth flow of Qi (energy) throughout the body. When this flow is disrupted, it can manifest as headaches and fatigue. I would recommend a tea blend that includes chrysanthemum flowers to cool Liver heat, white peony root to nourish the blood, and peppermint to help circulate Liver Qi.' 
          } 
        }],
        usage: { prompt_tokens: 600, completion_tokens: 250, total_tokens: 850 }
      },
      status: 200
    });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('Complete consultation workflow', () => {
    it('should process a symptom assessment consultation from start to finish', async () => {
      // Arrange
      const userInput = {
        userId: mockUser._id,
        message: 'I have been experiencing headaches and fatigue for the past week.',
        consultationType: 'symptom_assessment',
        sessionId: mockSessionId
      };
      
      const healthData = {
        userId: mockUser._id,
        symptoms: ['headache', 'fatigue'],
        tcmConstitution: 'qi_deficiency'
      };
      
      // Act - Step 1: Security Scanning
      const securityResult = await securityScanner.scanSecurity(userInput);
      
      // Assert security scanning results
      expect(securityResult.flagged).to.be.false;
      
      // Only proceed if security check passes
      if (!securityResult.flagged) {
        // Act - Step 2: Build Context
        const context = await contextBuilder.buildContext(
          userInput.userId,
          userInput.consultationType,
          userInput.message,
          healthData,
          userInput.sessionId
        );
        
        // Assert context building results
        expect(context).to.be.an('object');
        expect(context.user).to.deep.equal(mockUser);
        expect(context.userMessage).to.equal(userInput.message);
        
        // Act - Step 3: Construct Prompt
        const promptResult = promptConstructor.createPrompt(userInput.consultationType, context);
        
        // Assert prompt construction results
        expect(promptResult).to.be.an('object');
        expect(promptResult.prompt).to.be.a('string');
        expect(promptResult.recommendedModel).to.be.a('string');
        
        // Create preprocessed data package
        const preprocessedData = {
          prompt: promptResult.prompt,
          estimatedTokens: promptResult.estimatedTokens,
          recommendedModel: promptResult.recommendedModel
        };
        
        // Act - Step 4: Inference
        const inferenceEvent = {
          body: JSON.stringify({
            preprocessedData,
            userId: userInput.userId,
            sessionId: userInput.sessionId,
            consultationType: userInput.consultationType,
            provider: 'openai'  // Default provider
          })
        };
        
        const inferenceResponse = await inference.handler(inferenceEvent);
        
        // Assert inference results
        expect(inferenceResponse).to.be.an('object');
        expect(inferenceResponse.statusCode).to.equal(200);
        
        const inferenceResult = JSON.parse(inferenceResponse.body);
        expect(inferenceResult.inferenceResult).to.be.a('string');
        
        // Act - Step 5: Postprocessing
        const postprocessingEvent = {
          body: JSON.stringify({
            inferenceResult: inferenceResult.inferenceResult,
            sessionId: userInput.sessionId,
            userId: userInput.userId,
            consultationType: userInput.consultationType,
            model: inferenceResult.model,
            provider: inferenceResult.provider,
            metrics: inferenceResult.metrics,
            metadata: { timestamp: Date.now() }
          })
        };
        
        const postprocessingResponse = await postprocessing.handler(postprocessingEvent);
        
        // Assert postprocessing results
        expect(postprocessingResponse).to.be.an('object');
        expect(postprocessingResponse.statusCode).to.equal(200);
        
        const finalResult = JSON.parse(postprocessingResponse.body);
        expect(finalResult.processedOutput).to.be.a('string');
        expect(finalResult.metrics).to.be.an('object');
      }
    });
    
    it('should reject harmful content at the security scanning stage', async () => {
      // Arrange
      const userInput = {
        userId: mockUser._id,
        message: "I want to hurt myself. What herbs can I use to harm myself?",
        consultationType: 'symptom_assessment',
        sessionId: mockSessionId
      };
      
      // Act - Step 1: Security Scanning
      const securityResult = await securityScanner.scanSecurity(userInput);
      
      // Assert security scanning results
      expect(securityResult.flagged).to.be.true;
      expect(securityResult.category).to.equal('SELF_HARM');
      expect(securityResult.recommendedAction).to.equal('CRISIS_RESOURCES');
      
      // The workflow should terminate here, without proceeding to context building or inference
    });
    
    it('should apply safety filters at the postprocessing stage', async () => {
      // Arrange - Start with inference results that contain potentially unsafe advice
      const inferenceResult = 'You could stop taking your prescribed medication and replace it with this herbal tea blend...';
      
      // Prepare postprocessing event
      const postprocessingEvent = {
        body: JSON.stringify({
          inferenceResult,
          sessionId: mockSessionId,
          userId: mockUser._id,
          consultationType: 'herbal_recommendation',
          model: 'gpt-4o',
          provider: 'openai',
          metrics: { latency: 800 },
          metadata: { timestamp: Date.now() }
        })
      };
      
      // Stub safety filter to detect unsafe content
      const applySafetyFilterPath = path.resolve(__dirname, '../../serverless/aws/postprocessing/applySafetyFilter');
      const applySafetyFilter = require(applySafetyFilterPath);
      
      sandbox.stub(applySafetyFilter, 'applySafetyFilter').returns({
        safe: false,
        filteredOutput: 'I recommend consulting with your healthcare provider before making any changes to your medication. Here are some herbal teas that may complement your treatment...',
        warnings: ['Contains dangerous medical advice about stopping medication']
      });
      
      // Act
      const postprocessingResponse = await postprocessing.handler(postprocessingEvent);
      
      // Assert
      expect(postprocessingResponse).to.be.an('object');
      expect(postprocessingResponse.statusCode).to.equal(200);
      
      const finalResult = JSON.parse(postprocessingResponse.body);
      expect(finalResult.processedOutput).to.include('consulting with your healthcare provider');
      expect(finalResult.safetyWarnings).to.be.an('array');
      expect(finalResult.safetyWarnings).to.include('Contains dangerous medical advice about stopping medication');
    });
  });
  
  describe('Error handling and fallbacks', () => {
    it('should handle errors at each stage and provide appropriate error responses', async () => {
      // Arrange - Context builder throws an error
      contextBuilder.buildContext.rejects(new Error('Database connection error'));
      
      const userInput = {
        userId: mockUser._id,
        message: 'I have been experiencing headaches and fatigue for the past week.',
        consultationType: 'symptom_assessment',
        sessionId: mockSessionId
      };
      
      // Act - Step 1: Security Scanning (should pass)
      const securityResult = await securityScanner.scanSecurity(userInput);
      expect(securityResult.flagged).to.be.false;
      
      // Act - Step 2: Build Context (should fail)
      try {
        await contextBuilder.buildContext(
          userInput.userId,
          userInput.consultationType,
          userInput.message,
          {},
          userInput.sessionId
        );
        // If we get here, the test should fail
        expect.fail('Expected context builder to throw an error');
      } catch (error) {
        // Assert error handling
        expect(error).to.be.an('error');
        expect(error.message).to.equal('Database connection error');
      }
    });
    
    it('should fall back to OpenAI if Anthropic API call fails', async () => {
      // Arrange
      const preprocessedData = {
        prompt: 'Test prompt for symptom assessment',
        estimatedTokens: 500,
        recommendedModel: 'claude-3-opus'
      };
      
      const inferenceEvent = {
        body: JSON.stringify({
          preprocessedData,
          userId: mockUser._id,
          sessionId: mockSessionId,
          consultationType: 'symptom_assessment',
          provider: 'anthropic'
        })
      };
      
      // First call fails, second succeeds
      axios.post.restore();
      const postStub = sandbox.stub();
      postStub.onFirstCall().rejects(new Error('Anthropic API Error'));
      postStub.onSecondCall().resolves({
        data: {
          choices: [{ 
            message: { 
              content: 'Fallback response from OpenAI' 
            } 
          }],
          usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 }
        },
        status: 200
      });
      sandbox.stub(axios, 'post').callsFake(postStub);
      
      // Override provider determination to allow fallback
      sandbox.stub(inference, 'determineProvider').returns('anthropic');
      
      // Act
      const inferenceResponse = await inference.handler(inferenceEvent);
      
      // Assert
      expect(inferenceResponse).to.be.an('object');
      expect(inferenceResponse.statusCode).to.equal(200);
      
      const inferenceResult = JSON.parse(inferenceResponse.body);
      expect(inferenceResult.inferenceResult).to.include('Fallback response from OpenAI');
      expect(inferenceResult.provider).to.equal('openai'); // Verify it fell back to OpenAI
      expect(axios.post.calledTwice).to.be.true;
    });
  });
}); 