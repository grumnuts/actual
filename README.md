# Actual Budget — grumnuts fork

> **This is a personal fork of Actual Budget with added support for weekly and fortnightly budget allocations.**

---

## What's different in this fork

Actual Budget natively works on a monthly budgeting model. This fork extends that with:

- **Weekly allocation support** — assign budget amounts on a weekly basis
- **Fortnightly allocation support** — budget by fortnight, useful if you're paid fortnightly (like most of us)

Everything else remains the same as upstream Actual Budget.

---

## About Actual Budget

Actual is a fast, privacy-focused local-first personal finance tool. It runs on your own machine and syncs across devices — no subscription, no cloud lock-in, no bullshit.

- 💸 Envelope-style budgeting
- 🔄 Bank sync support
- 📊 Reports and trends
- 🔒 Fully local — your data stays yours
- 🌐 Self-hostable

---

## Getting started

Refer to the [official Actual Budget documentation](https://actualbudget.org/docs/) for full setup instructions.

### Docker (recommended)

The easiest way to run this fork. Image is published at [`grumnuts/actual`](https://hub.docker.com/r/grumnuts/actual).

```bash
docker pull grumnuts/actual:latest
```

```bash
docker run -d \
  --name actual \
  -p 5006:5006 \
  -v /path/to/your/data:/data \
  grumnuts/actual:latest
```

Then open `http://localhost:5006` in your browser.

#### Docker Compose

```yaml
services:
  actual:
    image: grumnuts/actual:latest
    container_name: actual
    ports:
      - "5006:5006"
    volumes:
      - ./data:/data
    restart: unless-stopped
```

#### Available tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable build from this fork |
| `x.y.z` | Pinned version releases |

---

### Build from source

```bash
git clone https://github.com/grumnuts/actual.git
cd actual
yarn install
yarn start
```

---

## Issues & feedback

For anything specific to this fork (weekly/fortnightly features), [open an issue here](https://github.com/grumnuts/actual/issues).

For core app bugs/features, please open an issue in this repository so they can be triaged here.

---

## Contributing

PRs welcome. Keep it focused — this fork is specifically about flexible allocation periods, not a general dumping ground for random patches.

---

## Licence

MIT — same as upstream. See [LICENSE](./LICENSE) for details.

---

*Originally forked from the main Actual Budget project.*