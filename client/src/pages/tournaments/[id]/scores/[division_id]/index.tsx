import React, { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Code,
  Divider,
  Center,
  Group,
  Loader,
  Paper,
  Popover,
  Stack,
  Text,
  Badge,
  Tabs,
  useComputedColorScheme,
} from "@mantine/core";
import { IconQuestionMark } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import { Expanded, EXPANDED_SIZES_INDIVIDUALS, EXPANDED_SIZES_TEAMS } from "tournament-brackets-ui";

import { showNotification } from "@mantine/notifications";
import { PageHeader } from "../../../../../components/layout/page_header";
import TournamentLayout from "../../../_tournament_layout";
import RequestErrorAlert from "../../../../../components/utils/error_alert";
import { getTournamentIdFromRouter } from "../../../../../components/utils/util";
import { getClubs, getDivisions, requestSucceeded } from "../../../../../services/adapter";
import ScoreStatusBadge from "../../../../../components/scores/ScoreStatusBadge";
import {
  buildPlayerIdResolver,
  buildTeamIdResolver,
  claimBracketEditLock,
  clearDivisionBracketCells,
  ensureFinalsBracket,
  fetchDivisionBracketCells,
  fetchDivisionBracketsWithPlayers,
  fetchDivisionBracketsWithTeams,
  fetchDivisionEditLocks,
  fetchDivisionTeamBracketCells,
  heartbeatBracketEditLock,
  isFinalsBracket,
  mergeCellsIntoUiPlayers,
  mergeCellsIntoUiTeams,
  putDivisionBracketCells,
  putDivisionTeamBracketCells,
  releaseBracketEditLock,
  toUIPlayersWithClubAbbrev,
  toUITeamSlots,
  type BracketCell,
  type BracketEditLock,
  type BracketUIPlayerSlot,
  type BracketUITeamSlot,
  type TeamBracketCell,
  uiPlayersToBracketCells,
  uiTeamsToBracketCells,
} from "../../../../../services/bracket";
import { DEFAULT_BOOKLET } from "../../../../../components/utils/brackets_editor/shared";
import type { BracketWithPlayers, BracketWithTeams } from "../../../../../interfaces/bracket";
import {
  circledScoreDisplay,
  tournamentMkdtScoreInput,
} from "../../../../../utils/score_notation";
import {
  aggregateScoreStatuses,
  computeBracketScoreStatus,
  isDivisionScorekeepingStarted,
  payloadStartsScorekeeping,
  type ScoreStatus,
} from "../../../../../utils/score_status";
import { useSWRConfig } from "swr";
import { useAuth } from "../../../../../context/AuthContext";
import {
  getOrCreateEditSessionId,
  getScorekeeperDisplayName,
} from "../../../../../utils/scorekeeper_access";
import { getBaseApiUrl } from "../../../../../services/adapter";

type BracketUiMode = "view" | "fillable";
type ExpandedSize = (typeof EXPANDED_SIZES_INDIVIDUALS)[number];

const SCORE_LEGEND: Array<{ code: string; labelKey: string; labelDefault: string }> = [
  { code: "M", labelKey: "score_legend_men", labelDefault: "Men" },
  { code: "K", labelKey: "score_legend_kote", labelDefault: "Kote" },
  { code: "D", labelKey: "score_legend_do", labelDefault: "Do" },
  { code: "T", labelKey: "score_legend_tsuki", labelDefault: "Tsuki" },
  { code: "H", labelKey: "score_legend_hansoku", labelDefault: "Hansoku" },
  { code: "I", labelKey: "score_legend_ippon", labelDefault: "Ippon (= 2 Hansokus)" },
  { code: "-", labelKey: "score_legend_no_show", labelDefault: "No Show" },
];

type PlayoffStage = {
  /** Tab value, e.g. `playoff-finals`. */
  key: string;
  size: ExpandedSize;
  labelKey: string;
  labelDefault: string;
};

const EXPANDED_SIZE_SET = new Set<number>([
  ...EXPANDED_SIZES_TEAMS,
  ...EXPANDED_SIZES_INDIVIDUALS,
]);

/** Single Finals tab; slot count = number of groups (when that size is supported). */
function getFinalsStage(numGroups: number): PlayoffStage | null {
  if (numGroups < 2 || !EXPANDED_SIZE_SET.has(numGroups)) return null;
  return {
    key: "playoff-finals",
    size: numGroups as ExpandedSize,
    labelKey: "finals",
    labelDefault: "Finals",
  };
}

function emptyPlayoffPlayers(size: number) {
  return Array.from({ length: size }, () => ({
    id: "",
    name: "",
    club: null as string | null,
    score: "",
  }));
}

function emptyPlayoffTeams(size: number): BracketUITeamSlot[] {
  return Array.from({ length: size }, () => ({ id: "" }));
}

function groupTabValue(bracketId: number) {
  return `group-${bracketId}`;
}

function isPlayoffTab(tab: string) {
  return tab.startsWith("playoff-");
}

