/**
 * User Authentication Service
 * Handles user registration, login, and session management
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Mock user database for initial setup
const users = [];

/**
 * User registration endpoint
 * Supports phone number + verification code and third-party logins
 */
router.post('/register', async (req, res) => {
  try {
    const { phone, email, password, thirdPartyToken, provider } = req.body;
    
    // Check if user already exists
    const userExists = users.find(user => user.phone === phone || user.email === email);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Handle registration based on method (phone or third-party)
    if (phone) {
      // Phone registration logic
      // In a real implementation, we would verify the verification code here
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create new user
      const newUser = {
        id: Date.now().toString(),
        phone,
        email,
        password: hashedPassword,
        role: 'user',
        createdAt: new Date()
      };
      
      // Save user (in a real app, this would be a database operation)
      users.push(newUser);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: newUser.id,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role
        }
      });
    } 
    else if (thirdPartyToken && provider) {
      // Third-party login logic
      // In a real implementation, we would verify the token with the provider
      
      // Create new user from third-party data
      const newUser = {
        id: Date.now().toString(),
        provider,
        providerId: 'third-party-id', // This would come from the verified token
        phone,
        email,
        role: 'user',
        createdAt: new Date()
      };
      
      // Save user
      users.push(newUser);
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      return res.status(201).json({
        message: 'User registered successfully via third-party',
        token,
        user: {
          id: newUser.id,
          provider: newUser.provider,
          email: newUser.email,
          role: newUser.role
        }
      });
    }
    else {
      return res.status(400).json({ message: 'Invalid registration data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

/**
 * User login endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, email, password, thirdPartyToken, provider } = req.body;
    
    // Phone/email + password login
    if ((phone || email) && password) {
      // Find user
      const user = users.find(u => u.phone === phone || u.email === email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email,
          role: user.role
        }
      });
    }
    // Third-party login
    else if (thirdPartyToken && provider) {
      // In a real implementation, we would verify the token with the provider
      
      // Find user with this provider
      const user = users.find(u => u.provider === provider && u.providerId === 'third-party-id');
      
      // If user doesn't exist, this would redirect to registration
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found with this provider', 
          shouldRegister: true 
        });
      }
      
      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      return res.status(200).json({
        message: 'Login successful via third-party',
        token,
        user: {
          id: user.id,
          provider: user.provider,
          email: user.email,
          role: user.role
        }
      });
    }
    else {
      return res.status(400).json({ message: 'Invalid login data' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

/**
 * Verify token middleware
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

/**
 * Protected route example
 */
router.get('/me', verifyToken, (req, res) => {
  // Find user by ID (in a real app, this would be a database query)
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Return user data (excluding sensitive information)
  return res.status(200).json({
    id: user.id,
    phone: user.phone,
    email: user.email,
    role: user.role
  });
});

module.exports = {
  router,
  verifyToken
}; 