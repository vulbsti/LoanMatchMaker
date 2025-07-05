import express from 'express';
import cors from 'cors';
import { config, validateConfig, corsOptions } from './config';
import { DatabaseService, createDatabaseConnection } from './config/database';
import { GeminiService, createGeminiService } from './config/gemini';
import { securityHeaders, generalRateLimit, securityLogMiddleware } from './middleware/security';
import { errorHandler, notFoundHandler, handleUnhandledRejection, handleUncaughtException } from './middleware/errorHandler';
import { sanitizeInput, validateContentLength } from './middleware/validation';
import chatRoutes from './routes/chatRoutes';
import loanRoutes from './routes/loanRoutes';
import { APIResponse } from './models/interfaces';

class App {
  public app: express.Application;
  public database: DatabaseService;
  public geminiService: GeminiService;
  private server?: any;

  constructor() {
    this.app = express();
    this.database = createDatabaseConnection(config.database);
    this.geminiService = createGeminiService(config.gemini);
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.setupGracefulShutdown();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(securityHeaders);
    this.app.use(securityLogMiddleware);
    this.app.use(generalRateLimit);
    
    // CORS configuration
    this.app.use(cors(corsOptions));
    
    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Input validation and sanitization
    this.app.use(sanitizeInput);
    this.app.use(validateContentLength(10 * 1024 * 1024)); // 10MB limit
    
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', async (req, res) => {
      try {
        const dbHealth = await this.database.healthCheck();
        const geminiHealth = await this.geminiService.healthCheck();
        
        const healthResponse: APIResponse = {
          success: true,
          data: {
            status: dbHealth && geminiHealth ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
              database: dbHealth,
              gemini: geminiHealth,
            },
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: config.nodeEnv,
          },
        };
        
        res.status(dbHealth && geminiHealth ? 200 : 503).json(healthResponse);
      } catch (error) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Health check failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(errorResponse);
      }
    });

    // API routes
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/loan', loanRoutes);
    
    // API documentation endpoint
    this.app.get('/api/docs', (req, res) => {
      const docsResponse: APIResponse = {
        success: true,
        data: {
          name: 'Loan Advisor Chatbot API',
          version: '1.0.0',
          description: 'API for loan matching chatbot with dual-agent architecture',
          endpoints: {
            chat: {
              'POST /api/chat/message': 'Process user messages through dual-agent system',
              'GET /api/chat/history/:sessionId': 'Retrieve conversation history',
              'POST /api/chat/session': 'Initialize new chat session',
              'DELETE /api/chat/session/:sessionId': 'End session and cleanup',
            },
            loan: {
              'GET /api/loan/status/:sessionId': 'Get parameter collection status',
              'POST /api/loan/match': 'Trigger matchmaking process',
              'GET /api/loan/results/:sessionId': 'Retrieve match results',
              'PUT /api/loan/parameters/:sessionId': 'Update specific parameter',
            },
            utility: {
              'GET /api/health': 'System health check',
              'GET /api/docs': 'API documentation',
            },
          },
        },
      };
      res.json(docsResponse);
    });
  }

  private initializeErrorHandling(): void {
    // Global error handlers
    process.on('unhandledRejection', handleUnhandledRejection);
    process.on('uncaughtException', handleUncaughtException);
    
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP server closed');
          
          // Close database connection
          this.database.close().then(() => {
            console.log('Database connection closed');
            process.exit(0);
          }).catch((error) => {
            console.error('Error closing database connection:', error);
            process.exit(1);
          });
        });
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      
      // Test database connection
      const dbHealth = await this.database.healthCheck();
      if (!dbHealth) {
        throw new Error('Database connection failed');
      }
      console.log('Database connection established');
      
      // Test Gemini API connection
      const geminiHealth = await this.geminiService.healthCheck();
      if (!geminiHealth) {
        throw new Error('Gemini API connection failed. Cannot start application.');
      } else {
        console.log('Gemini API connection established');
      }
      
      // Start server
      this.server = this.app.listen(config.port, () => {
        console.log(`Server running on port ${config.port}`);
        console.log(`Environment: ${config.nodeEnv}`);
        console.log(`Health check: http://localhost:${config.port}/api/health`);
        console.log(`API docs: http://localhost:${config.port}/api/docs`);
      });
      
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Server stopped');
          resolve();
        });
      });
    }
  }
}

// Create and export app instance
const app = new App();

// Start server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default app;