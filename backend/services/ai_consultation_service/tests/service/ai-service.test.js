/**
 * Service-Level Tests for AI Consultation Service
 * 
 * These tests verify the API endpoints of the AI consultation service.
 * They test the Express routes and handlers rather than the individual serverless functions.
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { expect } = chai;
const path = require('path');

// Set up chai-http
chai.use(chaiHttp);

// Import necessary modules and mock dependencies
let app;
let authMiddleware;
let consultationController;
let userProfileService;
let consultationHistoryService;

// Test data
const mockUser = {
  _id: 'test-user-789',
  name: 'API Test User',
  age: 42,
  gender: 'male',
  tcmConstitution: 'yang_deficiency',
  healthGoals: ['reduce inflammation', 'boost immunity']
};

describe('AI Consultation Service API', function() {
  let sandbox;
  let server;
  let authToken = 'test-auth-token';
  
  before(async () => {
    // Create sandbox and set up mocks
    sandbox = sinon.createSandbox();
    
    // Mock auth middleware
    authMiddleware = require('../../api/middleware/auth');
    sandbox.stub(authMiddleware, 'authenticateJWT').callsFake((req, res, next) => {
      req.user = { _id: mockUser._id };
      next();
    });
    
    // Mock user profile service
    userProfileService = require('../../api/services/userProfileService');
    sandbox.stub(userProfileService, 'getUserProfile').resolves(mockUser);
    
    // Mock consultation history service
    consultationHistoryService = require('../../api/services/consultationHistoryService');
    sandbox.stub(consultationHistoryService, 'getSessionHistory').resolves([
      { timestamp: Date.now() - 3600000, role: 'user', message: 'I have joint pain.' },
      { timestamp: Date.now() - 3590000, role: 'assistant', message: 'Where is the pain located?' }
    ]);
    sandbox.stub(consultationHistoryService, 'saveMessage').resolves({ success: true });
    
    // Mock consultation controller
    consultationController = require('../../api/controllers/consultationController');
    
    // Import the Express app after mocking dependencies
    app = require('../../api/app');
    
    // Start the server
    server = app.listen(3001);
  });
  
  after(() => {
    // Clean up
    sandbox.restore();
    if (server) server.close();
  });
  
  describe('POST /api/consultation/message', () => {
    it('should process a new consultation message and return a response', async () => {
      // Stub the consultation process method
      sandbox.stub(consultationController, 'processConsultationRequest').resolves({
        message: 'Based on your joint pain, I would recommend a blend of turmeric, ginger, and cinnamon tea which can help reduce inflammation according to TCM principles.',
        sessionId: 'test-session-789',
        metadata: {
          consultationType: 'symptom_assessment',
          model: 'gpt-4o',
          provider: 'openai',
          latency: 1200
        }
      });
      
      // Make request to the endpoint
      const response = await chai.request(app)
        .post('/api/consultation/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I have been experiencing joint pain for several weeks.',
          consultationType: 'symptom_assessment',
          sessionId: 'test-session-789'
        });
      
      // Assertions
      expect(response).to.have.status(200);
      expect(response.body).to.be.an('object');
      expect(response.body.message).to.be.a('string');
      expect(response.body.message).to.include('turmeric');
      expect(response.body.sessionId).to.equal('test-session-789');
      expect(response.body.metadata).to.be.an('object');
      expect(response.body.metadata.consultationType).to.equal('symptom_assessment');
      
      // Verify that history was saved
      expect(consultationHistoryService.saveMessage.calledTwice).to.be.true;
    });
    
    it('should return 400 for requests with missing required fields', async () => {
      // Make request with missing consultationType
      const response = await chai.request(app)
        .post('/api/consultation/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I have been experiencing joint pain for several weeks.',
          // consultationType is missing
          sessionId: 'test-session-789'
        });
      
      // Assertions
      expect(response).to.have.status(400);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.include('consultationType');
    });
    
    it('should return 401 for unauthorized requests', async () => {
      // Temporarily override auth middleware to simulate failure
      authMiddleware.authenticateJWT.restore();
      sandbox.stub(authMiddleware, 'authenticateJWT').callsFake((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized access' });
      });
      
      // Make request without auth token
      const response = await chai.request(app)
        .post('/api/consultation/message')
        .send({
          message: 'I have been experiencing joint pain for several weeks.',
          consultationType: 'symptom_assessment',
          sessionId: 'test-session-789'
        });
      
      // Assertions
      expect(response).to.have.status(401);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.equal('Unauthorized access');
      
      // Restore the normal auth behavior for subsequent tests
      authMiddleware.authenticateJWT.restore();
      sandbox.stub(authMiddleware, 'authenticateJWT').callsFake((req, res, next) => {
        req.user = { _id: mockUser._id };
        next();
      });
    });
    
    it('should handle internal errors gracefully', async () => {
      // Stub the consultation process method to throw an error
      consultationController.processConsultationRequest.restore();
      sandbox.stub(consultationController, 'processConsultationRequest').rejects(new Error('Internal processing error'));
      
      // Make request to the endpoint
      const response = await chai.request(app)
        .post('/api/consultation/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I have been experiencing joint pain for several weeks.',
          consultationType: 'symptom_assessment',
          sessionId: 'test-session-789'
        });
      
      // Assertions
      expect(response).to.have.status(500);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.include('processing error');
    });
  });
  
  describe('GET /api/consultation/history/:sessionId', () => {
    it('should return the consultation history for a session', async () => {
      // Make request to the endpoint
      const response = await chai.request(app)
        .get('/api/consultation/history/test-session-789')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response).to.have.status(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(2);
      expect(response.body[0].role).to.equal('user');
      expect(response.body[0].message).to.equal('I have joint pain.');
      expect(response.body[1].role).to.equal('assistant');
    });
    
    it('should return 404 if session history is not found', async () => {
      // Stub getSessionHistory to return empty array (no history)
      consultationHistoryService.getSessionHistory.restore();
      sandbox.stub(consultationHistoryService, 'getSessionHistory').resolves([]);
      
      // Make request with non-existent session ID
      const response = await chai.request(app)
        .get('/api/consultation/history/non-existent-session')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response).to.have.status(404);
      expect(response.body).to.be.an('object');
      expect(response.body.error).to.include('No history found');
      
      // Restore normal behavior
      consultationHistoryService.getSessionHistory.restore();
      sandbox.stub(consultationHistoryService, 'getSessionHistory').resolves([
        { timestamp: Date.now() - 3600000, role: 'user', message: 'I have joint pain.' },
        { timestamp: Date.now() - 3590000, role: 'assistant', message: 'Where is the pain located?' }
      ]);
    });
  });
  
  describe('GET /api/consultation/sessions', () => {
    it('should return a list of consultation sessions for the user', async () => {
      // Stub the session list method
      sandbox.stub(consultationHistoryService, 'getUserSessions').resolves([
        { 
          sessionId: 'test-session-789',
          startTime: Date.now() - 86400000,
          lastUpdateTime: Date.now() - 3590000,
          consultationType: 'symptom_assessment',
          messageCount: 6
        },
        {
          sessionId: 'test-session-456',
          startTime: Date.now() - 172800000,
          lastUpdateTime: Date.now() - 172700000,
          consultationType: 'herbal_recommendation',
          messageCount: 4
        }
      ]);
      
      // Make request to the endpoint
      const response = await chai.request(app)
        .get('/api/consultation/sessions')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response).to.have.status(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(2);
      expect(response.body[0].sessionId).to.equal('test-session-789');
      expect(response.body[0].consultationType).to.equal('symptom_assessment');
      expect(response.body[1].sessionId).to.equal('test-session-456');
      expect(response.body[1].consultationType).to.equal('herbal_recommendation');
    });
    
    it('should return an empty array if user has no sessions', async () => {
      // Stub the session list method to return empty array
      consultationHistoryService.getUserSessions.restore();
      sandbox.stub(consultationHistoryService, 'getUserSessions').resolves([]);
      
      // Make request to the endpoint
      const response = await chai.request(app)
        .get('/api/consultation/sessions')
        .set('Authorization', `Bearer ${authToken}`);
      
      // Assertions
      expect(response).to.have.status(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(0);
    });
  });
}); 