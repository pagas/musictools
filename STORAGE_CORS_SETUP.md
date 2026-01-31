# Firebase Storage CORS Setup

If you see **CORS errors** when uploading or accessing files in the Music Library, CORS is not applied correctly on your Firebase Storage bucket.

**Note:** The CORS file uses a JSON array format `[{...}]`, which works with both `gsutil` and `gcloud`. If `gcloud` gives errors, try `gsutil` instead.

## Quick Fix: Use gsutil (recommended)

`gcloud storage buckets update --cors-file` can fail with Python errors and still report "Completed 1". Use **gsutil** instead—it often applies CORS correctly.

1. **Install or use gsutil** (it ships with Google Cloud SDK):
   - If you have gcloud: `gcloud components install gsutil`
   - Or install full SDK: https://cloud.google.com/sdk/docs/install

2. **Authenticate** (if needed):
   ```bash
   gcloud auth login
   ```

3. **Apply CORS** from the project root (where `storage.cors.json` is):
   ```bash
   gsutil cors set storage.cors.json gs://paulius-7557c.appspot.com
   ```
   Replace `paulius-7557c` with your Firebase project ID if different.

4. **Verify CORS is set** (gcloud):
   ```bash
   gcloud storage buckets describe gs://paulius-7557c.appspot.com --format="default(cors_config)"
   ```
   You should see your origins and methods. If empty, CORS was not applied.

5. **Restart your dev server** and try uploading again.

## Still getting CORS errors?

**Test with permissive CORS** (debug only): apply `storage.cors.debug.json`, which allows origin `*`:
```bash
gsutil cors set storage.cors.debug.json gs://paulius-7557c.appspot.com
```
If uploads work with this file, CORS is applied and the issue was origin matching—switch back to `storage.cors.json` and ensure your app’s origin (e.g. `http://localhost:5173`) is in the list. Do not leave `*` in production.

**Check the exact origin** in DevTools: Network → click a failed request → Headers → "Origin" under Request Headers. It must match an entry in `storage.cors.json` exactly (no trailing slash).

## If gsutil is not in your PATH (Windows)

Run it via gcloud:
```bash
gcloud storage cp storage.cors.json gs://paulius-7557c.appspot.com/
```
That only copies the file; it does **not** set CORS. Use the full Cloud SDK shell or add the SDK `bin` folder to PATH so `gsutil` (or `gsutil.cmd`) works, then run:
```bash
gsutil cors set storage.cors.json gs://paulius-7557c.appspot.com
```

## Production Deployment

When you deploy to production (e.g. Vercel), add your production domain to `storage.cors.json` in the `origin` array, for example:

```json
"origin": [
  "http://localhost:5173",
  "https://your-app.vercel.app",
  "https://yourdomain.com"
]
```

Then re-run the `gsutil cors set` command.
