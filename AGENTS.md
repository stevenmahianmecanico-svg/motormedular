<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep daily-route extensions in separate jornada modules and additive companion tables; this preserves existing vehicle, client and maintenance schemas.
- Write jornadas through an authenticated, idempotent transactional RPC; this saves shifts and optional trips/fuel together without duplicate days.
- Render PDFs to images only in browser memory and parse EXIF in the capture handler; this preserves the existing OCR model and avoids file storage.
- Use one guarded generated service-worker registration with icon-only caching; installability must never cache private data or affect previews.
- Resolve PWA precache inputs from public and emit the worker into dist/client; TanStack's separate build environments must not leave Workbox without icon inputs.
