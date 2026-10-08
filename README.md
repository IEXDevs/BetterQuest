# BetterQuest

Minimal Manifest V3 Chrome extension: a blue **BetterQuest** button in Quest's top breadcrumb bar opens an empty, non-modal in-page panel with a close button. TypeScript only; no popup or other features.

## Setup

Requires Node.js 22+.

```sh
npm ci
npm run build
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/`. Refresh your authenticated Quest student page. After rebuilding, reload the extension and refresh Quest again.

## Navigation integration

Navigation detection is isolated in `src/content/navigation.ts` and uses the authenticated structure supplied by the user: `.qh-navbar` with direct children `.qh-breadcrumbs` and `.qh-nav`. The button is inserted between those children without modifying them. Missing or incomplete navigation leaves Quest unchanged. Local tests use that supplied structure; visual placement remains for your authenticated Chrome-session check.

The controller maintains one button per document and remounts it when the selected container is replaced or inserted later. DOM observation is debounced and ignores extension-owned changes. Native navigation events, browser history events, and page restoration reconcile the mount; normal refreshes initialize it anew. No History API patching or URL polling.

Both the button and panel use Shadow DOM. The extension does not restyle Quest, modify existing controls, lock scrolling, or trap focus. The panel stays empty; close/Escape returns focus to the launcher. The service worker provides only a typed startup handshake.

## Structure and validation

```text
src/content/navigation.ts   Single selector adapter
src/content/integration.ts  Idempotent mounting and lifecycle
src/content/ui.ts           Scoped button and empty panel
src/content/index.ts        Content-script entry point
src/background/index.ts     MV3 service-worker entry point
src/shared/messages.ts      Typed handshake and URL guard
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Local DOM tests cover missing navigation, delayed insertion, replacement, duplicate prevention, panel interaction, focus, navigation, and cleanup. They use synthetic markup and do not authenticate, scrape, or contact Quest. Actual placement/layout will be checked manually in your authenticated Chrome session.

No API permissions, broad host permissions, storage, external services, or remote assets. The manifest declares only static content-script access to Quest's `/student` pages. Changes are left unstaged and uncommitted.
