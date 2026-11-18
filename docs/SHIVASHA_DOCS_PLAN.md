# Shivasha Doc — Product and Technical Plan

## Product decision

Shivasha Doc is a permanent module inside Shivasha Drive and the existing Shivasha application. It is not a separate app and must not depend on Google Docs or Google Drive.

## Goals

- Provide a mobile-first, browser-based document workspace.
- Store document metadata and editable content in the existing Shivasha MongoDB database.
- Store uploaded attachments in storage controlled by the Shivasha Secure Cloud Server (not a third-party document provider).
- Reuse Shivasha account authentication and enforce per-document ownership and access checks on every API request.
- Support autosave with visible saving/saved/error states.
- Support folders, search, rename, move, trash/restore, and document deletion.
- Provide version history with restore.
- Provide controlled sharing with viewer/editor roles and revocation.
- Support export to PDF and DOCX without requiring Google services.
- Work on Android mobile browsers and desktop browsers.

## Existing architecture

- Main application: `devops-saurabhpandey/shivasha` (React 19 + Vite).
- API: existing Node.js/Express service under `server/`.
- Database: existing MongoDB/Mongoose connection.
- Authentication: existing JWT middleware in `server/middleware/auth.js`.
- Infrastructure: Shivasha's existing self-hosted cloud/server repository and Docker deployment. Do not create a separate cloud repository or require a paid hosting provider.

## Proposed data model

### Document
- owner (User reference)
- title (bounded length)
- content (HTML or structured editor JSON; sanitize/validate before storage and rendering)
- folderId (optional)
- collaborators (User reference + viewer/editor role)
- deletedAt (optional soft-delete timestamp)
- timestamps and revision number

### DocumentVersion
- document reference
- revision number
- title and content snapshot
- createdBy
- createdAt

### DocumentFolder
- owner (User reference)
- name
- parentId (optional)
- timestamps

## API boundaries

All routes require the existing authentication middleware. Authorization must be enforced server-side; hiding UI controls is not sufficient.

- `GET /api/docs` — list documents accessible to the signed-in user.
- `POST /api/docs` — create a document.
- `GET /api/docs/:id` — read after access check.
- `PATCH /api/docs/:id` — update after editor/owner access check; use revision/updatedAt checks to prevent silent overwrite.
- `DELETE /api/docs/:id` — soft-delete for owner.
- `GET /api/docs/:id/versions` — list version history after access check.
- `POST /api/docs/:id/versions/:versionId/restore` — restore a version after editor/owner access check.
- Sharing and folder endpoints must validate recipient identities, roles, ownership, and revocation.

## Delivery phases

1. **Foundation:** secure document model and CRUD API, personal document list, create/open/rename/delete, mobile-friendly editor, autosave and save status.
2. **Organization:** folders, search, trash and restore.
3. **Safety and recovery:** version history, conflict detection, restore, backup/restore integration.
4. **Sharing:** viewer/editor permissions, share management and audit trail.
5. **Export:** PDF and DOCX export; import only after file validation and malware/size limits are defined.
6. **Collaboration:** real-time multi-user editing only after access control, conflict handling and operational monitoring are proven.

## Security and reliability requirements

- Never trust owner IDs or collaborator roles supplied by the browser.
- Check access on every read, write, export, and version-history request.
- Sanitize rich text using an explicit allowlist; never render arbitrary untrusted HTML.
- Set request-size and document-size limits.
- Rate-limit write/share endpoints.
- Keep secrets out of source control and frontend bundles.
- Avoid storing document files in ephemeral container filesystems. Use a persistent Shivasha-managed volume/object-storage service with backup and restore.
- Do not claim real-time collaboration until concurrent edits are safely merged and tested.
- Keep existing Shivasha modules working; do not replace the app shell or authentication.

## Acceptance criteria

- A signed-in user can create, edit, close, and reopen a document from another device using the same account.
- Autosave confirms success only after the API/database acknowledges the write.
- A different account cannot read or modify a private document by guessing its ID.
- An editor can update a shared document; a viewer cannot.
- A stale edit cannot silently overwrite a newer revision.
- Version restore creates a new revision rather than destroying history.
- The app remains usable on a narrow Android screen.
- Backend tests cover authentication, ownership, collaborator roles, invalid IDs, size limits, and revision conflicts.
