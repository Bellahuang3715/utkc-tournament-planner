declare module "tournament-brackets-ui" {
  import * as React from "react";

  type Entity = "teams" | "individuals";
  type Size = 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16;

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
}
