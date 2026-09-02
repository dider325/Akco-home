import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// API: health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API: public Supabase configuration
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  });
});

// Serve all existing website files: HTML, CSS, JS, images, admin assets, etc.
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Keep the existing clean page URLs working.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Vercel uses the exported Express app.
// Local development still works with: npm start
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AKCO Real Estate server running on port ${PORT}`);
  });
}

export default app;
