# Yuque Image Local To Local E2E Case

This case runs the real Elog CLI against a real Yuque repository, downloads
images to a local `images/` directory, and deploys markdown files to `docs/`.

Required environment variables:

```bash
export ELOG_E2E_YUQUE_TOKEN=""
export ELOG_E2E_YUQUE_LOGIN=""
export ELOG_E2E_YUQUE_REPO=""
```

The Yuque repository used by this case must contain:

- At least one stable published document.
- At least one stable image in document content.

Run:

```bash
pnpm e2e:yuque-local
```

Set `ELOG_E2E_KEEP_TMP=1` to preserve generated temporary workspaces for
inspection.
