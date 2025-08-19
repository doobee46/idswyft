// Load environment variables first
import '../load-env.js';
import express from 'express';

const app = express();
const port = parseInt(process.env.PORT || '3001');

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Idswyft Identity Verification API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Idswyft API server running on port ${port}`);
  console.log(`📚 Health check: http://localhost:${port}/api/health`);
});