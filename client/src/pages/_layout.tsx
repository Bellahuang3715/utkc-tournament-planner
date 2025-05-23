import {
  ActionIcon,
  AppShell,
  Burger,
  Center,
  Container,
  Group,
  Menu,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Icon, IconMoonStars, IconSun } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { ReactNode } from "react";

import { Brand } from "../components/navbar/_brand";
import {
  getBaseLinks,
  getBaseLinksDict,
} from "../components/navbar/_main_links";
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
    <Link key={item.label} href={item.link} passHref>
      <Center>
        <item.icon />
        <span style={{ marginLeft: "0.25rem", marginTop: "0.2rem" }}>
          {item.label}
        </span>
        </Center>
    </Link>
  ));
  return (
    <Menu
      key={link.label}
      trigger="hover"
      transitionProps={{ exitDuration: 0 }}
      withinPortal
    >
      <Menu.Target>
        <Link href={link.link || ""} passHref>
          <span
            className={classes.link}
            data-active={pathName === link.link || undefined}
          >
            {link.label}
          </span>
        </Link>
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
        <Group gap={5} className={classes.links} visibleFrom="sm">
          {items}
          <ActionIcon
            variant="default"
            onClick={() =>
              setColorScheme(computedColorScheme === "light" ? "dark" : "light")
            }
            size={30}
            ml="1rem"
          >
            <IconSun size={16} className={classes.light} />
            <IconMoonStars size={16} className={classes.dark} />
          </ActionIcon>
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

  return (
    <AppShell
      header={{ height: 60 }}
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
    </AppShell>
  );
}
