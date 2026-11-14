import {
  ActionIcon,
  AppShell,
  Burger,
  Center,
  Container,
  Group,
  Menu,
  Text,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Icon, IconMoonStars, IconSun } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { ReactNode } from "react";

import { CONTACT_EMAIL, CONTACT_MAILTO } from "../components/marketing/fixtures";
import { Brand } from "../components/navbar/_brand";
import {
  getBaseLinks,
  getBaseLinksDict,
} from "../components/navbar/_main_links";
import { UserMenu } from "../components/navbar/_user_menu";
import classes from "./_layout.module.css";

interface HeaderActionLink {
  link: string | null;
  label: string;
  icon: Icon;
  links: { link: string; label: string; icon: Icon }[];
}

interface HeaderActionProps {
  links: HeaderActionLink[];
  navbarState: any;
  breadcrumbs: ReactNode;
}

function getMenuItemsForLink(
  link: HeaderActionLink,
  _classes: any,
  pathName: string
) {
  const menuItems = link.links?.map((item) => (
    <Link
      key={item.label}
      href={item.link}
      className={classes.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Group gap="xs" justify="flex-start" wrap="nowrap">
        <item.icon size={16} stroke={1.5} />
        <span>{item.label}</span>
      </Group>
    </Link>
  ));
  return (
    <Menu
      key={link.label}
      trigger="click-hover"
      transitionProps={{ exitDuration: 0 }}
      withinPortal
    >
      <Menu.Target>
        {link.link ? (
          <Link
            href={link.link}
            className={classes.link}
            data-active={pathName === link.link || undefined}
          >
            {link.label}
          </Link>
        ) : (
          <button type="button" className={classes.link}>
            {link.label}
          </button>
        )}
      </Menu.Target>
      {menuItems.length > 0 ? <Menu.Dropdown>{menuItems}</Menu.Dropdown> : null}
    </Menu>
  );
}

export function HeaderAction({
  links,
  navbarState,
  breadcrumbs,
}: HeaderActionProps) {
  const router = useRouter();
  const pathName = router.pathname;

  const [opened, { toggle }] =
    navbarState != null ? navbarState : [false, { toggle: () => {} }];
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });

  const items = links.map((link) => {
    if (link.links) {
      return getMenuItemsForLink(link, classes, pathName);
    }

    return (
      <Link
        key={link.label}
        className={classes.link}
        href={link.link || ""}
        data-active={pathName === link.link || undefined}
      >
        {link.label}
      </Link>
    );
  });
  return (
    <AppShell.Header>
      <Container className={classes.inner} fluid>
        <Center>
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="sm"
            size="sm"
            mr="xs"
          />
          <Brand />
          <Group visibleFrom="md" mt="0.2rem">
            {breadcrumbs}
          </Group>
        </Center>
        <Group gap="xs" className={classes.links}>
          <Group gap={5} visibleFrom="sm">
            {items}
          </Group>
          <UserMenu />
          {/* Dark mode toggle hidden for now — keep wired so it can be re-enabled easily */}
          {false && (
            <ActionIcon
              variant="default"
              onClick={() =>
                setColorScheme(
                  computedColorScheme === "light" ? "dark" : "light",
                )
              }
              size={30}
            >
              <IconSun size={16} className={classes.light} />
              <IconMoonStars size={16} className={classes.dark} />
            </ActionIcon>
          )}
        </Group>
      </Container>
    </AppShell.Header>
  );
}

function NavBar({ links }: any) {
  return (
    <AppShell.Navbar p="md">
      {links == null ? (
        <AppShell.Section grow>
          <div />
        </AppShell.Section>
      ) : (
        links
      )}
    </AppShell.Navbar>
  );
}

export default function Layout({
  children,
  additionalNavbarLinks,
  breadcrumbs,
}: any) {
  const navbarState = useDisclosure();
  const [opened] = navbarState;

  const linksComponent = (
    <AppShell.Section grow>
      {getBaseLinks()}
      {additionalNavbarLinks}
    </AppShell.Section>
  );

  const year = new Date().getFullYear();

  return (
    <AppShell
      header={{ height: 60 }}
      footer={{ height: 44 }}
      navbar={{
        width: 80,
        breakpoint: "sm",
        collapsed: {
          desktop:
            additionalNavbarLinks == null || additionalNavbarLinks.length < 1,
          mobile: !opened,
        },
      }}
      padding="md"
    >
      <HeaderAction
        links={getBaseLinksDict()}
        navbarState={navbarState}
        breadcrumbs={breadcrumbs}
      />
      <NavBar links={linksComponent} />
      <AppShell.Main>{children}</AppShell.Main>
      <AppShell.Footer className={classes.footer}>
        <Container fluid className={classes.footerInner}>
          <Text size="xs" c="dimmed">
            © {year} KenManage. Free software under AGPL-3.0.
          </Text>
          <Text size="xs" c="dimmed">
            Contact:{" "}
            <a href={CONTACT_MAILTO} className={classes.footerLink}>
              {CONTACT_EMAIL}
            </a>
          </Text>
        </Container>
      </AppShell.Footer>
    </AppShell>
  );
}
