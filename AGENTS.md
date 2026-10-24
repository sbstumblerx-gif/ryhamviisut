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

## Architecture rules
- The Agentti chat (`src/routes/api.agent.ts`) calls the Lovable AI Gateway Responses API server-side and reads data only through the signed-in user's RLS-scoped client, so it can never see or change more than the user can.
- The agent discovers tables via the `agent_schema_catalog()` SQL function plus a generic read-only `read_table` tool, so new tables become visible to it without code changes.
- Announcements use validated Tiptap JSON rendered as React elements; writes require authenticated user_roles admin authorization, and private images are exposed through signed URLs only when referenced by a public announcement.
