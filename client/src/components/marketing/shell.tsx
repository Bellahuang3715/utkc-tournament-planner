import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";

import classes from "../landing/landing.module.css";
import { getBaseApiUrl } from "../../services/adapter";
import { BRACKET_URL, GITHUB_URL } from "./fixtures";

const NAV = [
  { href: "/welcome", label: "Home" },
  { href: "/guide", label: "Guide" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function Mark() {
  return (
    <svg className={classes.mark} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect width="22" height="22" rx="6" fill="#0b1f3a" />
      <path
        d="M11 4.2v13.6M7.2 8.2h7.6"
        stroke="#edf3fb"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="0" y="18" width="22" height="4" rx="0" fill="#c41e3a" />
    </svg>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [router.asPath]);

  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <div className={`${classes.wrap} ${classes.headerInner}`}>
          <Link href="/welcome" className={classes.brand}>
            <Mark />
            KenManage
          </Link>
          <nav className={classes.nav} aria-label="KenManage">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={classes.navLink}
                data-active={router.pathname === item.href ? "true" : "false"}
                aria-current={router.pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/welcome#start" className={classes.loginLink}>
              Get started
            </Link>
          </nav>
          <button
            type="button"
            className={classes.menuButton}
            aria-expanded={open}
            aria-controls="marketing-menu"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
        <div
          id="marketing-menu"
          className={`${classes.wrap} ${classes.mobileNav}`}
          data-open={open ? "true" : "false"}
          hidden={!open}
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/welcome#start">Get started</Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className={classes.footer}>
        <div className={`${classes.wrap} ${classes.footerInner}`}>
          <div>
            <Link href="/welcome" className={classes.brand}>
              <Mark />
              KenManage
            </Link>
            <p>
              Free software for kendo tournaments, licensed under AGPL-3.0. KenManage grew out of{" "}
              <a href={BRACKET_URL}>Bracket</a>.
            </p>
          </div>
          <nav className={classes.footerNav} aria-label="Site">
            <Link href="/welcome">Home</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/license">License</Link>
            <a href={GITHUB_URL}>GitHub</a>
            <a href={`${getBaseApiUrl()}/docs`}>API docs</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
