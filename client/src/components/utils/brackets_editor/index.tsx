import { useMemo } from "react";
import { Center, Loader } from "@mantine/core";
import { useRouter } from "next/router";

import { getTournamentIdFromRouter } from "../util";
import { getDivisions } from "../../../services/adapter";
import TournamentLayout from "../../../pages/tournaments/_tournament_layout";
import BracketsEditorIndividuals from "./individuals";
import BracketsEditorTeams from "./teams";

/** Picks Individuals vs Teams editor based on division type. */
export default function BracketsEditor() {
  const router = useRouter();
  const { id: tournamentId } = getTournamentIdFromRouter();
  const divisionId = router.query.division_id;

  const swrDivisions = getDivisions(tournamentId);
  const divisions = swrDivisions.data?.data ?? [];
  const division = useMemo(
    () =>
      divisions.find(
        (d: { id: number }) => d.id === Number(divisionId)
      ),
    [divisions, divisionId]
  );

  if (!router.isReady) {
    return (
      <TournamentLayout tournament_id={tournamentId}>
        <Center style={{ minHeight: 300 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  if (swrDivisions.isLoading || !division) {
    return (
      <TournamentLayout tournament_id={tournamentId}>
        <Center style={{ minHeight: 300 }}>
          <Loader />
        </Center>
      </TournamentLayout>
    );
  }

  if (division.division_type === "TEAMS") {
    return <BracketsEditorTeams />;
  }

  return <BracketsEditorIndividuals />;
}

// Re-export section components for divisions index
export {
  BracketPairsSection,
  PosterGroupsSection,
} from "./individuals";
export {
  BracketPairsSectionTeams,
  PosterGroupsSectionTeams,
} from "./teams";
