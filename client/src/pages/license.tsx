import React from "react";

import { BRACKET_URL, GITHUB_URL, LICENSE_FILE_URL } from "../components/marketing/fixtures";
import { marketingServerProps } from "../components/marketing/server_props";
import { MarketingShell } from "../components/marketing/shell";
import classes from "../components/landing/landing.module.css";

export default function LicensePage() {
  return (
    <MarketingShell>
      <section className={classes.section}>
        <div className={classes.wrap}>
          <p className={classes.kicker}>License</p>
          <h1 className={`${classes.display} ${classes.pageTitle}`}>AGPL-3.0.</h1>
          <div className={classes.prose}>
            <p>
              KenManage is free software under the GNU Affero General Public License, version 3.
              You can use it, study it, and change it. You can also run it for your own club.
            </p>
            <p>
              If you modify KenManage and let other people use that version over a network, the
              AGPL asks you to offer them the source of your version. That is the point of this
              license: improvements stay available to the people who rely on the service.
            </p>
            <p>
              KenManage grew out of <a href={BRACKET_URL}>Bracket</a>, which is also AGPL-3.0.
              Contributions to KenManage are covered by the same license.
            </p>
            <p>
              The full text is the <a href={LICENSE_FILE_URL}>LICENSE file</a> in the{" "}
              <a href={GITHUB_URL}>repository</a>. This page is a summary, not a replacement.
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

export const getServerSideProps = marketingServerProps;
