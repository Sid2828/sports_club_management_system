import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { initDatabase } from './db.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.routes.js';
import subscriptionRoutes from './routes/subscriptions.routes.js';
import venueRoutes from './routes/venues.routes.js';
import equipmentRoutes from './routes/equipment.routes.js';
import bookingRoutes from './routes/bookings.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import memberRoutes from './routes/members.routes.js';
import activityRoutes from './routes/activity.routes.js';
import sportsRoutes from './routes/sports.routes.js';
import paymentsRoutes from './routes/payments.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Global auth authentication middleware populating req.user
app.use('/api', authenticate);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/plans', subscriptionRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Sports Club Management Backend'
  });
});

// Root API information
app.get('/api', (req, res) => {
  res.json({
    name: 'ArenaOne Sports Club API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      subscriptions: '/api/subscriptions',
      venues: '/api/venues',
      equipment: '/api/equipment',
      bookings: '/api/bookings',
      maintenance: '/api/maintenance',
      members: '/api/members',
      activity: '/api/activity',
      sports: '/api/sports',
      payments: '/api/payments'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred'
  });
});

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  initDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`ArenaOne Sports Club Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
} else {
  initDatabase().catch((err) => {
    console.error('Test database init failed:', err.message);
  });
}

export default app;
