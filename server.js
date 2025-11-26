import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// IMPORTANT: WebContainer requires these headers to function securely
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running with WebContainer headers' });
});

// Proxy for Ollama (optional, avoids mixed content issues if deployed)
app.post('/api/ollama/chat', async (req, res) => {
    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        // Pipe the stream
        response.body.pipe(res);
    } catch (error) {
        console.error('Ollama Proxy Error:', error);
        res.status(500).json({ error: 'Failed to connect to Ollama' });
    }
});

// Serve static files (for production build)
// app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebContainer headers enabled: COOP=same-origin, COEP=require-corp`);
});