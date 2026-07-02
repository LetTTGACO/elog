# Notion Image Local To Local E2E Case

This case runs the real Elog CLI against a real Notion data source, downloads
images to a local `images/` directory, and deploys markdown files to `docs/`.

Required environment variables:

```bash
export ELOG_E2E_NOTION_TOKEN=""
export ELOG_E2E_NOTION_DATA_SOURCE_ID=""
```

The Notion data source used by this case must contain:

- At least one stable published page.
- At least one stable image in page content or cover.

Run:

```bash
pnpm test:notion-local
```

Set `ELOG_E2E_KEEP_TMP=1` to preserve generated temporary workspaces for
inspection.
