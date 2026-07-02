# Yuque Image R2 To Local E2E Case

This case runs the real Elog CLI against a real Yuque repository, uploads
images to Cloudflare R2, and deploys markdown files to `docs/`.

Required environment variables:

```bash
export ELOG_E2E_YUQUE_USERNAME=""
export ELOG_E2E_YUQUE_PWD=""
export ELOG_E2E_YUQUE_LOGIN=""
export ELOG_E2E_YUQUE_REPO=""
export ELOG_E2E_R2_HOST=""
export ELOG_E2E_R2_ACCESS_KEY_ID=""
export ELOG_E2E_R2_SECRET_ACCESS_KEY=""
export ELOG_E2E_R2_BUCKET=""
export ELOG_E2E_R2_ENDPOINT=""
```

The Yuque repository used by this case must contain:

- At least one stable published document.
- At least one stable image in document content.

Run:

```bash
pnpm test:yuque-r2-local
```

Set `ELOG_E2E_KEEP_TMP=1` to preserve generated temporary workspaces for
inspection.
