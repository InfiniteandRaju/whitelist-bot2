const express = require('express');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

app.post('/api/whitelist', (req, res) => {
  const username = req.body.username;
  if (!username || username.length > 16) return res.sendStatus(400);

  exec(`screen -S minecraft -p 0 -X stuff "whitelist add ${username}$(printf '\r')"`);
  res.sendStatus(200);
});

app.listen(3000, () => console.log("🌐 Webhook API listening on port 3000"));