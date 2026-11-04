import Link from "next/link";
import React from "react";

import { getBaseApiUrl } from "../../services/adapter";
import classes from "../landing/landing.module.css";

export const USAGE_GUIDE_TOC = [
  { id: "before-you-start", label: "Before you start" },
  { id: "account", label: "Create an account" },
  { id: "clubs", label: "Clubs" },
  { id: "create-tournament", label: "Create a tournament" },
  { id: "settings-codes", label: "Settings and codes" },
  { id: "players", label: "Players" },
  { id: "teams", label: "Teams" },
  { id: "brackets-individuals", label: "Brackets (individuals)" },
  { id: "seeding-individuals", label: "Seeding algorithm" },
  { id: "brackets-teams", label: "Brackets (teams)" },
  { id: "edit-brackets", label: "Edit brackets" },
  { id: "schedule", label: "Schedule and courts" },
  { id: "publish-day", label: "Publish and run the day" },
  { id: "end-tournament", label: "End of tournament" },
  { id: "exports", label: "Exports" },
  { id: "api", label: "API" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

function Shot({ label }: { label: string }) {
  return (
    <figure className={classes.shot}>
      <div className={classes.shotFrame} role="img" aria-label={`Screenshot placeholder: ${label}`}>
        Screenshot placeholder
      </div>
      <figcaption className={classes.shotCaption}>{label}</figcaption>
    </figure>
  );
}

function Callout({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <aside className={classes.callout} data-tone={tone} role="note">
      {children}
    </aside>
  );
}

export function UsageGuideContent() {
  const apiDocsUrl = `${getBaseApiUrl()}/docs`;

  return (
    <div className={classes.prose}>
      <h2 id="before-you-start">1. Before you start</h2>
      <p>
        This guide walks an organizer through planning and running a KenManage tournament: account
        setup, clubs, roster, brackets, schedule, scores, sharing codes, exports, and the API. For a
        short path per role (organizer, participant, scorekeeper), see the{" "}
        <Link href="/guide">quick guide</Link>.
      </p>
      <p>KenManage has three roles:</p>
      <ul>
        <li>
          <strong>Organizer</strong> — account registration required. Owns tournaments data, edits everything.
        </li>
        <li>
          <strong>Participant</strong> — no account required. Receives a tournament code (or link) from the organizer to view the
          tournament public site at <code>/t/&#123;participant_code&#125;</code>.
        </li>
        <li>
          <strong>Scorekeeper</strong> — no account required. Redeems a separate access code at{" "}
          <Link href="/scorekeeping">/scorekeeping</Link> and can only edit scores for that
          tournament.
        </li>
      </ul>
      <Callout>
        <p>
          <strong>Typical order:</strong> account → clubs → create tournament → import players →
          (optional) teams → generate brackets → schedule courts → publish and share codes → enter
          scores on the day.
        </p>
      </Callout>

      <h2 id="account">2. Create an account</h2>
      <p>
        Open <Link href="/register">Register</Link> or <Link href="/login">Log in</Link> from{" "}
        <Link href="/#start">Get started</Link>.
      </p>
      <h3>Email registration</h3>
      <ol>
        <li>Enter name, email, country, and password.</li>
        <li>Complete the captcha and submit.</li>
        <li>
          KenManage creates a Firebase auth user and a matching row in the app database. You land on
          the tournament list at <code>/</code>.
        </li>
      </ol>
      <h3>Google sign-in</h3>
      <p>
        If you sign in with Google and there is no KenManage user yet, you are asked for country
        (finish signup), then redirected to the tournament list.
      </p>
      <h3>Profile</h3>
      <p>
        At <Link href="/user">/user</Link> you can update name, title, organization, bio, email,
        phone, city, country, and password. Profile fields are not used as API keys.
      </p>
      <Shot label="Screenshot: registration or login screen" />
      <Callout tone="warn">
        <p>
          <strong>Gotcha:</strong> If Firebase succeeds but the database registration fails (for
          example captcha), you may have an auth user without a KenManage profile. Try logging in
          again or contact support if finish-signup never appears.
        </p>
      </Callout>

      <h2 id="clubs">3. Clubs</h2>
      <p>
        Clubs are user-scoped and reused across your tournaments. Manage them at{" "}
        <Link href="/clubs">/clubs</Link>.
      </p>
      <ul>
        <li>
          <strong>Required fields:</strong> name and abbreviation.
        </li>
        <li>Optional: country, representative, contact email.</li>
        <li>
          Players must belong to a club. When you import an Excel roster, you pick the club in the
          import wizard (it is not read from the sheet).
        </li>
        <li>
          Accounts registered with country Canada may receive a set of default clubs on signup.
        </li>
      </ul>
      <Callout tone="warn">
        <p>
          You cannot delete a club that still has players or teams attached. Move or delete those
          first.
        </p>
      </Callout>
      <Shot label="Screenshot: clubs list and add-club form" />

      <h2 id="create-tournament">4. Create a tournament</h2>
      <p>
        From the tournament list (<code>/</code>), use <strong>Create tournament</strong>. Required
        fields:
      </p>
      <ul>
        <li>Name</li>
        <li>Organizer</li>
        <li>Start time</li>
        <li>Location</li>
        <li>Description</li>
      </ul>
      <p>
        On create, KenManage also sets a dashboard endpoint (URL slug derived from the name), a
        dashboard preview token, and default team categories (for example Mixed, Womens, U18 Mixed).
        The scorekeeper token is <em>not</em> created until you generate one in Settings.
      </p>
      <p>Inside a tournament, the sidebar covers:</p>
      <ul>
        <li>Participants (Players / Teams)</li>
        <li>Divisions</li>
        <li>Schedule</li>
        <li>Scores</li>
        <li>Results</li>
        <li>Settings</li>
      </ul>
      <Shot label="Screenshot: create tournament modal and tournament home" />
      <Callout>
        <p>
          Organizer, location, and description are set at creation. Later edits focus on Settings
          (name, start time, codes, logo, archive). Plan those create-time fields carefully.
        </p>
      </Callout>

      <h2 id="settings-codes">5. Settings and sharing codes</h2>
      <p>
        Open <strong>Settings</strong> for the tournament. This is where you publish the public site
        and hand out access codes.
      </p>
      <h3>Participant code (dashboard endpoint)</h3>
      <p>
        The participant code is the slug in <code>/t/&#123;endpoint&#125;</code>. Share that path (or
        the join flow at <Link href="/join">/join</Link>) with competitors and spectators. Copy the
        link from Settings when ready. The participant site works best on a phone — tell people to
        open it on mobile when you share the code.
      </p>
      <h3>Publish vs preview</h3>
      <ul>
        <li>
          <strong>Published</strong> (<code>dashboard_public</code>): anyone with the slug can view
          the public pages.
        </li>
        <li>
          <strong>Unpublished</strong>: the public site needs a preview query parameter,{" "}
          <code>?preview=&#123;token&#125;</code>. You can regenerate the preview token; old preview
          links stop working immediately.
        </li>
      </ul>
      <h3>Scorekeeper code</h3>
      <p>
        Create, copy, rotate, or disable the scorekeeper token in Settings. Scorekeepers redeem it at{" "}
        <Link href="/scorekeeping">/scorekeeping</Link> (plus their name). Rotating or disabling
        invalidates previous codes immediately.
      </p>
      <Shot label="Screenshot: Settings with participant link, publish toggle, and scorekeeper code" />
      <Callout tone="warn">
        <p>
          <strong>Two different codes.</strong> The participant code opens the read-only public site.
          The scorekeeper code unlocks score entry only. Do not mix them up when briefing staff.
        </p>
      </Callout>
      <h3>Logo, archive, delete</h3>
      <ul>
        <li>Upload a tournament logo for cards and public pages.</li>
        <li>Archive moves the tournament to the Archived section on the home list; you can restore it.</li>
        <li>Delete permanently removes the tournament (confirm carefully).</li>
      </ul>

      <h2 id="players">6. Players</h2>
      <p>
        Go to <strong>Participants → Players</strong>. KenManage expects you to import a spreadsheet
        <em> first</em>: that import defines the player field schema for the tournament. After fields
        exist, you can add players by hand.
      </p>
      <h3>Excel import</h3>
      <ol>
        <li>Choose the club these rows belong to.</li>
        <li>Pick the sheet and confirm headers.</li>
        <li>Map columns to KenManage fields (name is required; First + Last can combine).</li>
        <li>Review duplicates and confirm create.</li>
      </ol>
      <p>
        Empty name rows stop the import. Later imports must still include headers marked{" "}
        <code>import_required</code> in field configuration. Re-importing a file name you already
        used may show a local warning.
      </p>
      <h3>Configure fields</h3>
      <p>
        Use field configuration to include or exclude columns, set type (text, checkbox, number,
        dropdown), options, and whether a column is required on import. Custom data is stored per
        player alongside name, club, optional code, and wins.
      </p>
      <h3>Manual add, export, delete</h3>
      <ul>
        <li>Add individual players only after the schema exists.</li>
        <li>Export all data as CSV.</li>
        <li>Bulk-delete selected players when needed.</li>
      </ul>
      <h3>Player codes</h3>
      <p>
        Optional player codes are assigned when players are attached to a division that uses a
        prefix (for example prefix <code>E</code> → <code>E01</code>, <code>E02</code>, …). Codes are
        unique within the tournament. Participants can look themselves up by name or code on the
        public site.
      </p>
      <Shot label="Screenshot: Excel import mapping step" />
      <Callout>
        <p>
          <strong>Strong player bias</strong> is not a column on the player. You mark biased players
          in the bracket-generation wizard; bias is stored on the player–division link.
        </p>
      </Callout>

      <h2 id="teams">7. Teams</h2>
      <p>
        For team divisions, open <strong>Participants → Teams</strong>. Teams are built from players
        already in the tournament.
      </p>
      <ul>
        <li>
          Team “name” is the team <strong>code</strong> (max length 30).
        </li>
        <li>Assign a category (defaults are created with the tournament; you can configure more).</li>
        <li>Attach players and kendo positions (Senpo, Jihou, Chuken, Fukushou, Taisho) as needed.</li>
        <li>A team can span multiple clubs; the primary club is used for seeding heuristics.</li>
        <li>You need at least one player in the tournament before creating a useful roster.</li>
      </ul>
      <p>
        Team bias for seeding is chosen when you generate team brackets (selected team IDs), not as a
        permanent team field.
      </p>
      <Shot label="Screenshot: team editor with roster and positions" />

      <h2 id="brackets-individuals">8. Create divisions and brackets (individuals)</h2>
      <p>
        Divisions are created from the Players page via <strong>Generate brackets</strong> (with
        selected players), not from an empty “new division” form on the Divisions page. The Divisions
        page is where you review and edit trees afterward.
      </p>
      <h3>Wizard steps</h3>
      <ol>
        <li>Select players (respecting any table filters) and start generation.</li>
        <li>Confirm the count and applied filters.</li>
        <li>Optionally mark strong players (bias).</li>
        <li>
          Enter division name, optional code prefix, bracket size combination, match duration, and
          margin. Defaults are often <strong>3 minutes</strong> duration and <strong>1 minute</strong>{" "}
          margin.
        </li>
        <li>
          KenManage creates the division, attaches players (with bias), assigns codes if a prefix is
          set, runs client-side seeding, and saves brackets.
        </li>
      </ol>
      <h3>Bracket sizes</h3>
      <ul>
        <li>Allowed group sizes: 8–16 players.</li>
        <li>Number of groups must be a power of 2 (1, 2, 4, 8, …).</li>
        <li>Sizes in a combination stay roughly equal (spread at most 3).</li>
      </ul>
      <Shot label="Screenshot: generate-brackets wizard (bias and timing steps)" />

      <h2 id="seeding-individuals">9. Seeding algorithm (individuals)</h2>
      <p>
        Seeding runs in the browser, then brackets are posted to the API. Goals: keep biased
        (“strong”) players apart, and reduce same-club matchups as much as practical.
      </p>
      <h3>Distribute into groups</h3>
      <p>Biased players are placed first. For each candidate group, KenManage scores:</p>
      <pre>
        <code>{`score = capacityLeft × 100
      − neighborStrongClubConflict × 20
      − sameGroupStrongClubConflict × 10
      − clubLoad × 3`}</code>
      </pre>
      <p>
        Non-biased players then fill remaining capacity with a simpler score that heavily penalizes
        putting many players from the same club in one group:
      </p>
      <pre>
        <code>{`score = −clubLoad × 100 + capacityLeft`}</code>
      </pre>
      <h3>Byes and order inside a bracket</h3>
      <p>
        Each size has a fixed bye count (for example size 9 → 1 bye, size 10 → 6 byes). Bye quota per
        club uses largest remainder so clubs share byes fairly. When ordering slots, byes prefer
        biased players and clubs still under quota; strong players are interleaved; adjacent slots
        prefer different clubs.
      </p>
      <Callout>
        <p>
          Seeding is heuristic, not a perfect solver. After generation, review the Divisions editor
          and swap slots if a club collision still looks wrong for your event.
        </p>
      </Callout>

      <h2 id="brackets-teams">10. Brackets (teams)</h2>
      <p>
        From Teams, generate brackets with a similar wizard (no player-code prefix). Allowed team
        group sizes are 6–16 except 15. Group count and balance rules mirror individuals.
      </p>
      <p>
        Team codes like <code>JCC A</code> are parsed into a club identity plus a tier letter when
        possible. Placement prefers spreading clubs and tiers; biased teams are placed with extra
        penalties for stacking bias in the same group. Rough score shape:
      </p>
      <pre>
        <code>{`score = capacity × 50
      − sameGroupClubLoad × 30
      − neighborClubConflict × 25
      − A-tierPenalty − biasPenalty
      + smallRandom`}</code>
      </pre>
      <Shot label="Screenshot: team bracket groups after generation" />

      <h2 id="edit-brackets">11. Edit brackets</h2>
      <p>
        On <strong>Divisions</strong>, open a division to swap players or teams between slots, save,
        or regenerate all brackets (<code>replace=true</code>).
      </p>
      <h3>Division lock</h3>
      <p>
        After the first real score is saved in a division, the roster and seeding lock. Attach,
        detach, and reseeding return an error until you <strong>Unlock</strong> on the Scores page.
        Unlocking clears scored cells for that division — treat it as destructive.
      </p>
      <Callout tone="warn">
        <p>
          Finish seeding and exports before anyone enters live scores. Unlocking mid-day wipes match
          results for that division.
        </p>
      </Callout>
      <Shot label="Screenshot: bracket editor with swap and save" />

      <h2 id="schedule">12. Schedule and courts</h2>
      <p>
        Open <strong>Schedule</strong>. Add every court by name first, then place division blocks on
        the timetable.
      </p>
      <h3>Block length estimate</h3>
      <p>Each group becomes a schedule block. Length is estimated as single-elimination:</p>
      <pre>
        <code>{`matches = N − 1
raw = (durationMins + marginMins) × matches
blockMins = max(10, round(raw / 10) × 10)`}</code>
      </pre>
      <p>
        Example: 9 players, 3 min match + 1 min margin → (3+1)×8 = 32 → snaps to 30 minutes. You can
        still resize blocks on the grid; the estimate is the starting length.
      </p>
      <h3>Editing the grid</h3>
      <ul>
        <li>Drag blocks between courts and times; resize duration.</li>
        <li>Add custom breaks (auto-assign leaves custom blocks in place).</li>
        <li>
          <strong>Auto-assign</strong> packs unscheduled division blocks (longest first) and avoids
          overlapping the same division; it clears previous division placements.
        </li>
        <li>Overlapping blocks on a court are rejected; touching end-to-start is allowed.</li>
        <li>
          Day start/end hours are stored in the browser (localStorage), defaulting around 09:00–17:00.
          Saving the timetable replaces the server copy for the whole tournament.
        </li>
      </ul>
      <Shot label="Screenshot: court timetable with dragged blocks" />
      <Callout>
        <p>
          Leaving the page with unsaved schedule changes prompts you to stay. Save before sharing
          the public schedule.
        </p>
      </Callout>

      <h2 id="publish-day">13. Publish and run the day</h2>
      <h3>Public participant site</h3>
      <p>
        With the participant code (and publish or preview as needed), people open pages under{" "}
        <code>/t/&#123;slug&#125;</code>: home, matches lookup, participants, schedule, brackets,
        scores, about. The experience is designed for phones. Preview links must keep the{" "}
        <code>?preview=</code> query when navigating.
      </p>
      <h3>Scorekeepers</h3>
      <ol>
        <li>Share the scorekeeper code from Settings.</li>
        <li>
          They open <Link href="/scorekeeping">/scorekeeping</Link>, enter the code and their name.
        </li>
        <li>
          Access is stored in the browser session for that tab; closing the tab loses access until
          they redeem again.
        </li>
        <li>They only see Scores for that tournament — not Settings, seeding, or other tools.</li>
      </ol>
      <h3>Entering scores</h3>
      <ul>
        <li>
          Edit a group → claim a soft edit lock → fill cells → Save or Cancel. Heartbeats keep the
          lock; only one editor should work a sheet at a time.
        </li>
        <li>
          Kendo result marks commonly include M, K, D, T, H, I, and blank/-. Use the on-page legend.
        </li>
        <li>Finals appear when the division has enough groups and a supported size.</li>
      </ul>
      <Shot label="Screenshot: scores page with group edit lock" />
      <Callout tone="warn">
        <p>
          Brief scorekeepers: one person edits a group sheet at a time. A second scorekeeper cannot
          overwrite that sheet until it is free.
        </p>
      </Callout>

      <h2 id="end-tournament">14. End of tournament</h2>
      <ul>
        <li>Confirm all scores are saved and the public board looks correct.</li>
        <li>Announce winners from brackets/scores as you prefer for your event format.</li>
        <li>
          Archive the tournament from Settings when you are done so it moves off the active home
          list.
        </li>
      </ul>
      <Callout>
        <p>
          The in-app <strong>Results</strong> area is not a full standings product yet. Do not rely
          on it alone for published placements. Team bout-by-bout scoring (senpo, jiho, …) is also
          not fully shipped — treat team scores accordingly.
        </p>
      </Callout>

      <h2 id="exports">15. Exports</h2>
      <ul>
        <li>
          <strong>Bracket Excel:</strong> from Divisions, export using size-specific templates
          (tested sizes include 9, 10, 12, 14, 15, 16). Missing templates error clearly — use a
          supported size.
        </li>
        <li>
          <strong>Roster CSV:</strong> Export All Data from Players or Teams.
        </li>
      </ul>
      <p>Exports are generated in the browser; there is no separate server export job.</p>
      <Shot label="Screenshot: division export to Excel" />

      <h2 id="api">16. API for organizers</h2>
      <p>
        Interactive OpenAPI (Swagger) lives at{" "}
        <a href={apiDocsUrl} target="_blank" rel="noreferrer">
          {apiDocsUrl}
        </a>
        .
      </p>
      <h3>Authentication</h3>
      <ul>
        <li>
          <strong>Organizer API calls:</strong> Firebase ID token as{" "}
          <code>Authorization: Bearer …</code>. There is no long-lived organizer API key in Settings.
        </li>
        <li>
          <strong>Scorekeeper:</strong> header <code>X-Scorekeeper-Token</code> (and{" "}
          <code>X-Edit-Session-Id</code> when editing).
        </li>
        <li>
          <strong>Public dashboard:</strong> no auth when published; otherwise{" "}
          <code>?preview=</code> on public routes.
        </li>
      </ul>
      <Callout tone="warn">
        <p>
          Tournament participant and scorekeeper codes are <em>not</em> substitutes for the Firebase
          Bearer token. Scripts that act as an organizer must sign in and send a fresh ID token.
        </p>
      </Callout>
      <h3>Endpoint map (high level)</h3>
      <ul>
        <li>
          <code>/users/…</code> — register, me, profile, password
        </li>
        <li>
          <code>/clubs</code> — CRUD clubs
        </li>
        <li>
          <code>/tournaments</code> — list/create; <code>/tournaments/&#123;id&#125;</code> — get/update/delete,
          logo, status, preview token, scorekeeper token
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/players</code>, <code>/players_fields</code>, player codes
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/teams</code>, team categories
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/divisions</code> — CRUD, attach players/teams, lock status
        </li>
        <li>
          <code>/…/brackets</code>, <code>/…/brackets/teams</code> — save/replace trees
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/courts</code>, <code>/schedule_timetable</code>
        </li>
        <li>
          <code>/divisions/&#123;id&#125;/bracket-cells</code> (and team variant) — scores
        </li>
        <li>
          <code>/public/tournaments/&#123;endpoint&#125;</code> — public reads
        </li>
        <li>
          <code>/scorekeeping/redeem</code> — exchange scorekeeper code for session access
        </li>
      </ul>
      <h3>Common API failures</h3>
      <ul>
        <li>
          <strong>401</strong> — missing/expired Firebase token or invalid scorekeeper token.
        </li>
        <li>
          <strong>403</strong> — not the tournament owner (or public/preview rules not met).
        </li>
        <li>
          <strong>409</strong> — division locked (scores already entered); unlock or clear scores
          first.
        </li>
        <li>
          Validation errors on attach/create when max teams/courts or schema rules fail.
        </li>
      </ul>
      <Shot label="Screenshot: Swagger UI at /docs with Authorize" />

      <h2 id="troubleshooting">17. Troubleshooting</h2>
      <ol>
        <li>
          <strong>Cannot add players manually</strong> — import Excel once so player fields exist.
        </li>
        <li>
          <strong>Import fails on name</strong> — every row needs a name (or First+Last). Empty names
          abort the import.
        </li>
        <li>
          <strong>Wrong club on import</strong> — club comes from the picker, not the spreadsheet.
        </li>
        <li>
          <strong>Cannot change brackets</strong> — division is locked after the first score. Unlock
          on Scores (clears cells) or fix scores without reseeding.
        </li>
        <li>
          <strong>Scorekeeper cannot edit</strong> — confirm the code is current (not rotated), they
          redeemed in this browser tab, and another editor does not hold the group lock.
        </li>
        <li>
          <strong>Public site 404 / empty</strong> — check slug, publish flag, and preview token if
          unpublished.
        </li>
        <li>
          <strong>Schedule overlaps rejected</strong> — move or shorten blocks; touching edges is OK,
          overlapping times on one court is not.
        </li>
        <li>
          <strong>Block times look too long/short</strong> — check duration/margin and the{" "}
          <code>N−1</code> estimate; resize manually if your format differs.
        </li>
        <li>
          <strong>Excel export fails</strong> — use a bracket size with a shipped template.
        </li>
        <li>
          <strong>Two organizers editing at once</strong> — the app does not specially merge
          concurrent organizer edits. Coordinate, or prefer one laptop for structural changes.
        </li>
        <li>
          <strong>API 401 from a script</strong> — refresh the Firebase ID token; do not send the
          participant or scorekeeper code as Bearer.
        </li>
      </ol>
      <p>
        Still stuck? See the <Link href="/faq">FAQ</Link> or <Link href="/contact">Contact</Link>.
      </p>
    </div>
  );
}
