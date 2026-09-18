declare module "tournament-brackets-ui" {
  import * as React from "react";

  type Entity = "teams" | "individuals";
  type Size = 2 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

  type VariantProps = {
    entity?: Entity;
    size: Size;
    [key: string]: any;
  };

  type FacadeComponent = React.FC<VariantProps> & {
    Teams: React.FC<Omit<VariantProps, "entity">>;
    Individuals: React.FC<Omit<VariantProps, "entity">>;
  };

  export const CollapsedLeft: FacadeComponent;
  export const CollapsedRight: FacadeComponent;
  export const Expanded: FacadeComponent;

  export const EXPANDED_SIZES_TEAMS: readonly Size[];
  export const EXPANDED_SIZES_INDIVIDUALS: readonly Size[];
  export const COLLAPSED_SIZES_TEAMS: readonly Size[];
  export const COLLAPSED_SIZES_INDIVIDUALS: readonly Size[];
  export const BRACKET_SIZES: {
    expanded: { teams: readonly Size[]; individuals: readonly Size[] };
    collapsed: { teams: readonly Size[]; individuals: readonly Size[] };
  };
}
