
import Link from "next/link";
import React from "react";

import { getBaseApiUrl } from "../../services/adapter";
import classes from "../landing/landing.module.css";

export const USAGE_GUIDE_TOC = [
  { id: "before-you-start", label: "Getting started" },
  { id: "account", label: "Create your account" },
  { id: "clubs", label: "Set up your clubs" },
  { id: "create-tournament", label: "Create a tournament" },
  { id: "settings-codes", label: "Tournament settings & access codes" },
  { id: "players", label: "Import & manage players" },
  { id: "teams", label: "Build team rosters" },
  { id: "brackets-individuals", label: "Generate individual brackets" },
  { id: "seeding-individuals", label: "Understand individual seeding" },
  { id: "brackets-teams", label: "Generate team brackets" },
  { id: "edit-brackets", label: "Review & edit brackets" },
  { id: "schedule", label: "Schedule courts & matches" },
  { id: "publish-day", label: "Publish & run tournament day" },
  { id: "end-tournament", label: "Wrap up your tournament" },
  { id: "exports", label: "Export tournament data" },
  { id: "api", label: "API reference" },
  { id: "troubleshooting", label: "Troubleshooting & FAQ" },
] as const;

function Shot({ label }: { label: string }) {
  return (
    <figure className={classes.shot}>
      <div
        className={classes.shotFrame}
        role="img"
        aria-label={`Screenshot placeholder: ${label}`}
      >
        Screenshot coming soon
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
      <h2 id="before-you-start">1. Getting started</h2>
      <p>
        Welcome to KenManage! This guide walks you through the complete
        tournament management process — from creating your account and
        importing players to generating brackets, scheduling courts, and
        managing scores on tournament day.
      </p>
      <p>
        Before diving in, it helps to understand the three roles in
        KenManage:
      </p>
      <ul>
        <li>
          <strong>Organizer:</strong> Creates and manages tournaments.
          An account is required, and organizers have full control over
          their tournament data and settings.
        </li>
        <li>
          <strong>Participant:</strong> Views tournament information without
          creating an account. Participants use a code or link provided by
          the organizer to access the public tournament site at{" "}
          <code>/t/&#123;participant_code&#125;</code>.
        </li>
        <li>
          <strong>Scorekeeper:</strong> Enters match results using a
          separate access code. No account is required. Scorekeepers can
          only edit scores for the tournament associated with their code.
          Access the scorekeeping portal at{" "}
          <Link href="/scorekeeping">/scorekeeping</Link>.
        </li>
      </ul>

      <Callout>
        <p>
          <strong>Recommended workflow:</strong> Create your account →
          set up clubs → create a tournament → import players → build
          teams (if applicable) → generate brackets → schedule courts →
          publish the tournament → distribute access codes → enter scores.
        </p>
      </Callout>

      <h2 id="account">2. Create your account</h2>
      <p>
        Start by creating an organizer account. Visit{" "}
        <Link href="/register">Register</Link> to sign up, or{" "}
        <Link href="/login">Log in</Link> if you already have an account.
      </p>

      <p>
        If this is your first time signing in, you'll be asked to select your country
        to complete your profile before being redirected to the
        tournament dashboard.
      </p>

      <Shot label="Registration and login screens" />

      <Callout tone="warn">
        <p>
          <strong>Having trouble completing registration?</strong> In
          some cases, Firebase authentication may succeed even if
          creating your KenManage profile fails (for example, due to
          captcha verification). You may end up with an authentication
          account but no application profile. Try logging in again.
          If you cannot complete signup, contact support.
        </p>
      </Callout>

      <h2 id="clubs">3. Set up your clubs</h2>
      <p>
        Clubs help organize players and are used by KenManage's
        bracket-seeding algorithm to reduce same-club matchups.
        Your clubs are associated with your organizer account and
        can be reused across multiple tournaments.
      </p>
      <p>
        Visit <Link href="/clubs">Clubs</Link> to create and manage
        your club list.
      </p>

      <h3>Adding a club</h3>
      <ul>
        <li>
          <strong>Required:</strong> Club name and abbreviation.
        </li>
        <li>
          <strong>Optional:</strong> Country, representative, and
          contact email.
        </li>
      </ul>

      <h3>How clubs are used</h3>
      <ul>
        <li>Players must be associated with a club.</li>
        <li>
          During Excel import, you'll select the club associated
          with the imported players.
        </li>
        <li>
          Club information is used when generating brackets to
          help distribute players from the same club across groups.
        </li>
        <li>
          Organizers registering with Canada as their country may
          receive a set of default clubs during signup.
        </li>
      </ul>

      <Callout tone="warn">
        <p>
          <strong>Before deleting a club:</strong> KenManage won't
          allow you to delete a club that still has players or teams
          attached. Move or delete those records first.
        </p>
      </Callout>

      <Shot label="Club list and add-club form" />

      <h2 id="create-tournament">4. Create a tournament</h2>
      <p>
        Once your account and clubs are ready, it's time to create
        your first tournament.
      </p>
      <p>
        From your tournament dashboard, select{" "}
        <strong>Create tournament</strong> and fill in the required
        information:
      </p>
      <ul>
        <li>Tournament name</li>
        <li>Organizer</li>
        <li>Start time</li>
        <li>Location</li>
        <li>Description</li>
      </ul>

      <h3>What happens when you create a tournament?</h3>
      <p>
        KenManage automatically prepares several tournament resources:
      </p>
      <ul>
        <li>A dashboard endpoint (URL slug derived from the tournament name).</li>
        <li>A dashboard preview token.</li>
        <li>Default team categories, such as Mixed, Womens, and U18 Mixed.</li>
      </ul>
      <p>
        The scorekeeper access token is generated separately from
        Settings when you're ready to distribute scorekeeping access.
      </p>

      <h3>Inside your tournament</h3>
      <p>
        Each tournament has a sidebar that gives you access to its
        main management areas:
      </p>
      <ul>
        <li><strong>Participants:</strong> Manage individual players and teams.</li>
        <li><strong>Divisions:</strong> Create and manage competition brackets.</li>
        <li><strong>Schedule:</strong> Organize courts and match times.</li>
        <li><strong>Scores:</strong> Enter and manage match results.</li>
        <li><strong>Results:</strong> View tournament results.</li>
        <li><strong>Settings:</strong> Manage tournament information and access.</li>
      </ul>

      <Shot label="Create tournament form and tournament dashboard" />

      <Callout>
        <p>
          <strong>Plan your tournament details carefully.</strong>{" "}
          Organizer, location, and description are configured during
          creation. Later Settings edits focus on the tournament name,
          start time, access codes, logo, and archive status.
        </p>
      </Callout>

      <h2 id="settings-codes">5. Tournament settings & access codes</h2>
      <p>
        Open <strong>Settings</strong> inside your tournament to
        configure its public presence and manage access for
        participants and scorekeepers.
      </p>

      <h3>Participant access</h3>
      <p>
        Every tournament has a participant-facing dashboard endpoint.
        This endpoint forms the public URL:
      </p>
      <pre>
        <code>{`/t/{endpoint}`}</code>
      </pre>
      <p>
        Share this link with competitors and spectators so they can
        access tournament information. You can also direct participants
        to <Link href="/join">Join a Tournament</Link> to enter their
        tournament code.
      </p>
      <p>
        The participant site is optimized for mobile devices, making
        it easy to check match schedules, brackets, and scores
        throughout the day.
      </p>

      <h3>Publish your tournament</h3>
      <p>
        You can publish your public tournament site or keep it
        unpublished while preparing the event.
      </p>
      <ul>
        <li>
          <strong>Published:</strong> When{" "}
          <code>dashboard_public</code> is enabled, anyone with
          the participant URL can view the public pages.
        </li>
        <li>
          <strong>Unpublished:</strong> The public site can only
          be accessed using a preview link containing{" "}
          <code>?preview=&#123;token&#125;</code>.
        </li>
      </ul>
      <p>
        You can regenerate the preview token at any time. Doing so
        immediately invalidates previously generated preview links.
      </p>

      <h3>Scorekeeper access</h3>
      <p>
        Scorekeepers use a separate access code to enter match results.
        From Settings, you can create, copy, rotate, or disable
        the scorekeeper token.
      </p>
      <ol>
        <li>Generate a scorekeeper code in Settings.</li>
        <li>Share the code with your scorekeeping team.</li>
        <li>
          Scorekeepers visit{" "}
          <Link href="/scorekeeping">/scorekeeping</Link>, enter
          the code, and provide their name.
        </li>
      </ol>
      <p>
        Rotating or disabling the token immediately invalidates
        previously issued codes.
      </p>

      <Shot label="Tournament settings, publishing controls, and access codes" />

      <Callout tone="warn">
        <p>
          <strong>Keep the two codes separate!</strong>
        </p>
        <ul>
          <li>
            Participant code: grants read-only access to the public
            tournament site.
          </li>
          <li>
            Scorekeeper code: grants access to enter match results.
          </li>
        </ul>
        Make sure you distribute the correct code to each group.
      </Callout>

      <h3>Logo, archive, and delete</h3>
      <ul>
        <li>
          <strong>Logo:</strong> Upload a tournament logo to display
          on tournament cards and public pages.
        </li>
        <li>
          <strong>Archive:</strong> Move a completed tournament
          to the Archived section of your dashboard. Archived
          tournaments can be restored.
        </li>
        <li>
          <strong>Delete:</strong> Permanently remove a tournament.
          This action requires confirmation.
        </li>
      </ul>

      <h2 id="players">6. Import & manage players</h2>
      <p>
        Navigate to <strong>Participants → Players</strong> to
        manage your tournament roster.
      </p>
      <p>
        <strong>Start by importing an Excel spreadsheet.</strong>{" "}
        Your first import establishes the player field schema for
        the tournament. Once the fields have been created, you
        can also add individual players manually.
      </p>

      <h3>Import players from Excel</h3>
      <ol>
        <li>Select the club associated with the players in your spreadsheet.</li>
        <li>Choose the Excel worksheet you want to import.</li>
        <li>Confirm the spreadsheet headers.</li>
        <li>
          Map spreadsheet columns to KenManage player fields.
          The player name is required; separate First and Last
          columns can be combined.
        </li>
        <li>Review potential duplicates and confirm the import.</li>
      </ol>

      <h3>Import considerations</h3>
      <ul>
        <li>
          Rows with empty player names will stop the import.
        </li>
        <li>
          Subsequent imports must include headers marked{" "}
          <code>import_required</code> in the field configuration.
        </li>
        <li>
          Re-importing a previously used filename may trigger
          a local warning.
        </li>
      </ul>

      <h3>Customize player fields</h3>
      <p>
        Use field configuration to customize the information
        collected for each player. You can:
      </p>
      <ul>
        <li>Include or exclude spreadsheet columns.</li>
        <li>Choose a field type: text, checkbox, number, or dropdown.</li>
        <li>Configure dropdown options.</li>
        <li>Mark fields as required during import.</li>
      </ul>
      <p>
        Custom fields are stored alongside each player's name,
        club, optional player code, and wins.
      </p>

      <h3>Manual entry and data management</h3>
      <ul>
        <li>Add individual players after establishing the field schema.</li>
        <li>Export the complete player dataset as CSV.</li>
        <li>Select and bulk-delete players when necessary.</li>
      </ul>

      <h3>Player codes</h3>
      <p>
        Player codes are optional and can be automatically assigned
        when players are attached to a division with a code prefix.
        For example, a prefix of <code>E</code> generates:
      </p>
      <pre>
        <code>{`E01, E02, E03, ...`}</code>
      </pre>
      <p>
        Codes are unique within the tournament. Participants can
        use their name or player code to find their matches on
        the public tournament site.
      </p>

      <Shot label="Excel import and column-mapping wizard" />

      <Callout>
        <p>
          <strong>About strong-player bias:</strong> This is not
          a permanent player field. You select strong players
          during the bracket-generation process. The bias is
          associated with that player's division entry.
        </p>
      </Callout>

      <h2 id="teams">7. Build team rosters</h2>
      <p>
        For team competitions, navigate to{" "}
        <strong>Participants → Teams</strong>.
        Teams are assembled from players already registered
        in your tournament.
      </p>

      <h3>Create and configure teams</h3>
      <ul>
        <li>
          <strong>Team name:</strong> Used as the team code
          (maximum 30 characters).
        </li>
        <li>
          <strong>Category:</strong> Assign a category such as
          Mixed or Womens. Default categories are created with
          the tournament, and additional categories can be configured.
        </li>
        <li>
          <strong>Roster:</strong> Add registered players to
          the team.
        </li>
        <li>
          <strong>Positions:</strong> Assign kendo positions
          such as Senpo, Jihou, Chuken, Fukushou, and Taisho.
        </li>
      </ul>

      <h3>Team and club relationships</h3>
      <p>
        Teams can include players from multiple clubs. When
        generating team brackets, KenManage uses the team's
        primary club for seeding heuristics.
      </p>
      <p>
        You'll need at least one registered player before
        you can build a useful team roster.
      </p>

      <h3>Team seeding bias</h3>
      <p>
        Strong-team bias is selected during team bracket
        generation. It is not stored as a permanent team
        property.
      </p>

      <Shot label="Team editor with roster and kendo positions" />

      <h2 id="brackets-individuals">8. Generate individual brackets</h2>
      <p>
        Once your player roster is ready, you can generate
        individual divisions and their brackets.
      </p>
      <p>
        Start from <strong>Participants → Players</strong>,
        select the players you want to include, and choose{" "}
        <strong>Generate brackets</strong>.
      </p>
      <p>
        You don't create an empty division directly from the
        Divisions page. Instead, the bracket-generation wizard
        creates the division and its brackets together. You can
        review and edit them afterward from <strong>Divisions</strong>.
      </p>

      <h3>Bracket-generation wizard</h3>
      <ol>
        <li>
          <strong>Select players:</strong> Select the players
          to include. Active table filters are respected.
        </li>
        <li>
          <strong>Confirm selection:</strong> Review the player
          count and applied filters.
        </li>
        <li>
          <strong>Mark strong players (optional):</strong> Identify
          players who should receive special consideration during
          seeding.
        </li>
        <li>
          <strong>Configure the division:</strong> Enter a division
          name, optional player-code prefix, bracket-size combination,
          match duration, and margin.
        </li>
        <li>
          <strong>Generate:</strong> KenManage creates the division,
          attaches players, assigns codes if a prefix is configured,
          runs the seeding algorithm, and saves the resulting brackets.
        </li>
      </ol>
      <p>
        The default match duration is typically 3 minutes, with
        a 1-minute margin.
      </p>

      <h3>Bracket size requirements</h3>
      <ul>
        <li>Each individual group supports 8–16 players.</li>
        <li>
          The number of groups must be a power of two:
          1, 2, 4, 8, and so on.
        </li>
        <li>
          Group sizes in a combination should remain reasonably
          balanced, with a maximum difference of 3 players.
        </li>
      </ul>

      <Shot label="Individual bracket-generation wizard and seeding options" />

      <h2 id="seeding-individuals">9. Understand individual seeding</h2>
      <p>
        KenManage uses a custom heuristic to distribute players
        across bracket groups. The algorithm runs in the browser,
        and the generated brackets are then saved through the API.
      </p>
      <p>Its main goals are to:</p>
      <ul>
        <li>Keep designated strong players apart where possible.</li>
        <li>Reduce same-club matchups within groups.</li>
        <li>Distribute players across available bracket slots.</li>
        <li>Maintain reasonable balance between groups.</li>
      </ul>

      <h3>Step 1: Distribute players into groups</h3>
      <p>
        Strong players are placed first. For each candidate group,
        the algorithm evaluates available capacity, potential
        conflicts between strong players, and club distribution.
      </p>
      <pre>
        <code>{`score = capacityLeft × 100
      − neighborStrongClubConflict × 20
      − sameGroupStrongClubConflict × 10
      − clubLoad × 3`}</code>
      </pre>
      <p>
        Remaining players are then assigned using a simpler
        score that prioritizes separating players from the
        same club:
      </p>
      <pre>
        <code>{`score = −clubLoad × 100 + capacityLeft`}</code>
      </pre>

      <h3>Step 2: Assign byes and arrange bracket positions</h3>
      <p>
        Each bracket size has a predefined number of byes.
        For example:
      </p>
      <ul>
        <li>9-player bracket: 1 bye.</li>
        <li>10-player bracket: 6 byes.</li>
      </ul>
      <p>
        Bye allocation across clubs uses the largest-remainder
        method to distribute byes proportionally. During slot
        ordering, the algorithm also considers:
      </p>
      <ul>
        <li>Giving byes to strong players where appropriate.</li>
        <li>Distributing byes across clubs according to their quotas.</li>
        <li>Interleaving strong players throughout the bracket.</li>
        <li>Placing players from different clubs in adjacent slots where possible.</li>
      </ul>

      <Callout>
        <p>
          <strong>Important:</strong> Seeding is heuristic, not
          a guarantee of perfect separation or fairness. Always
          review the generated brackets before publishing them.
          You can manually swap positions in the Divisions editor
          to make adjustments for your tournament.
        </p>
      </Callout>

      <h2 id="brackets-teams">10. Generate team brackets</h2>
      <p>
        Team brackets follow a workflow similar to individual
        brackets. Start from the Teams page and use the bracket
        generation wizard to select teams and configure the draw.
      </p>
      <p>
        Unlike individual brackets, team generation does not
        require a player-code prefix.
      </p>

      <h3>Team bracket requirements</h3>
      <ul>
        <li>Supported group sizes are 6–16 teams, excluding 15.</li>
        <li>Group counts and balancing rules follow the same general principles as individual brackets.</li>
      </ul>

      <h3>How team seeding works</h3>
      <p>
        KenManage attempts to identify club and tier information
        from team codes. For example, a code such as{" "}
        <code>JCC A</code> may be interpreted as a club identity
        and tier.
      </p>
      <p>
        The algorithm considers club distribution, team tiers,
        and designated strong teams when selecting placements.
        Its scoring includes:
      </p>
      <pre>
        <code>{`score = capacity × 50
      − sameGroupClubLoad × 30
      − neighborClubConflict × 25
      − A-tierPenalty − biasPenalty
      + smallRandom`}</code>
      </pre>

      <Shot label="Generated team brackets and group assignments" />

      <h2 id="edit-brackets">11. Review & edit brackets</h2>
      <p>
        After generating brackets, open <strong>Divisions</strong>{" "}
        to review the draw and make any necessary adjustments.
      </p>
      <h3>Editing bracket placements</h3>
      <ul>
        <li>Open the division you want to edit.</li>
        <li>Swap players or teams between bracket slots.</li>
        <li>Review the updated bracket.</li>
        <li>Save your changes.</li>
        <li>
          Regenerate all brackets if needed using the replace
          operation (<code>replace=true</code>).
        </li>
      </ul>

      <h3>Division locks and scored brackets</h3>
      <p>
        KenManage protects completed tournament data by locking
        a division after its first real match score is saved.
        Once locked, changes to the roster and seeding are
        restricted.
      </p>
      <p>
        To make structural changes, you must first unlock the
        division from the Scores page.
      </p>

      <Callout tone="warn">
        <p>
          <strong>Unlocking a division clears its scored cells.</strong>{" "}
          This is a destructive operation. Finish reviewing your
          brackets and exporting any required materials before
          scorekeeping begins. Avoid unlocking divisions during
          tournament day unless you're prepared to re-enter
          the affected results.
        </p>
      </Callout>

      <Shot label="Bracket editor with player swapping and save controls" />

      <h2 id="schedule">12. Schedule courts & matches</h2>
      <p>
        With your brackets ready, you can organize when and where
        each group competes.
      </p>
      <p>
        Open <strong>Schedule</strong> inside your tournament.
        Start by adding all the courts you plan to use, then
        arrange division blocks on the timetable.
      </p>

      <h3>How match durations are estimated</h3>
      <p>
        KenManage estimates the duration of each group using
        a single-elimination format. The calculation considers
        the number of matches, configured match duration, and
        additional margin time.
      </p>
      <pre>
        <code>{`matches = N − 1
raw = (durationMins + marginMins) × matches
blockMins = max(10, round(raw / 10) × 10)`}</code>
      </pre>
      <p>
        <strong>Example:</strong> A group of 9 players with
        a 3-minute match duration and 1-minute margin requires
        approximately 32 minutes. KenManage rounds this to
        a 30-minute starting estimate.
      </p>
      <p>
        These estimates are starting points. You can resize
        schedule blocks manually to accommodate your event.
      </p>

      <h3>Build your court timetable</h3>
      <ul>
        <li>
          <strong>Drag and drop:</strong> Move division blocks
          between courts and time slots.
        </li>
        <li>
          <strong>Resize:</strong> Adjust the duration of
          individual blocks.
        </li>
        <li>
          <strong>Breaks:</strong> Add custom blocks for breaks
          or other activities. Auto-assign preserves custom blocks.
        </li>
        <li>
          <strong>Auto-assign:</strong> Automatically arrange
          unscheduled division blocks, placing longer blocks
          first and avoiding overlaps within the same division.
        </li>
      </ul>

      <h3>Scheduling rules</h3>
      <ul>
        <li>Two blocks cannot overlap on the same court.</li>
        <li>Back-to-back blocks are allowed.</li>
        <li>Auto-assign clears previous division placements before assigning them again.</li>
        <li>
          Day start and end hours are stored in your browser
          (localStorage), with defaults around 09:00–17:00.
        </li>
        <li>
          Saving the timetable replaces the saved schedule
          for the entire tournament.
        </li>
      </ul>

      <Shot label="Court timetable with draggable division blocks" />

      <Callout>
        <p>
          <strong>Remember to save your schedule.</strong> If you
          leave the page with unsaved changes, KenManage will
          prompt you to stay. Save the timetable before sharing
          the public tournament schedule.
        </p>
      </Callout>

      <h2 id="publish-day">13. Publish & run tournament day</h2>
      <p>
        Your brackets and schedule are ready. Now it's time
        to get participants and scorekeepers connected.
      </p>

      <h3>Share the public participant site</h3>
      <p>
        Participants and spectators can access your public
        tournament site using the participant code generated
        in Settings.
      </p>
      <p>The public site includes:</p>
      <ul>
        <li>Tournament home page and information.</li>
        <li>Match lookup and participant information.</li>
        <li>Competition schedule.</li>
        <li>Individual and team brackets.</li>
        <li>Match scores.</li>
      </ul>
      <p>
        The site is designed for mobile use, so participants
        can easily check their match information throughout
        the day.
      </p>
      <p>
        If your tournament is unpublished, use the preview
        link instead. Make sure the <code>?preview=</code>
        query parameter is preserved when navigating between
        public pages.
      </p>

      <h3>Set up your scorekeepers</h3>
      <ol>
        <li>Copy the scorekeeper code from tournament Settings.</li>
        <li>
          Share the code with your scorekeeping team.
        </li>
        <li>
          Have each scorekeeper visit{" "}
          <Link href="/scorekeeping">/scorekeeping</Link>.
        </li>
        <li>
          They enter the access code and their name to
          start scorekeeping.
        </li>
      </ol>
      <p>
        Scorekeeper access is stored in the browser session
        for that tab. Closing the tab removes access, and
        the scorekeeper must redeem the code again.
      </p>
      <p>
        Scorekeepers only have access to the Scores area
        for their tournament. They cannot access organizer
        tools such as Settings or bracket seeding.
      </p>

      <h3>Enter and update match scores</h3>
      <ol>
        <li>
          Open the relevant group on the Scores page.
        </li>
        <li>
          Claim the group's edit lock before entering results.
        </li>
        <li>
          Fill in the match-result cells.
        </li>
        <li>
          Save your changes or cancel the edit session.
        </li>
      </ol>
      <p>
        KenManage uses a soft edit lock with periodic
        heartbeats to keep track of the active editor.
        Only one scorekeeper should edit a group sheet
        at a time.
      </p>
      <p>
        Common kendo result marks include M, K, D, T, H,
        I, and blank or -. Refer to the on-page legend
        for the supported marks.
      </p>
      <p>
        Finals are displayed when the division has
        sufficient groups and a supported bracket size.
      </p>

      <Shot label="Scorekeeping interface with group editing and match results" />

      <Callout tone="warn">
        <p>
          <strong>Coordinate your scorekeepers.</strong>{" "}
          Assign one person to each group sheet at a time.
          A second scorekeeper cannot edit that sheet while
          another person holds its lock.
        </p>
      </Callout>

      <h2 id="end-tournament">14. Wrap up your tournament</h2>
      <p>
        Once competition finishes, take a moment to verify
        that your tournament records are complete.
      </p>
      <ul>
        <li>Confirm that all match scores have been saved.</li>
        <li>Review the public tournament board for accuracy.</li>
        <li>Announce winners and placements according to your event format.</li>
        <li>
          Archive the tournament from Settings when you're
          finished to move it out of your active tournament list.
        </li>
      </ul>

      <Callout tone="warn">
        <p>
          <strong>Current feature limitations:</strong> The
          in-app Results section is not yet a complete standings
          product. Don't rely on it as the sole source for
          publishing final placements. Team bout-by-bout scoring
          (Senpo, Jihou, Chuken, and other positions) is also
          not fully implemented, so account for this when
          managing team results.
        </p>
      </Callout>

      <h2 id="exports">15. Export tournament data</h2>
      <p>
        KenManage supports exporting tournament information
        so you can keep external records or prepare printed
        materials.
      </p>

      <h3>Bracket exports (Excel)</h3>
      <p>
        From the Divisions page, export individual or team
        brackets using the available size-specific Excel
        templates.
      </p>
      <p>
        Tested bracket sizes include 9, 10, 12, 14, 15,
        and 16. If a template is unavailable for your bracket
        size, KenManage will display an error.
      </p>

      <h3>Roster exports (CSV)</h3>
      <ul>
        <li>Open Participants → Players or Teams.</li>
        <li>Select Export All Data.</li>
        <li>Download the resulting CSV file.</li>
      </ul>
      <p>
        Exports are generated directly in your browser.
        There is no separate server-side export job.
      </p>

      <Shot label="Exporting a bracket to Excel" />

      <h2 id="api">16. API reference</h2>
      <p>
        KenManage provides an API for organizers who want to
        integrate tournament data with external tools or
        automate workflows.
      </p>
      <p>
        The interactive OpenAPI documentation is available
        through Swagger:
      </p>
      <p>
        <a href={apiDocsUrl} target="_blank" rel="noreferrer">
          Open KenManage API documentation
        </a>
      </p>

      <h3>Authentication</h3>
      <p>
        Different parts of the API use different authentication
        methods:
      </p>
      <ul>
        <li>
          <strong>Organizer requests:</strong> Use a Firebase
          ID token in the{" "}
          <code>Authorization: Bearer ...</code> header.
          There is no long-lived organizer API key in Settings.
        </li>
        <li>
          <strong>Scorekeeper requests:</strong> Use the{" "}
          <code>X-Scorekeeper-Token</code> header, along
          with <code>X-Edit-Session-Id</code> when editing.
        </li>
        <li>
          <strong>Public dashboard requests:</strong> No
          authentication is required when the tournament
          is published. Unpublished tournaments require
          a preview token through <code>?preview=</code>.
        </li>
      </ul>

      <Callout tone="warn">
        <p>
          <strong>Don't confuse access codes with API credentials.</strong>{" "}
          Participant and scorekeeper codes cannot be used
          as Firebase Bearer tokens. Scripts making organizer
          requests must authenticate through Firebase and
          send a valid ID token.
        </p>
      </Callout>

      <h3>Endpoint overview</h3>
      <p>
        The following is a high-level overview of the
        available API routes. Refer to Swagger for request
        parameters, response schemas, and detailed examples.
      </p>
      <ul>
        <li><code>/users/…</code> — Registration, profile, authentication, and password management.</li>
        <li><code>/clubs</code> — Club management.</li>
        <li>
          <code>/tournaments</code> — List and create tournaments;
          <code>/tournaments/&#123;id&#125;</code> — Retrieve,
          update, and delete tournaments, manage logos, status,
          preview tokens, and scorekeeper tokens.
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/players</code> and{" "}
          <code>/players_fields</code> — Player management,
          field configuration, and player codes.
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/teams</code> — Team
          management and team categories.
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/divisions</code> —
          Division management, player/team assignments, and
          lock status.
        </li>
        <li>
          <code>/…/brackets</code> and{" "}
          <code>/…/brackets/teams</code> — Save and replace
          individual and team bracket trees.
        </li>
        <li>
          <code>/tournaments/&#123;id&#125;/courts</code> and{" "}
          <code>/schedule_timetable</code> — Court and
          schedule management.
        </li>
        <li>
          <code>/divisions/&#123;id&#125;/bracket-cells</code> —
          Match scores and their team variants.
        </li>
        <li>
          <code>/public/tournaments/&#123;endpoint&#125;</code> —
          Public tournament data.
        </li>
        <li>
          <code>/scorekeeping/redeem</code> — Exchange
          scorekeeper codes for session access.
        </li>
      </ul>

      <h3>Common API errors</h3>
      <ul>
        <li>
          <strong>401 — Unauthorized:</strong> Missing or expired
          Firebase token, or an invalid scorekeeper token.
        </li>
        <li>
          <strong>403 — Forbidden:</strong> The requester does
          not own the tournament, or public/preview access
          requirements have not been met.
        </li>
        <li>
          <strong>409 — Conflict:</strong> The division is
          locked because scores have already been entered.
          Unlock or clear scores before making structural changes.
        </li>
        <li>
          <strong>Validation errors:</strong> The submitted
          data does not satisfy tournament constraints, such
          as maximum team/court counts or field-schema rules.
        </li>
      </ul>

      <Shot label="Swagger API documentation with authentication controls" />

      <h2 id="troubleshooting">17. Troubleshooting & FAQ</h2>
      <p>
        Running into an issue? Here are some common problems
        and how to resolve them.
      </p>

      <h3>Players and registration</h3>
      <ol>
        <li>
          <strong>Can't add players manually?</strong>{" "}
          Import an Excel spreadsheet first. The initial
          import establishes the player field schema required
          for manual entry.
        </li>
        <li>
          <strong>Excel import fails because of player names?</strong>{" "}
          Every row must have a player name. You can use a
          single name column or combine First and Last columns.
          Empty names will stop the import.
        </li>
        <li>
          <strong>Players are assigned to the wrong club?</strong>{" "}
          The club is selected in the import wizard, not
          read from the spreadsheet. Check your club selection
          before confirming the import.
        </li>
      </ol>

      <h3>Brackets and seeding</h3>
      <ol>
        <li>
          <strong>Can't change an existing bracket?</strong>{" "}
          The division may be locked because a score has
          already been saved. Unlock it from Scores to
          make structural changes. Be aware that unlocking
          clears scored cells.
        </li>
        <li>
          <strong>Same-club players are still in the same group?</strong>{" "}
          Seeding is heuristic, not guaranteed. Review the
          generated bracket and manually swap positions
          where necessary.
        </li>
      </ol>

      <h3>Scorekeeping</h3>
      <ol>
        <li>
          <strong>Scorekeeper can't edit scores?</strong>{" "}
          Check that the access code hasn't been rotated
          or disabled, that the scorekeeper has redeemed
          it in the current browser tab, and that another
          editor doesn't hold the group lock.
        </li>
        <li>
          <strong>Another scorekeeper can't edit the same group?</strong>{" "}
          Only one editor can hold a group sheet's lock
          at a time. Wait for the current editing session
          to end before trying again.
        </li>
      </ol>

      <h3>Public site and scheduling</h3>
      <ol>
        <li>
          <strong>Public tournament site shows a 404 or no data?</strong>{" "}
          Verify the participant URL, publication status,
          and preview token if the tournament is unpublished.
        </li>
        <li>
          <strong>Schedule placement is rejected?</strong>{" "}
          Check whether another block already occupies
          the same court and time. Back-to-back blocks
          are allowed, but overlapping blocks are not.
        </li>
        <li>
          <strong>Schedule blocks seem too long or short?</strong>{" "}
          Review the configured match duration and margin.
          KenManage estimates block length using the{" "}
          <code>N − 1</code> match formula. Resize blocks
          manually if your tournament format requires it.
        </li>
      </ol>

      <h3>Exports and API</h3>
      <ol>
        <li>
          <strong>Excel bracket export fails?</strong>{" "}
          Check whether an Excel template is available
          for your bracket size.
        </li>
        <li>
          <strong>API requests return 401?</strong>{" "}
          Your Firebase ID token may be missing or expired.
          Authenticate again and send a fresh Bearer token.
          Participant and scorekeeper codes cannot replace it.
        </li>
      </ol>

      <h3>Multiple organizers</h3>
      <p>
        KenManage does not automatically merge concurrent
        organizer edits. If multiple organizers are working
        on the same tournament, coordinate changes to avoid
        overwriting each other's work. For structural changes,
        using one designated organizer workstation is
        recommended.
      </p>

      <Callout>
        <p>
          <strong>Still need help?</strong> Check the{" "}
          <Link href="/faq">Frequently Asked Questions</Link>{" "}
          or <Link href="/contact">contact the KenManage team</Link>{" "}
          for assistance.
        </p>
      </Callout>
    </div>
  );
}
