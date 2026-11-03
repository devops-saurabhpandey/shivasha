# SHIVASHA UI/UX Designer Module

## Goal
Add an accessible, responsive design studio to SHIVASHA where users can create website and mobile-app concepts, preview them, save projects, and export design/code artifacts.

## Navigation
AI Tools → UI/UX Designer

## MVP screens
1. **Designer home** — create project, recent projects, templates.
2. **Create with AI** — prompt, target (website/mobile), style, and generate action.
3. **Studio** — preview canvas, device-size switcher, properties panel, undo/redo, save.
4. **Templates** — searchable starter layouts.
5. **Export** — preview/download generated HTML/CSS or React files; clearly label unsupported elements.

## MVP capabilities
- Website and mobile screen starter templates.
- Prompt-driven design generation behind a server-side provider adapter.
- Responsive preview (desktop/tablet/mobile).
- Editable text, colors, spacing, and basic component properties.
- Save/load user-owned projects.
- Export generated artifacts.
- Loading, empty, error, and success states; keyboard-accessible controls.

## Suggested architecture
- Frontend: React + existing Vite/CSS stack; isolated feature under src/features/ui-ux-designer/.
- API: authenticated Express routes under /api/design-projects and /api/design-projects/:id/generate.
- Persistence: MongoDB project documents with owner ID, title, target, design JSON, timestamps, and optional generated artifacts.
- AI: server-side adapter; API keys remain server-only. Provide a template-based fallback when no provider is configured.
- Authorization: users may read/update/delete only their own projects; validate payload size and schema.

## Suggested data shape
```json
{
  "title": "My first design",
  "target": "website",
  "prompt": "A clean education landing page",
  "design": {
    "version": 1,
    "theme": { "primary": "#4F46E5", "font": "Inter" },
    "pages": []
  }
}
```

## Delivery phases
1. Inspect current app navigation, auth, API conventions, and styles.
2. Add module entry and responsive designer home with template-based preview.
3. Add authenticated project save/load API and MongoDB model.
4. Add server-side AI generation adapter and fallback behavior.
5. Add editing controls and export.
6. Build, test, and verify desktop/mobile behavior and permissions.

## Acceptance checklist
- [ ] Module is reachable from AI Tools.
- [ ] Responsive layout works on mobile and desktop.
- [ ] User can create and preview a starter design without an AI key.
- [ ] Project persistence is owner-scoped.
- [ ] AI credentials are never exposed in frontend code.
- [ ] Export produces a usable artifact and reports limitations.
- [ ] Empty, loading, and error states are accessible.
- [ ] Existing SHIVASHA features continue to build and work.
