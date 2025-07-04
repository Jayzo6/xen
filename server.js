const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('undici').fetch;

global.fetch = fetch;

const app = express();
const port = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('✅ Key Generator API is running.');
});

// Test route to check Supabase connectivity and table access
app.get('/test', async (req, res) => {
    const { data, error } = await supabase.from('api_keys').select('*').limit(1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Generate key with userId and hwid
app.post('/generate-key', async (req, res) => {
    const { userId, hwid } = req.body;

    if (!userId || !hwid) {
        return res.status(400).json({ error: 'User ID and HWID are required' });
    }

    const apiKey = uuidv4() + '-' + Math.random().toString(36).substr(2, 9);

    const result = await supabase
        .from('api_keys')
        .insert([{ user_id: userId, api_key: apiKey, hwid: hwid, is_active: true }]);

    console.log('Supabase Insert Result:', result);

    if (result.error) {
        return res.status(500).json({ error: result.error.message || 'Unknown Supabase error' });
    }

    return res.json({ apiKey });
});

// List all keys for a user (with HWID and status)
app.get('/keys/:userId', async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase
        .from('api_keys')
        .select('api_key, hwid, is_active')
        .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    res.json(data);
});

// Deactivate a key
app.post('/deactivate-key', async (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('api_key', apiKey);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: 'Key deactivated successfully' });
});

app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});
