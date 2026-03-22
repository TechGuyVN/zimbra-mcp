# zimbra-mcp

MCP server for **IMAP** (read) and **SMTP** (send), aimed at **Zimbra** and any standard mail host. **stdio** transport — works with **Claude Desktop**, **Cursor**, and other MCP clients.

**npm:** [npmjs.com/package/zimbra-mcp](https://www.npmjs.com/package/zimbra-mcp) · **Source:** [github.com/TechGuyVN/zimbra-mcp](https://github.com/TechGuyVN/zimbra-mcp)

---

## Requirements

- **Node.js** ≥ 18
- Mail with **IMAP** and **SMTP** enabled

---

## Install (npm only)

```bash
npm install -g zimbra-mcp
```

This installs the **`zimbra-mcp`** command and the package under your global `node_modules`.

### Entrypoint for MCP config

Use **one** of these in Claude/Cursor:

**A — Global command (simplest if `npm bin -g` is on your PATH when the app starts):**

```json
{
  "command": "zimbra-mcp",
  "args": []
}
```

**B — `node` + absolute path to `dist/index.js` (most reliable):**

1. Print the global package root:

   ```bash
   npm root -g
   ```

2. Your file is:  
   `{that_output}/zimbra-mcp/dist/index.js`  
   Example macOS/Linux: `/usr/local/lib/node_modules/zimbra-mcp/dist/index.js`  
   Example Windows (typical): `C:\Users\You\AppData\Roaming\npm\node_modules\zimbra-mcp\dist\index.js`

```json
{
  "command": "node",
  "args": ["/absolute/path/to/node_modules/zimbra-mcp/dist/index.js"]
}
```

Always use a real **absolute** path in `args`.

**Claude Desktop + nvm:** Claude prepends old Node versions to `PATH` (e.g. v13 first). Then `/usr/bin/env node` inside any shebang can pick **Node 13**, which breaks this package (**Node ≥ 18** required). Fix: set **`command`** to an **absolute Node 18+** binary and **`args`** to the script:

```json
{
  "mcpServers": {
    "zimbra-mail": {
      "command": "/Users/YOU/.nvm/versions/node/v20.19.5/bin/node",
      "args": ["/usr/local/lib/node_modules/zimbra-mcp/dist/index.js"],
      "env": {}
    }
  }
}
```

Adjust paths with `which node` (after `nvm use 20`) and `npm root -g`. You can use `.../zimbra-mcp/bin/zimbra-mcp.mjs` instead of `dist/index.js` if you prefer the npm `bin` entry (same Node binary in `command`).

---

## Environment variables

Set these in the MCP **`env`** object (all values as **strings**). The server does **not** read `.env` by itself.

### Single mailbox (flat env)

Do **not** set `ZIMBRA_MAILBOXES_PATH`. One profile named **`default`** is used; omit `profile` on tools.

| Variable             | Required | Notes                                                          |
| -------------------- | -------- | -------------------------------------------------------------- |
| `ZIMBRA_IMAP_HOST`   | Yes      | IMAP host                                                      |
| `ZIMBRA_IMAP_PORT`   | No       | Default `993`                                                  |
| `ZIMBRA_IMAP_USER`   | Yes      | Usually full email                                             |
| `ZIMBRA_IMAP_PASS`   | Yes      | Password or app password                                       |
| `ZIMBRA_IMAP_SECURE` | No       | If unset: `true` if port **993**, else `false`                 |
| `ZIMBRA_SMTP_HOST`   | Yes      | SMTP host                                                      |
| `ZIMBRA_SMTP_PORT`   | No       | Default `587`                                                  |
| `ZIMBRA_SMTP_USER`   | Yes      | Often same as IMAP                                             |
| `ZIMBRA_SMTP_PASS`   | Yes      | Often same as IMAP                                             |
| `ZIMBRA_SMTP_SECURE` | No       | If unset: `true` if port **465**, else `false`                 |
| `ZIMBRA_LIST_MAX`    | No       | Max messages per list call; default **200**, hard cap **1000** |

Ports: IMAP **993** (TLS), SMTP **587** (STARTTLS, often `ZIMBRA_SMTP_SECURE=false`) or **465** (SSL).

### Multiple mailboxes (one JSON file)

1. Create a JSON file (see **example** below). `chmod 600` it.
2. Set **`ZIMBRA_MAILBOXES_PATH`** to its **absolute** path.
3. Use tool **`zimbra_list_profiles`**, then pass **`profile`** on other tools.

| Variable                | Required | Notes                             |
| ----------------------- | -------- | --------------------------------- |
| `ZIMBRA_MAILBOXES_PATH` | Yes      | Absolute path to the JSON file    |
| `ZIMBRA_LIST_MAX`       | No       | Overrides list cap (max **1000**) |

**Minimal multi-profile JSON:**

```json
{
  "defaultProfile": "work",
  "maxListMessages": 200,
  "profiles": [
    {
      "id": "work",
      "imap": {
        "host": "mail.company.com",
        "port": 993,
        "user": "you@company.com",
        "pass": "secret"
      },
      "smtp": {
        "host": "mail.company.com",
        "port": 587,
        "user": "you@company.com",
        "pass": "secret"
      }
    },
    {
      "id": "personal",
      "imap": {
        "host": "imap.gmail.com",
        "user": "you@gmail.com",
        "pass": "app-password"
      },
      "smtp": {
        "host": "smtp.gmail.com",
        "user": "you@gmail.com",
        "pass": "app-password"
      }
    }
  ]
}
```

`port` / `secure` under `imap`/`smtp` are optional (defaults: IMAP 993, SMTP 587, with TLS rules same as flat env). More examples: [mailboxes.example.json](https://github.com/TechGuyVN/zimbra-mcp/blob/main/mailboxes.example.json) on GitHub.

---

## Claude Desktop

**Config file**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Single mailbox**

```json
{
  "mcpServers": {
    "zimbra-mail": {
      "command": "zimbra-mcp",
      "args": [],
      "env": {
        "ZIMBRA_IMAP_HOST": "mail.example.com",
        "ZIMBRA_IMAP_PORT": "993",
        "ZIMBRA_IMAP_USER": "you@example.com",
        "ZIMBRA_IMAP_PASS": "your-secret",
        "ZIMBRA_SMTP_HOST": "mail.example.com",
        "ZIMBRA_SMTP_PORT": "587",
        "ZIMBRA_SMTP_USER": "you@example.com",
        "ZIMBRA_SMTP_PASS": "your-secret"
      }
    }
  }
}
```

**Multiple mailboxes**

```json
{
  "mcpServers": {
    "zimbra-mail": {
      "command": "zimbra-mcp",
      "args": [],
      "env": {
        "ZIMBRA_MAILBOXES_PATH": "/Users/you/.config/zimbra-mcp/mailboxes.json"
      }
    }
  }
}
```

Restart Claude fully after edits.

---

## Cursor

**Settings → MCP** (or `mcp.json` per [Cursor docs](https://docs.cursor.com)). Use the same `command` / `args` / `env` shape as above, then reload MCP.

---

## Tools

| Tool                   | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `zimbra_list_profiles` | List mailbox profiles (`ZIMBRA_MAILBOXES_PATH` mode).                |
| `zimbra_list_folders`  | List IMAP folders. Optional `profile`.                               |
| `zimbra_list_messages` | Last N messages in `folder`. Optional `profile`, `limit` (cap 1000). |
| `zimbra_get_message`   | Read by UID. Optional `profile`.                                     |
| `zimbra_send_email`    | Send mail. Optional `profile`.                                       |

**UID** is scoped to `folder` and `profile`.

---

## Tips

- One account, many folders: `zimbra_list_folders` then `zimbra_list_messages` per folder.
- Raise `ZIMBRA_LIST_MAX` if you need longer lists (≤ 1000).
- Listing is “last N by sequence”; filter by `date` in the model if you need “today’s mail”.

---

## Troubleshooting

| Issue           | Check                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| MCP won’t start | `node -v` ≥ 18; if using `zimbra-mcp`, ensure global npm bin is on PATH. |
| Safer start     | Use `node` + absolute `.../zimbra-mcp/dist/index.js` from `npm root -g`. |
| Auth errors     | Host/port/TLS; app passwords; IMAP/SMTP enabled on server.               |

---

## Security

- Never paste secrets into public chats; lock down JSON and Claude config files (`chmod 600` where applicable).
- This MCP can read and send mail for every configured account.

---

## Protocol & license

[MCP](https://modelcontextprotocol.io) · **ISC** — see `package.json`.
