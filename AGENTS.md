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
- The Agentti chat (`src/routes/api.agent.ts`) calls Google Gemini via its OpenAI-compatible endpoint with the GEMINI_API_KEY secret server-side and reads data only through the user RLS-scoped client.
- The agent discovers tables via the `agent_schema_catalog()` SQL function plus a generic read-only `read_table` tool, so new tables become visible to it without code changes.
- Announcements use validated Tiptap JSON rendered as React elements; writes require authenticated user_roles admin authorization, and private images are exposed through signed URLs only when referenced by a public announcement.
- Artist claims, email blocks and admin audit log are service_role-only tables (no RLS policies); emails are read/changed only in `src/lib/artist-claims.functions.ts` after a has_role admin check, and claim status changes go through the atomic `admin_set_claim_status` SQL function.
- Supporter billing uses the pre-created Stripe catalog IDs from `src/lib/supporter-plan.ts`; never create prices during checkout, so charges remain traceable to the configured offer.
