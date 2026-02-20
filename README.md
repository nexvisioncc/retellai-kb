# Retell AI Knowledge Base Sync

This repository stores Knowledge Base content for the Nexvision AI Voice Receptionist and automatically syncs it to Retell AI.

## Structure

```
knowledge-base/
├── README.md              # This file
├── config.yaml            # KB configuration
├── sources/               # KB source files
│   ├── faq.md
│   ├── services.md
│   └── policies.md
└── .github/
    └── workflows/
        └── sync-kb.yml    # Auto-sync workflow
```

## How It Works

1. **Edit KB content** in `sources/` folder
2. **Push to GitHub** → triggers automatic sync to Retell
3. **Retell AI agent** gets updated with new KB content

## Supported Formats

- Markdown (.md) - **Recommended**
- PDF (.pdf)
- Text (.txt)
- Word (.docx)
- URLs (for web content)

## Pricing

- First 10 KBs: **FREE**
- Additional KBs: $8/month each
- Usage: +$0.005/minute for calls using KB

## Manual Sync

If needed, you can manually trigger sync:

```bash
./scripts/sync-to-retell.sh
```
