import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import errorHandler from './middlewares/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', routes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
