import { Tournament } from "../interfaces/tournament";

export const mockTournaments: Tournament[] = [
  {
    id: 1,
    name: "Mock Tournament",
    created: "2024-01-01T00:00:00Z",
    start_time: "2024-02-01T10:00:00Z",
    club_id: 123,
    dashboard_public: true,
    dashboard_endpoint: "/dashboard/mock",
    players_can_be_in_multiple_teams: false,
    auto_assign_courts: true,
    logo_path: "mock-logo.png",
    duration_minutes: 120,
    margin_minutes: 15,
  },
];
