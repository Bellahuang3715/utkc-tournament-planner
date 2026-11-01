import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useId, useRef, useState } from "react";

import classes from "../landing/landing.module.css";
import { getBaseApiUrl } from "../../services/adapter";
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO,
  GITHUB_ISSUES_URL,
  GITHUB_URL,
  LOGO_SRC,
} from "./fixtures";

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
  description?: string;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavLink[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "product",
    label: "Product",
    items: [
      { href: "/", label: "Home", description: "Landing page" },
      { href: "/#about", label: "About", description: "Why KenManage exists" },
      { href: "/#start", label: "Get started", description: "Pick your role" },
    ],
  },
  {
    id: "guides",
    label: "Guides",
    items: [
      {
        href: "/guide",
        label: "Quick guide",
        description: "Short path for organizers, participants, and scorekeepers",
      },
      {
        href: "/usage-guide",
        label: "Organizer usage guide",
        description: "Detailed setup from account to tournament day",
      },
      { href: "/faq", label: "FAQ", description: "Common questions before you join" },
    ],
  },
  {
    id: "project",
    label: "Project",
    items: [
      {
        href: "/docs-api",
        label: "API docs",
        description: "OpenAPI / Swagger for organizers",
        external: true,
      },
      { href: "/license", label: "License", description: "AGPL-3.0 summary" },
      {
        href: GITHUB_URL,
        label: "GitHub",
        description: "Source code and releases",
        external: true,
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      {
        href: "/contact",
        label: "Contact",
        description: "Clubs, email, bugs, and feature ideas",
      },
      {
        href: GITHUB_ISSUES_URL,
        label: "Report bugs",
        description: "Open a GitHub issue — or try to break it",
        external: true,
      },
      {
        href: "/contact#support",
        label: "Contribute or sponsor",
        description: "Donate, code, translate, star, or spread the word",
      },
    ],
  },
];

function resolveHref(item: NavLink) {
  if (item.href === "/docs-api") {
    return `${getBaseApiUrl()}/docs`;
  }
  return item.href;
}

function isItemActive(pathname: string, asPath: string, item: NavLink) {
  if (item.external || item.href === "/docs-api") return false;
  const [path, hash] = item.href.split("#");
  if (path !== pathname) return false;
  if (!hash) return !asPath.includes("#") || asPath.endsWith(path);
  return asPath.includes(`#${hash}`);
}

function groupHasActive(pathname: string, asPath: string, group: NavGroup) {
  return group.items.some((item) => isItemActive(pathname, asPath, item));
}

function NavItemLink({
  item,
  className,
  active,
  onNavigate,
}: {
  item: NavLink;
  className: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  const href = resolveHref(item);
  const shared = {
    className,
    "data-active": active ? "true" : "false",
    onClick: onNavigate,
  };

  if (item.external || item.href === "/docs-api") {
    return (
      <a {...shared} href={href} target="_blank" rel="noreferrer">
        <span className={classes.navItemLabel}>{item.label}</span>
        {item.description ? (
          <span className={classes.navItemDesc}>{item.description}</span>
        ) : null}
      </a>
    );
  }

  return (
    <Link {...shared} href={href} aria-current={active ? "page" : undefined}>
      <span className={classes.navItemLabel}>{item.label}</span>
      {item.description ? (
        <span className={classes.navItemDesc}>{item.description}</span>
      ) : null}
    </Link>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuId = useId();
  const year = new Date().getFullYear();

  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [router.asPath]);

  useEffect(() => {
    if (!openGroup) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <div className={`${classes.wrap} ${classes.headerInner}`}>
          <Link href="/" className={classes.brand} aria-label="KenManage home">
            <img className={classes.brandLogo} src={LOGO_SRC} alt="" />
            <span className={classes.brandName}>KenManage</span>
          </Link>
          <nav className={classes.nav} aria-label="KenManage" ref={navRef}>
            {NAV_GROUPS.map((group) => {
              const expanded = openGroup === group.id;
              const panelId = `${menuId}-${group.id}`;
              return (
                <div
                  key={group.id}
                  className={classes.navGroup}
                  data-open={expanded ? "true" : "false"}
                >
                  <button
                    type="button"
                    className={classes.navLink}
                    data-active={
                      groupHasActive(router.pathname, router.asPath, group) || expanded
                        ? "true"
                        : "false"
                    }
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenGroup((current) => (current === group.id ? null : group.id))
                    }
                  >
                    {group.label}
                  </button>
                  <div
                    id={panelId}
                    className={classes.navPanel}
                    role="region"
                    aria-label={group.label}
                    hidden={!expanded}
                  >
                    <p className={classes.navPanelLabel}>{group.label}</p>
                    {group.items.map((item) => (
                      <NavItemLink
                        key={`${group.id}-${item.label}`}
                        item={item}
                        className={classes.navPanelLink}
                        active={isItemActive(router.pathname, router.asPath, item)}
                        onNavigate={() => setOpenGroup(null)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            <Link href="/#start" className={classes.loginLink}>
              Get started
            </Link>
          </nav>
          <button
            type="button"
            className={classes.menuButton}
            aria-expanded={mobileOpen}
            aria-controls="marketing-menu"
            onClick={() => setMobileOpen((value) => !value)}
          >
            Menu
          </button>
        </div>
        <div
          id="marketing-menu"
          className={`${classes.wrap} ${classes.mobileNav}`}
          data-open={mobileOpen ? "true" : "false"}
          hidden={!mobileOpen}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className={classes.mobileNavGroup}>
              <p className={classes.mobileNavHeading}>{group.label}</p>
              {group.items.map((item) => (
                <NavItemLink
                  key={`mobile-${group.id}-${item.label}`}
                  item={item}
                  className={classes.mobileNavLink}
                  active={isItemActive(router.pathname, router.asPath, item)}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          ))}
          <Link
            href="/#start"
            className={classes.mobileNavCta}
            onClick={() => setMobileOpen(false)}
          >
            Get started
          </Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className={classes.footer}>
        <div className={`${classes.wrap} ${classes.footerSimple}`}>
          <p className={classes.footerCopy}>
            © {year} KenManage. Free software under AGPL-3.0.
          </p>
          <p className={classes.footerContact}>
            Contact:{" "}
            <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