export default function DivisionScoresEditorPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, getUser } = useAuth();
  const colorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const bracketTheme = colorScheme === "dark" ? "dark" : "light";
  /** Fonts only — omit color so dark/light ink comes from the library theme. */
  const bracketTextStyles = useMemo(
    () => ({
      playerId: {
        fontFamily: DEFAULT_BOOKLET.playerId.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerId.fontSize,
      },
      playerText: {
        fontFamily: DEFAULT_BOOKLET.playerText.fontFamily,
        fontSize: DEFAULT_BOOKLET.playerText.fontSize,
      },
    }),
    [],
  );

  const { mutate } = useSWRConfig();
  const { id: tournamentId, tournamentData } = getTournamentIdFromRouter();
  const tournamentIdValid = Number.isFinite(tournamentId);

  const editorDisplayName = useMemo(() => {
    if (tournamentIdValid) {
      const skName = getScorekeeperDisplayName(tournamentData.id);
      if (skName) return skName;
    }
    const accountName = getUser()?.name?.trim();
    if (accountName) return accountName;
    if (user?.displayName?.trim()) return user.displayName.trim();
    return "Editor";
  }, [tournamentIdValid, tournamentData.id, getUser, user]);

  const divisionIdParam = router.query.division_id;
  const divisionId = useMemo(() => {
    const raw = Array.isArray(divisionIdParam)
      ? divisionIdParam[0]
      : divisionIdParam;
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [divisionIdParam]);

  // The divisions list gives us the division title + type (teams vs individuals).
  const swrDivisions = getDivisions(tournamentIdValid ? tournamentData.id : null);
  const divisions = swrDivisions.data?.data ?? [];

  const selectedDivision = useMemo(
    () => (divisionId == null ? null : divisions.find((d: any) => d.id === divisionId) ?? null),
    [divisions, divisionId],
  );

  const swrClubs = getClubs();
  const clubs = swrClubs.data?.data ?? [];

  const clubAbbrevByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clubs) m.set(c.name, c.abbreviation);
    return m;
  }, [clubs]);

  const [bracketsPlayers, setBracketsPlayers] = useState<BracketWithPlayers[] | null>(null);
  const [bracketsTeams, setBracketsTeams] = useState<BracketWithTeams[] | null>(null);
  const [loadingBrackets, setLoadingBrackets] = useState(false);
  const [bracketsLoaded, setBracketsLoaded] = useState(false);
  /** Saved filled-slot scores keyed by bracket id (player divisions). */
  const [cellsByBracketId, setCellsByBracketId] = useState<Record<number, BracketCell[]>>({});
  /** Saved team advances keyed by bracket id (team divisions). */
  const [teamCellsByBracketId, setTeamCellsByBracketId] = useState<
    Record<number, TeamBracketCell[]>
  >({});
  /** In-edit drafts from onPlayersChange, keyed by bracket id. */
  const [draftByBracketId, setDraftByBracketId] = useState<Record<number, BracketUIPlayerSlot[]>>({});
  /** In-edit drafts from onTeamsChange, keyed by bracket id. */
  const [draftTeamsByBracketId, setDraftTeamsByBracketId] = useState<
    Record<number, BracketUITeamSlot[]>
  >({});
  const [finalsBracketId, setFinalsBracketId] = useState<number | null>(null);
  const [finalsDraft, setFinalsDraft] = useState<BracketUIPlayerSlot[] | null>(null);
  const [finalsTeamsDraft, setFinalsTeamsDraft] = useState<BracketUITeamSlot[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  /** `group-{id}` for a pool bracket, or `playoff-{size}` for knockout stages. */
  const [activeTab, setActiveTab] = useState<string | null>(null);
  /** Bracket ids currently being edited by this session. */
  const [editingBracketIds, setEditingBracketIds] = useState<number[]>([]);
  /** Active locks from other editors (and self), polled. */
  const [editLocksByBracketId, setEditLocksByBracketId] = useState<
    Record<number, BracketEditLock>
  >({});
  /** Bumped on Cancel so fillable brackets remount from saved props. */
  const [bracketRevision, setBracketRevision] = useState(0);

  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getOrCreateEditSessionId());
  }, []);

  const isEditingBracket = (bracketId: number | null | undefined) =>
    bracketId != null && editingBracketIds.includes(bracketId);

  const anyEditing = editingBracketIds.length > 0;

  const confirmDiscardEdits = () =>
    window.confirm(
      t(
        "scores_unsaved_leave_prompt",
        "Are you sure you want to leave? You will lose all unsaved progress.",
      ),
    );

  const lockHeldByOther = (bracketId: number | null | undefined) => {
    if (bracketId == null) return null;
    const lock = editLocksByBracketId[bracketId];
    if (!lock) return null;
    if (lock.holder_session_id === sessionId) return null;
    return lock;
  };

  const releaseLocalEdit = (bracketId: number) => {
    setEditingBracketIds((prev) => prev.filter((id) => id !== bracketId));
    setDraftByBracketId((prev) => {
      const next = { ...prev };
      delete next[bracketId];
      return next;
    });
    setDraftTeamsByBracketId((prev) => {
      const next = { ...prev };
      delete next[bracketId];
      return next;
    });
    if (finalsBracketId === bracketId) {
      setFinalsDraft(null);
      setFinalsTeamsDraft(null);
    }
    setBracketRevision((n) => n + 1);
  };

  const claimAndEditBracket = async (bracketId: number) => {
    const sid = sessionId || getOrCreateEditSessionId();
    if (!sessionId) setSessionId(sid);
    if (!sid) {
      showNotification({
        color: "red",
        title: t("error", "Error"),
        message: t(
          "edit_session_missing",
          "Could not start an edit session. Refresh and try again.",
        ),
      });
      return false;
    }
    const res = await claimBracketEditLock(
      bracketId,
      editorDisplayName,
      sid,
    );
    if (!res || !requestSucceeded(res as any)) {
      const detail = (res as any)?.response?.data?.detail;
      const holder =
        detail && typeof detail === "object" ? detail.holder_name : null;
      showNotification({
        color: "orange",
        title: t("edit_locked_title", "Group in use"),
        message: holder
          ? t("edit_locked_by", "Being edited by {{name}}", { name: holder })
          : t(
              "edit_locked_generic",
              "Someone else is editing this group.",
            ),
      });
      return false;
    }
    setEditingBracketIds((prev) =>
      prev.includes(bracketId) ? prev : [...prev, bracketId],
    );
    return true;
  };

  const enterEditGroup = async (bracketId: number) => {
    const other = lockHeldByOther(bracketId);
    if (other) {
      showNotification({
        color: "orange",
        title: t("edit_locked_title", "Group in use"),
        message: t("edit_locked_by", "Being edited by {{name}}", {
          name: other.holder_name,
        }),
      });
      return;
    }
    await claimAndEditBracket(bracketId);
  };

  const enterEditFinals = async (finalsSize: number) => {
    if (!divisionId) return;
    let finalsId = finalsBracketId;
    if (finalsId == null) {
      const created = await ensureFinalsBracket(divisionId, finalsSize);
      if (!created || !requestSucceeded(created as any)) return;
      finalsId =
        (created as any).data?.data?.id ?? (created as any).data?.id ?? null;
      if (finalsId == null) return;
      setFinalsBracketId(Number(finalsId));
      finalsId = Number(finalsId);
    }
    await enterEditGroup(finalsId);
  };

  const cancelEditBracket = async (bracketId: number) => {
    if (!confirmDiscardEdits()) return;
    await releaseBracketEditLock(bracketId, sessionId);
    releaseLocalEdit(bracketId);
  };

  const saveEdit = async () => {
    if (!divisionId || !selectedDivision) {
      return;
    }

    const isTeams = selectedDivision.division_type === "TEAMS";
    const draftEntries = isTeams
      ? Object.entries(draftTeamsByBracketId)
      : Object.entries(draftByBracketId);
    const hasFinalsDraft = isTeams ? finalsTeamsDraft != null : finalsDraft != null;
    if (!draftEntries.length && !hasFinalsDraft) {
      return;
    }

    setSaving(true);
    try {
      const groupBrackets = isTeams ? bracketsTeams ?? [] : bracketsPlayers ?? [];
      const bracketsForLock = [
        ...groupBrackets.map((b) => ({
          id: b.id,
          num_players: b.num_players,
        })),
        ...(finalsBracketId != null && playoffStages[0]
          ? [{ id: finalsBracketId, num_players: playoffStages[0].size }]
          : []),
      ];
      const cellsForLock = isTeams ? teamCellsByBracketId : cellsByBracketId;

      if (isTeams) {
        const resolve = buildTeamIdResolver(bracketsTeams ?? []);
        const payload = draftEntries.map(([bracketId, teams]) => ({
          bracket_id: Number(bracketId),
          cells: uiTeamsToBracketCells(teams as BracketUITeamSlot[], resolve),
        }));

        if (hasFinalsDraft && finalsTeamsDraft && finalsBracketId != null) {
          payload.push({
            bracket_id: Number(finalsBracketId),
            cells: uiTeamsToBracketCells(finalsTeamsDraft, resolve),
          });
        }

        const currentlyLocked = isDivisionScorekeepingStarted(
          bracketsForLock,
          cellsForLock,
        );
        if (
          !currentlyLocked &&
          payloadStartsScorekeeping(payload, bracketsForLock)
        ) {
          const ok = window.confirm(
            t(
              "division_lock_confirm",
              "Saving these scores will lock this division. You will no longer be able to add or remove players (or teams) or change seeding until you unlock by clearing all recorded scores. Continue?",
            ),
          );
          if (!ok) return;
        }

        const res = await putDivisionTeamBracketCells(divisionId, payload);
        if (!res || !requestSucceeded(res as any)) {
          return;
        }

        const cellsRes = await fetchDivisionTeamBracketCells(divisionId);
        const cells = (cellsRes.data?.data ?? []) as TeamBracketCell[];
        const byBracket: Record<number, TeamBracketCell[]> = {};
        for (const cell of cells) {
          (byBracket[cell.bracket_id] ??= []).push(cell);
        }
        setTeamCellsByBracketId(byBracket);
      } else {
        const resolve = buildPlayerIdResolver(bracketsPlayers ?? []);
        const payload = draftEntries.map(([bracketId, players]) => ({
          bracket_id: Number(bracketId),
          cells: uiPlayersToBracketCells(players as BracketUIPlayerSlot[], resolve),
        }));

        if (hasFinalsDraft && finalsDraft && finalsBracketId != null) {
          payload.push({
            bracket_id: Number(finalsBracketId),
            cells: uiPlayersToBracketCells(finalsDraft, resolve),
          });
        }

        const currentlyLocked = isDivisionScorekeepingStarted(
          bracketsForLock,
          cellsForLock,
        );
        if (
          !currentlyLocked &&
          payloadStartsScorekeeping(payload, bracketsForLock)
        ) {
          const ok = window.confirm(
            t(
              "division_lock_confirm",
              "Saving these scores will lock this division. You will no longer be able to add or remove players (or teams) or change seeding until you unlock by clearing all recorded scores. Continue?",
            ),
          );
          if (!ok) return;
        }

        const res = await putDivisionBracketCells(divisionId, payload);
        if (!res || !requestSucceeded(res as any)) {
          return;
        }

        const cellsRes = await fetchDivisionBracketCells(divisionId);
        const cells = (cellsRes.data?.data ?? []) as BracketCell[];
        const byBracket: Record<number, BracketCell[]> = {};
        for (const cell of cells) {
          (byBracket[cell.bracket_id] ??= []).push(cell);
        }
        setCellsByBracketId(byBracket);
      }

      const held = [...editingBracketIds];
      await Promise.all(held.map((id) => releaseBracketEditLock(id, sessionId)));
      setEditingBracketIds([]);
      setDraftByBracketId({});
      setDraftTeamsByBracketId({});
      setFinalsDraft(null);
      setFinalsTeamsDraft(null);
      setBracketRevision((n) => n + 1);
      await mutate(`divisions/${divisionId}/lock`);
      showNotification({
        color: "green",
        title: t("saved", "Saved"),
        message: t("scores_save_success", "Scores saved."),
      });
    } catch {
      showNotification({
        color: "red",
        title: t("error", "Error"),
        message: t("scores_save_failed", "Failed to save scores."),
      });
    } finally {
      setSaving(false);
    }
  };

  const unlockDivision = async () => {
    if (!divisionId) return;
    const ok = window.confirm(
      t(
        "division_unlock_confirm",
        "Unlock this division? All recorded scores will be cleared, and you will be able to change roster and seeding again.",
      ),
    );
    if (!ok) return;
    if (anyEditing) {
      if (!confirmDiscardEdits()) return;
      await Promise.all(
        editingBracketIds.map((id) => releaseBracketEditLock(id, sessionId)),
      );
      setEditingBracketIds([]);
    }

    setUnlocking(true);
    try {
      const res = await clearDivisionBracketCells(divisionId);
      if (!res || !requestSucceeded(res as any)) {
        showNotification({
          color: "red",
          title: t("error", "Error"),
          message: t("division_unlock_failed", "Failed to unlock division."),
        });
        return;
      }
      setCellsByBracketId({});
      setTeamCellsByBracketId({});
      setDraftByBracketId({});
      setDraftTeamsByBracketId({});
      setFinalsDraft(null);
      setFinalsTeamsDraft(null);
      setBracketRevision((n) => n + 1);
      await mutate(`divisions/${divisionId}/lock`);
      showNotification({
        color: "green",
        title: t("unlocked", "Unlocked"),
        message: t(
          "division_unlock_success",
          "Scores cleared. Roster and seeding can be edited again.",
        ),
      });
    } finally {
      setUnlocking(false);
    }
  };

  const editingBracketIdsRef = React.useRef(editingBracketIds);
  editingBracketIdsRef.current = editingBracketIds;

  useEffect(() => {
    if (!anyEditing || !sessionId) return;

    const leaveMessage = t(
      "scores_unsaved_leave_prompt",
      "Are you sure you want to leave? You will lose all unsaved progress.",
    );

    const releaseBeacon = () => {
      const base = getBaseApiUrl().replace(/\/$/, "");
      for (const id of editingBracketIdsRef.current) {
        const url = `${base}/brackets/${id}/edit-lock?session_id=${encodeURIComponent(sessionId)}`;
        try {
          void fetch(url, { method: "DELETE", keepalive: true });
        } catch {
          /* ignore */
        }
      }
    };

    const beforeUnload = (e: BeforeUnloadEvent) => {
      releaseBeacon();
      e.preventDefault();
      e.returnValue = "";
    };
    const onRouteStart = (url: string) => {
      if (url === router.asPath) return;
      const ok = window.confirm(leaveMessage);
      if (!ok) {
        router.events.emit("routeChangeError");
        throw "Route change aborted.";
      }
      void Promise.all(
        editingBracketIdsRef.current.map((id) =>
          releaseBracketEditLock(id, sessionId),
        ),
      );
    };

    window.addEventListener("beforeunload", beforeUnload);
    router.events.on("routeChangeStart", onRouteStart);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      router.events.off("routeChangeStart", onRouteStart);
    };
  }, [anyEditing, sessionId, router, t]);

  // Heartbeat held locks (DB TTL is 45s; refresh every 15s).
  useEffect(() => {
    if (!anyEditing || !sessionId) return;
    const tick = () => {
      for (const id of editingBracketIds) {
        void heartbeatBracketEditLock(id, sessionId);
      }
    };
    // Slight delay so we don't race the claim write.
    const initial = window.setTimeout(tick, 2000);
    const timer = window.setInterval(tick, 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [anyEditing, editingBracketIds, sessionId]);

  // Poll edit locks + saved cells for live view updates.
  useEffect(() => {
    if (!divisionId || !selectedDivision || !bracketsLoaded) return;

    const refresh = async () => {
      try {
        const locksRes = await fetchDivisionEditLocks(divisionId);
        const locks = (locksRes.data?.data ?? []) as BracketEditLock[];
        const byId: Record<number, BracketEditLock> = {};
        for (const lock of locks) {
          byId[lock.bracket_id] = lock;
        }
        setEditLocksByBracketId(byId);

        if (selectedDivision.division_type === "TEAMS") {
          const cellsRes = await fetchDivisionTeamBracketCells(divisionId);
          const cells = (cellsRes.data?.data ?? []) as TeamBracketCell[];
          const byBracket: Record<number, TeamBracketCell[]> = {};
          for (const cell of cells) {
            (byBracket[cell.bracket_id] ??= []).push(cell);
          }
          setTeamCellsByBracketId((prev) => {
            // Keep local drafts authoritative for brackets we are editing.
            const next = { ...byBracket };
            for (const id of editingBracketIds) {
              if (prev[id]) next[id] = prev[id];
            }
            return next;
          });
        } else {
          const cellsRes = await fetchDivisionBracketCells(divisionId);
          const cells = (cellsRes.data?.data ?? []) as BracketCell[];
          const byBracket: Record<number, BracketCell[]> = {};
          for (const cell of cells) {
            (byBracket[cell.bracket_id] ??= []).push(cell);
          }
          setCellsByBracketId((prev) => {
            const next = { ...byBracket };
            for (const id of editingBracketIds) {
              if (prev[id]) next[id] = prev[id];
            }
            return next;
          });
        }
      } catch {
        /* ignore poll errors */
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => window.clearInterval(timer);
  }, [
    divisionId,
    selectedDivision,
    bracketsLoaded,
    editingBracketIds,
  ]);

  useEffect(() => {
    if (!divisionId || !selectedDivision) return;
    setLoadingBrackets(true);
    setBracketsLoaded(false);
    setActiveTab(null);
    setEditingBracketIds([]);
    setEditLocksByBracketId({});
    setBracketRevision(0);
    setDraftByBracketId({});
    setDraftTeamsByBracketId({});
    setFinalsDraft(null);
    setFinalsTeamsDraft(null);
    setFinalsBracketId(null);
    setCellsByBracketId({});
    setTeamCellsByBracketId({});

    const run = async () => {
      try {
        if (selectedDivision.division_type === "TEAMS") {
          setBracketsPlayers(null);
          const [bracketsRes, cellsRes] = await Promise.all([
            fetchDivisionBracketsWithTeams(divisionId),
            fetchDivisionTeamBracketCells(divisionId),
          ]);
          const allBrackets = (bracketsRes.data.data ?? []) as BracketWithTeams[];
          const finals = allBrackets.find((b) => isFinalsBracket(b));
          const groups = allBrackets.filter((b) => !isFinalsBracket(b));
          setBracketsTeams(groups);
          setFinalsBracketId(finals?.id ?? null);
          const cells = (cellsRes.data?.data ?? []) as TeamBracketCell[];
          const byBracket: Record<number, TeamBracketCell[]> = {};
          for (const cell of cells) {
            (byBracket[cell.bracket_id] ??= []).push(cell);
          }
          setTeamCellsByBracketId(byBracket);
        } else {
          setBracketsTeams(null);
          const [bracketsRes, cellsRes] = await Promise.all([
            fetchDivisionBracketsWithPlayers(divisionId),
            fetchDivisionBracketCells(divisionId),
          ]);
          const allBrackets = (bracketsRes.data.data ?? []) as BracketWithPlayers[];
          const finals = allBrackets.find((b) => isFinalsBracket(b));
          const groups = allBrackets.filter((b) => !isFinalsBracket(b));
          setBracketsPlayers(groups);
          setFinalsBracketId(finals?.id ?? null);
          const cells = (cellsRes.data?.data ?? []) as BracketCell[];
          const byBracket: Record<number, BracketCell[]> = {};
          for (const cell of cells) {
            (byBracket[cell.bracket_id] ??= []).push(cell);
          }
          setCellsByBracketId(byBracket);
        }
      } finally {
        setLoadingBrackets(false);
        setBracketsLoaded(true);
      }
    };

    run();
  }, [divisionId, selectedDivision]);

  const sortedPlayers = useMemo(
    () => (bracketsPlayers ?? []).slice().sort((a, b) => a.index - b.index),
    [bracketsPlayers],
  );
  const sortedTeams = useMemo(
    () => (bracketsTeams ?? []).slice().sort((a, b) => a.index - b.index),
    [bracketsTeams],
  );

  const groupsForCards = useMemo(() => {
    if (!selectedDivision) return [] as Array<BracketWithPlayers | BracketWithTeams>;
    return selectedDivision.division_type === "TEAMS"
      ? (sortedTeams as Array<BracketWithPlayers | BracketWithTeams>)
      : (sortedPlayers as Array<BracketWithPlayers | BracketWithTeams>);
  }, [selectedDivision, sortedTeams, sortedPlayers]);

  /** Finals opening-slot name placeholders: Winner of Group 1 … N */
  const finalsOpeningSlotLabels = useMemo(
    () =>
      groupsForCards.map((g) =>
        t("winner_of_group", "Winner of Group {{n}}", { n: g.index }),
      ),
    [groupsForCards, t],
  );

  /** Roster for finals pickers (group players). Enables openingSlotLabels in edit mode. */
  const finalsPlayerOptions = useMemo(() => {
    if (!bracketsPlayers?.length) return [];
    const opts: { id: string; name: string; club?: string }[] = [];
    for (const b of bracketsPlayers) {
      for (const slot of b.players ?? []) {
        const id =
          slot.code ?? slot.participant_number ?? String(slot.player_id);
        const clubName = slot.club ?? undefined;
        const club = clubName
          ? clubAbbrevByName.get(clubName) ?? clubName
          : undefined;
        opts.push({ id, name: slot.name ?? "", club });
      }
    }
    return opts;
  }, [bracketsPlayers, clubAbbrevByName]);

  const playoffStages = useMemo(() => {
    const finals = getFinalsStage(groupsForCards.length);
    return finals ? [finals] : [];
  }, [groupsForCards.length]);
  const playoffKeys = useMemo(
    () => new Set(playoffStages.map((s) => s.key)),
    [playoffStages],
  );

  const groupStatusById = useMemo(() => {
    const map = new Map<number, ScoreStatus>();
    const isTeams = selectedDivision?.division_type === "TEAMS";
    for (const b of groupsForCards) {
      map.set(
        b.id,
        computeBracketScoreStatus(
          b.num_players,
          isTeams
            ? teamCellsByBracketId[b.id] ?? []
            : cellsByBracketId[b.id] ?? [],
        ),
      );
    }
    return map;
  }, [groupsForCards, cellsByBracketId, teamCellsByBracketId, selectedDivision]);

  const finalsStatus = useMemo((): ScoreStatus | null => {
    if (!playoffStages.length) return null;
    if (finalsBracketId == null) return "not_started";
    const size = playoffStages[0]?.size ?? groupsForCards.length;
    const isTeams = selectedDivision?.division_type === "TEAMS";
    return computeBracketScoreStatus(
      size,
      isTeams
        ? teamCellsByBracketId[finalsBracketId] ?? []
        : cellsByBracketId[finalsBracketId] ?? [],
    );
  }, [
    playoffStages,
    finalsBracketId,
    cellsByBracketId,
    teamCellsByBracketId,
    groupsForCards.length,
    selectedDivision,
  ]);

  const divisionStatus = useMemo(() => {
    const statuses = [...groupStatusById.values()];
    if (finalsStatus != null) statuses.push(finalsStatus);
    return aggregateScoreStatuses(statuses);
  }, [groupStatusById, finalsStatus]);

  const divisionLocked = useMemo(() => {
    const bracketsForLock = [
      ...groupsForCards.map((b) => ({
        id: b.id,
        num_players: b.num_players,
      })),
      ...(finalsBracketId != null && playoffStages[0]
        ? [{ id: finalsBracketId, num_players: playoffStages[0].size }]
        : []),
    ];
    const isTeams = selectedDivision?.division_type === "TEAMS";
    return isDivisionScorekeepingStarted(
      bracketsForLock,
      isTeams ? teamCellsByBracketId : cellsByBracketId,
    );
  }, [
    groupsForCards,
    finalsBracketId,
    playoffStages,
    cellsByBracketId,
    teamCellsByBracketId,
    selectedDivision,
  ]);

  // Keep active selection stable when data changes.
  useEffect(() => {
    if (activeTab != null) return;
    if (selectedDivision?.division_type === "TEAMS") {
      if (sortedTeams.length > 0) setActiveTab(groupTabValue(sortedTeams[0].id));
    } else {
      if (sortedPlayers.length > 0) setActiveTab(groupTabValue(sortedPlayers[0].id));
    }
  }, [activeTab, selectedDivision, sortedPlayers, sortedTeams]);

  useEffect(() => {
    if (activeTab == null) return;
    if (isPlayoffTab(activeTab)) {
      if (!playoffKeys.has(activeTab)) {
        const first =
          selectedDivision?.division_type === "TEAMS" ? sortedTeams[0] : sortedPlayers[0];
        if (first) setActiveTab(groupTabValue(first.id));
      }
      return;
    }
    if (!activeTab.startsWith("group-")) return;
    const id = Number(activeTab.slice("group-".length));
    if (!Number.isFinite(id)) return;
    if (selectedDivision?.division_type === "TEAMS") {
      const stillExists = sortedTeams.some((b) => b.id === id);
      if (!stillExists) setActiveTab(sortedTeams[0] ? groupTabValue(sortedTeams[0].id) : null);
    } else {
      const stillExists = sortedPlayers.some((b) => b.id === id);
      if (!stillExists) setActiveTab(sortedPlayers[0] ? groupTabValue(sortedPlayers[0].id) : null);
    }
  }, [activeTab, playoffKeys, selectedDivision, sortedPlayers, sortedTeams]);

  if (swrDivisions.error) return <RequestErrorAlert error={swrDivisions.error} />;
  if (!tournamentIdValid || !swrDivisions.data) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 400 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  if (divisionId == null) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 300 }}>
          <Text c="dimmed">Invalid division.</Text>
        </Center>
      </TournamentLayout>
    );
  }

  if (!selectedDivision) {
    return (
      <TournamentLayout tournament_id={tournamentData.id}>
        <Center style={{ minHeight: 300 }}>
          <Text c="dimmed">Division not found.</Text>
        </Center>
      </TournamentLayout>
    );
  }

  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <Stack gap="lg">
        <PageHeader
          title={t("scores_editor_title", "Score Editor")}
          description={
            <>
              {selectedDivision.name}
              {selectedDivision.prefix ? ` (${selectedDivision.prefix})` : ""}.{" "}
              {t(
                "scores_editor_view_hint",
                "Open Edit on a group to enter scores. Groups locked by someone else show their name.",
              )}
            </>
          }
          actions={
          <Group gap="sm" align="center" wrap="wrap">
            <Badge variant="light" color="blue" size="lg">
              {selectedDivision.division_type === "TEAMS"
                ? t("teams", "Teams")
                : t("individuals", "Individuals")}
            </Badge>
            {bracketsLoaded && <ScoreStatusBadge status={divisionStatus} size="lg" />}
            {bracketsLoaded && divisionLocked && (
              <>
                <Badge variant="filled" color="orange" size="lg">
                  {t("division_locked", "Locked")}
                </Badge>
                <Button
                  variant="light"
                  color="orange"
                  size="sm"
                  loading={unlocking}
                  onClick={() => void unlockDivision()}
                >
                  {t("unlock_division", "Unlock")}
                </Button>
              </>
            )}
            <Popover width={220} position="bottom-end" withArrow shadow="md">
              <Popover.Target>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="md"
                  aria-label={t("score_legend_aria", "Score legend")}
                >
                  <IconQuestionMark size={16} />
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    {t("score_legend_title", "Score legend")}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t(
                      "score_legend_hint",
                      "Enter letters in the score box:",
                    )}
                  </Text>
                  <Stack gap={6}>
                    {SCORE_LEGEND.map((item) => (
                      <Group key={item.code} gap="sm" wrap="nowrap">
                        <Code w={28} ta="center" fw={700}>
                          {item.code}
                        </Code>
                        <Text size="sm">{t(item.labelKey, item.labelDefault)}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>
          }
        />

        {bracketsLoaded && divisionLocked && (
          <Text size="sm" c="dimmed">
            {t(
              "division_locked_hint",
              "Scorekeeping has started — roster and seeding are locked. Unlock to clear all scores and edit them again.",
            )}
          </Text>
        )}

        {loadingBrackets && !bracketsLoaded ? (
          <Center style={{ minHeight: 260 }}>
            <Loader />
          </Center>
        ) : groupsForCards.length === 0 && bracketsLoaded ? (
          <Text c="dimmed">{t("no_groups", "No groups found.")}</Text>
        ) : (
          <Tabs
            value={activeTab ?? undefined}
            onChange={(v) => v && setActiveTab(v)}
            variant="outline"
            radius="md"
          >
            <Tabs.List style={{ flexWrap: "nowrap", overflowX: "auto" }}>
              {groupsForCards.map((b) => (
                <Tabs.Tab key={b.id} value={groupTabValue(b.id)}>
                  {t("bracket_group_label", "Group {{n}}", { n: b.index })}
                </Tabs.Tab>
              ))}
              {playoffStages.map((stage) => (
                <Tabs.Tab key={stage.key} value={stage.key}>
                  {t(stage.labelKey, stage.labelDefault, { n: stage.size })}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {groupsForCards.map((b) => (
              <Tabs.Panel key={b.id} value={groupTabValue(b.id)} pt="md">
                {selectedDivision.division_type === "TEAMS" ? (
                  <Paper withBorder radius="md" p="md">
                    <Group justify="space-between" mb="sm" wrap="wrap">
                      <Group gap="xs">
                        <Badge variant="light">
                          {isEditingBracket(b.id)
                            ? t("editing_group", "Editing: Group {{n}}", { n: b.index })
                            : t("viewing_group", "Viewing: Group {{n}}", { n: b.index })}
                        </Badge>
                        <ScoreStatusBadge
                          status={groupStatusById.get(b.id) ?? "not_started"}
                        />
                        {lockHeldByOther(b.id) && (
                          <Badge color="orange" variant="light">
                            {t("editing_by", "Editing: {{name}}", {
                              name: lockHeldByOther(b.id)!.holder_name,
                            })}
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        {isEditingBracket(b.id) ? (
                          <>
                            <Button
                              variant="default"
                              size="xs"
                              disabled={saving}
                              onClick={() => void cancelEditBracket(b.id)}
                            >
                              {t("cancel", "Cancel")}
                            </Button>
                            <Button
                              size="xs"
                              loading={saving}
                              onClick={() => void saveEdit()}
                            >
                              {t("save", "Save")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="xs"
                            disabled={!!lockHeldByOther(b.id)}
                            onClick={() => void enterEditGroup(b.id)}
                          >
                            {t("edit", "Edit")}
                          </Button>
                        )}
                      </Group>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      {(() => {
                        const opening = toUITeamSlots(b as BracketWithTeams);
                        const teamsFillable = mergeCellsIntoUiTeams(
                          opening,
                          teamCellsByBracketId[b.id] ?? [],
                        );
                        const mode: BracketUiMode = isEditingBracket(b.id)
                          ? "fillable"
                          : "view";
                        return (
                          <Expanded.Teams
                            key={`teams-${b.id}-${bracketRevision}-${bracketTheme}-${mode}`}
                            size={b.num_players as ExpandedSize}
                            teams={teamsFillable as any}
                            mode={mode}
                            theme={bracketTheme}
                            teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                            teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                            scoreInputTransform={tournamentMkdtScoreInput}
                            formatScoreDisplay={circledScoreDisplay}
                            onTeamsChange={(teams: BracketUITeamSlot[]) => {
                              setDraftTeamsByBracketId((prev) => ({
                                ...prev,
                                [b.id]: teams,
                              }));
                            }}
                          />
                        );
                      })()}
                    </Box>
                  </Paper>
                ) : (
                  <Paper withBorder radius="md" p="md">
                    <Group justify="space-between" mb="sm" wrap="wrap">
                      <Group gap="xs">
                        <Badge variant="light">
                          {isEditingBracket(b.id)
                            ? t("editing_group", "Editing: Group {{n}}", { n: b.index })
                            : t("viewing_group", "Viewing: Group {{n}}", { n: b.index })}
                        </Badge>
                        <ScoreStatusBadge
                          status={groupStatusById.get(b.id) ?? "not_started"}
                        />
                        {lockHeldByOther(b.id) && (
                          <Badge color="orange" variant="light">
                            {t("editing_by", "Editing: {{name}}", {
                              name: lockHeldByOther(b.id)!.holder_name,
                            })}
                          </Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        {isEditingBracket(b.id) ? (
                          <>
                            <Button
                              variant="default"
                              size="xs"
                              disabled={saving}
                              onClick={() => void cancelEditBracket(b.id)}
                            >
                              {t("cancel", "Cancel")}
                            </Button>
                            <Button
                              size="xs"
                              loading={saving}
                              onClick={() => void saveEdit()}
                            >
                              {t("save", "Save")}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="xs"
                            disabled={!!lockHeldByOther(b.id)}
                            onClick={() => void enterEditGroup(b.id)}
                          >
                            {t("edit", "Edit")}
                          </Button>
                        )}
                      </Group>
                    </Group>
                    <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                      {(() => {
                        const opening = toUIPlayersWithClubAbbrev(
                          b as BracketWithPlayers,
                          clubAbbrevByName,
                        );
                        const playersFillable = mergeCellsIntoUiPlayers(
                          opening,
                          cellsByBracketId[b.id] ?? [],
                          clubAbbrevByName,
                        );
                        const mode: BracketUiMode = isEditingBracket(b.id)
                          ? "fillable"
                          : "view";
                        return (
                          <Expanded.Individuals
                            key={`individuals-${b.id}-${bracketRevision}-${bracketTheme}-${mode}`}
                            size={b.num_players}
                            players={playersFillable as any}
                            mode={mode}
                            theme={bracketTheme}
                            textStyles={bracketTextStyles}
                            scoreInputTransform={tournamentMkdtScoreInput}
                            formatScoreDisplay={circledScoreDisplay}
                            onPlayersChange={(players: BracketUIPlayerSlot[]) => {
                              setDraftByBracketId((prev) => ({
                                ...prev,
                                [b.id]: players,
                              }));
                            }}
                          />
                        );
                      })()}
                    </Box>
                  </Paper>
                )}
              </Tabs.Panel>
            ))}

            {playoffStages.map((stage) => {
              const finalsEditing = isEditingBracket(finalsBracketId);
              const finalsOther = lockHeldByOther(finalsBracketId);
              const finalsMode: BracketUiMode = finalsEditing ? "fillable" : "view";
              return (
              <Tabs.Panel key={stage.key} value={stage.key} pt="md">
                <Paper withBorder radius="md" p="md">
                  <Group justify="space-between" mb="sm" wrap="wrap">
                    <Group gap="xs">
                      <Badge variant="light" color="grape">
                        {finalsEditing
                          ? `${t("edit", "Edit")}: ${t(stage.labelKey, stage.labelDefault, { n: stage.size })}`
                          : `${t("view", "View")}: ${t(stage.labelKey, stage.labelDefault, { n: stage.size })}`}
                      </Badge>
                      <ScoreStatusBadge status={finalsStatus ?? "not_started"} />
                      {finalsOther && (
                        <Badge color="orange" variant="light">
                          {t("editing_by", "Editing: {{name}}", {
                            name: finalsOther.holder_name,
                          })}
                        </Badge>
                      )}
                    </Group>
                    <Group gap="xs">
                      {finalsEditing && finalsBracketId != null ? (
                        <>
                          <Button
                            variant="default"
                            size="xs"
                            disabled={saving}
                            onClick={() => void cancelEditBracket(finalsBracketId)}
                          >
                            {t("cancel", "Cancel")}
                          </Button>
                          <Button
                            size="xs"
                            loading={saving}
                            onClick={() => void saveEdit()}
                          >
                            {t("save", "Save")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="xs"
                          disabled={!!finalsOther}
                          onClick={() => void enterEditFinals(stage.size)}
                        >
                          {t("edit", "Edit")}
                        </Button>
                      )}
                    </Group>
                  </Group>
                  <Box style={{ maxWidth: "100%", overflowX: "auto", marginTop: 8 }}>
                    {selectedDivision.division_type === "TEAMS" ? (
                      <Expanded.Teams
                        key={`playoff-teams-${stage.size}-${bracketRevision}-${bracketTheme}-${finalsMode}-${finalsBracketId ?? "new"}`}
                        size={stage.size}
                        teams={
                          mergeCellsIntoUiTeams(
                            emptyPlayoffTeams(stage.size),
                            finalsBracketId != null
                              ? teamCellsByBracketId[finalsBracketId] ?? []
                              : [],
                          ) as any
                        }
                        mode={finalsMode}
                        theme={bracketTheme}
                        teamIDFontFamily={DEFAULT_BOOKLET.playerId.fontFamily}
                        teamIDFontSize={DEFAULT_BOOKLET.playerId.fontSize}
                        scoreInputTransform={tournamentMkdtScoreInput}
                        formatScoreDisplay={circledScoreDisplay}
                        onTeamsChange={(teams: BracketUITeamSlot[]) => {
                          setFinalsTeamsDraft(teams);
                        }}
                      />
                    ) : (
                      <Expanded.Individuals
                        key={`playoff-individuals-${stage.size}-${bracketRevision}-${bracketTheme}-${finalsMode}-${finalsBracketId ?? "new"}`}
                        size={stage.size}
                        players={
                          mergeCellsIntoUiPlayers(
                            emptyPlayoffPlayers(stage.size),
                            finalsBracketId != null
                              ? cellsByBracketId[finalsBracketId] ?? []
                              : [],
                            clubAbbrevByName,
                          ) as any
                        }
                        mode={finalsMode}
                        theme={bracketTheme}
                        textStyles={bracketTextStyles}
                        scoreInputTransform={tournamentMkdtScoreInput}
                        formatScoreDisplay={circledScoreDisplay}
                        openingSlotLabels={
                          finalsEditing ? finalsOpeningSlotLabels : undefined
                        }
                        playerOptions={
                          finalsEditing && finalsPlayerOptions.length
                            ? finalsPlayerOptions
                            : undefined
                        }
                        onPlayersChange={(players: BracketUIPlayerSlot[]) => {
                          setFinalsDraft(players);
                        }}
                      />
                    )}
                  </Box>
                </Paper>
              </Tabs.Panel>
              );
            })}
          </Tabs>
        )}
        <Divider />
      </Stack>
    </TournamentLayout>
  );
}

export const getServerSideProps = async ({ locale }: { locale: string }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});
