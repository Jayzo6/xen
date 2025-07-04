const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Supabase credentials
const SUPABASE_URL = 'https://gmamvaeffhzyeslzwekg.supabase.co';
const SUPABASE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with your actual service_role key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Home route (basic test)
app.get('/', (req, res) => {
  res.send('Key Generator API is running');
});

// Generate a new key
app.post('/generate-key', async (req, res) => {
  const { userId, hwid, durationDays } = req.body;

  if (!userId || !hwid || !durationDays) {
    return res.status(400).json({ error: 'User ID, HWID, and durationDays are required' });
  }

  const apiKey = uuidv4() + '-' + Math.random().toString(36).substr(2, 9);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('api_keys')
    .insert([
      {
        user_id: userId,
        api_key: apiKey,
        hwid: hwid,
        is_active: true,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }
    ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ apiKey, expiresAt });
});

// Validate a key
app.post('/validate-key', async (req, res) => {
  const { apiKey, hwid } = req.body;

  if (!apiKey || !hwid) {
    return res.status(400).json({ error: 'API key and HWID are required' });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('api_key', apiKey)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'API key not found' });
  }

  const now = new Date();

  if (!data.is_active) {
    return res.status(403).json({ error: 'Key is inactive' });
  }

  if (data.hwid !== hwid) {
    return res.status(403).json({ error: 'HWID mismatch' });
  }

  if (data.expires_at && new Date(data.expires_at) < now) {
    return res.status(403).json({ error: 'Key expired' });
  }

  res.json({ valid: true, user_id: data.user_id });
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
