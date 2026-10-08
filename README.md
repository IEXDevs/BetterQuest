# BetterQuest

Manifest V3 Chrome extension: the existing blue **BetterQuest** navbar button opens an empty, non-modal in-page panel. V1 feature foundations are scaffolded in TypeScript; unknown Quest integrations remain disabled. No popup or standalone dashboard.

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

Both the button and panel use Shadow DOM. The extension does not restyle Quest, modify existing controls, lock scrolling, or trap focus. The panel stays empty; close/Escape returns focus to the launcher. The service worker handles a typed startup handshake and validated local-data commands.

## Structure and validation

```text
src/content/navigation.ts   Single selector adapter
src/content/integration.ts  Idempotent mounting and lifecycle
src/content/ui.ts           Scoped button and empty panel
src/content/index.ts        Content-script entry point
src/background/index.ts     MV3 service-worker entry point
src/shared/messages.ts      Typed handshake and URL guard
src/shared/models.ts        Course/assignment/question/storage/export models
src/shared/client.ts        Validated worker client and change notifications
src/storage/                Local repository and serialized command reducer
src/adapters/quest/          Disabled adapters, awaiting inspected feature DOM
src/features/               Assignments, bookmarks, PDF, study export, theme
docs/                       Architecture, JSON schema, integration checklist
public/manifest.json        Student-page matching only
```

```sh
npm test
npm run build
```

Tests cover the working navbar/panel, local persistence, worker messaging, concurrent writes, caching/freshness, bookmarks, scoped controls/lifecycle, PDF capability gating, export/download, and theme preferences/tokens. Chrome APIs are mocked at the test boundary; fixtures are synthetic contract samples, not claims about live Quest markup. No tests authenticate, scrape, or contact Quest.

The only API permission is `storage`, used for personal data in this Chrome profile. No broad host permissions, external services, remote assets, crawling, or assessment automation. Reload the extension to accept the storage-permission addition, then refresh Quest. Changes are left unstaged and uncommitted.

Read the [architecture and feature status](docs/ARCHITECTURE.md), [authenticated integration checklist](docs/INTEGRATION_CHECKLIST.md), and [study export schema](docs/study-export.schema.json). Start by inspecting and enabling the assignment adapter; it supplies the identities other features need. The new infrastructure adds no visible UI until verified adapters are configured.
