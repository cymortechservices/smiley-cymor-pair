# 😄 SMILEY CYMOR MD — Pair website

Hacker-style intro → logo reveal → pair page → session ID → deploy guide.

## How it works
1. User enters their number → server asks WhatsApp for a pairing code and shows it.
2. User enters the code in *WhatsApp → Linked devices → Link with phone number*.
3. Server builds the session ID `cymor~<base64(gzip(creds.json))>`, **messages it to the user's own WhatsApp**, and deletes the temporary files. Nothing is saved to disk or a database; session IDs are never logged.

## Run locally
```bash
npm install
BOT_REPO=https://github.com/yourname/smiley-cymor-md npm start   # http://localhost:3000
```

## Environment variables
| Variable | Meaning |
|---|---|
| `PORT` | Set automatically by Render/Heroku (default 3000) |
| `BOT_REPO` | URL of your **bot** repo — turns on the Heroku / Render / Download / Fork buttons |
| `LINK_TIMEOUT_SECONDS` | How long a user has to link (default 180) |
| `MAX_ACTIVE_PAIRINGS` | Simultaneous pairings (default 12) |
| `RATE_LIMIT_PER_IP` | Pairings per IP per 10 min (default 5) |

## API
`POST /api/pair {number}` · `GET /api/status/:id` · `GET /code?number=` (used by the bot's `.pair`) · `GET /health`
