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

- App state is in-memory mock data in src/data/mock.ts served through the React context in src/lib/store.tsx; no backend yet, so swap the store actions when persistence is added.
- Pricing/late-fee rules live in src/lib/calc.ts with tests in src/test/calc.test.ts.
- Role layout capabilities and portal entry routes are centralized in src/lib/role-layout.ts and tested alongside existing tests so role switching and page controls share the same rules.
