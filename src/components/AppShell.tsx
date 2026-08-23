"use client";

import { LinkProvider, Sidebar, Text } from "@cloudflare/kumo";
import { BooksIcon, HouseIcon, PlusIcon, TrayArrowDownIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { AppLink } from "./AppLink";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LinkProvider component={AppLink}>
      <Sidebar.Provider defaultOpen peekable>
        <div className="flex min-h-svh bg-kumo-canvas">
          <Sidebar fullScreenOnMobile>
            <Sidebar.Header>
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <div className="flex items-center gap-2">
                  <BooksIcon size={20} className="text-kumo-brand" />
                  <div>
                    <Text variant="heading" as="p">
                      積読棚
                    </Text>
                    <Text variant="secondary" size="xs">
                      Tsundoku
                    </Text>
                  </div>
                </div>
                <Sidebar.Close />
              </div>
            </Sidebar.Header>
            <Sidebar.Content>
              <Sidebar.Group>
                <Sidebar.GroupLabel>ナビ</Sidebar.GroupLabel>
                <Sidebar.Menu>
                  <Sidebar.MenuButton href="/" icon={HouseIcon} active={pathname === "/"} tooltip="本棚">
                    本棚
                  </Sidebar.MenuButton>
                  <Sidebar.MenuButton
                    href="/add"
                    icon={PlusIcon}
                    active={pathname.startsWith("/add")}
                    tooltip="追加"
                  >
                    追加
                  </Sidebar.MenuButton>
                  <Sidebar.MenuButton
                    href="/import"
                    icon={TrayArrowDownIcon}
                    active={pathname.startsWith("/import")}
                    tooltip="取込"
                  >
                    取込
                  </Sidebar.MenuButton>
                </Sidebar.Menu>
              </Sidebar.Group>
            </Sidebar.Content>
            <Sidebar.Footer>
              <Sidebar.Trigger />
            </Sidebar.Footer>
          </Sidebar>
          <main className="min-w-0 flex-1">
            <div className="flex items-center gap-2 border-b border-kumo-hairline px-4 py-3 md:hidden">
              <Sidebar.Trigger />
              <Text variant="heading" as="p">
                積読棚
              </Text>
            </div>
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </main>
        </div>
      </Sidebar.Provider>
    </LinkProvider>
  );
}
