"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const database_1 = require("./config/database");
const gemini_1 = require("./config/gemini");
const security_1 = require("./middleware/security");
const errorHandler_1 = require("./middleware/errorHandler");
const validation_1 = require("./middleware/validation");
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const loanRoutes_1 = __importDefault(require("./routes/loanRoutes"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.database = (0, database_1.createDatabaseConnection)(config_1.config.database);
        this.geminiService = (0, gemini_1.createGeminiService)(config_1.config.gemini);
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
        this.setupGracefulShutdown();
    }
    initializeMiddleware() {
        this.app.use(security_1.securityHeaders);
        this.app.use(security_1.securityLogMiddleware);
        this.app.use(security_1.generalRateLimit);
        this.app.use((0, cors_1.default)(config_1.corsOptions));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(validation_1.sanitizeInput);
        this.app.use((0, validation_1.validateContentLength)(10 * 1024 * 1024));
        this.app.set('trust proxy', 1);
    }
    initializeRoutes() {
        this.app.get('/api/health', async (req, res) => {
            try {
                const dbHealth = await this.database.healthCheck();
                const geminiHealth = await this.geminiService.healthCheck();
                const healthResponse = {
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
                        environment: config_1.config.nodeEnv,
                    },
                };
                res.status(dbHealth && geminiHealth ? 200 : 503).json(healthResponse);
            }
            catch (error) {
                const errorResponse = {
                    success: false,
                    error: 'Health check failed',
                    message: error instanceof Error ? error.message : 'Unknown error',
                };
                res.status(500).json(errorResponse);
            }
        });
        this.app.use('/api/chat', chatRoutes_1.default);
        this.app.use('/api/loan', loanRoutes_1.default);
        this.app.get('/api/docs', (req, res) => {
            const docsResponse = {
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
    initializeErrorHandling() {
        process.on('unhandledRejection', errorHandler_1.handleUnhandledRejection);
        process.on('uncaughtException', errorHandler_1.handleUncaughtException);
        this.app.use(errorHandler_1.notFoundHandler);
        this.app.use(errorHandler_1.errorHandler);
    }
    setupGracefulShutdown() {
        const gracefulShutdown = (signal) => {
            console.log(`Received ${signal}. Shutting down gracefully...`);
            if (this.server) {
                this.server.close(() => {
                    console.log('HTTP server closed');
                    this.database.close().then(() => {
                        console.log('Database connection closed');
                        process.exit(0);
                    }).catch((error) => {
                        console.error('Error closing database connection:', error);
                        process.exit(1);
                    });
                });
            }
            else {
                process.exit(0);
            }
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    async start() {
        try {
            (0, config_1.validateConfig)();
            const dbHealth = await this.database.healthCheck();
            if (!dbHealth) {
                throw new Error('Database connection failed');
            }
            console.log('Database connection established');
            const geminiHealth = await this.geminiService.healthCheck();
            if (!geminiHealth) {
                throw new Error('Gemini API connection failed. Cannot start application.');
            }
            else {
                console.log('Gemini API connection established');
            }
            this.server = this.app.listen(config_1.config.port, () => {
                console.log(`Server running on port ${config_1.config.port}`);
                console.log(`Environment: ${config_1.config.nodeEnv}`);
                console.log(`Health check: http://localhost:${config_1.config.port}/api/health`);
                console.log(`API docs: http://localhost:${config_1.config.port}/api/docs`);
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
    async stop() {
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
const app = new App();
if (require.main === module) {
    app.start().catch((error) => {
        console.error('Failed to start application:', error);
        process.exit(1);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map