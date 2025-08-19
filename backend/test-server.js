// Simple test server
import express from 'express';

const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.json({ message: 'Test server is running!' });
});

app.listen(port, () => {
  console.log(`🚀 Test server running on port ${port}`);
});