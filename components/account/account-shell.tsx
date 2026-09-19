'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  Bell,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  UserRound,
} from 'lucide-react';

import { logoutAction } from '@/app/actions/auth';
import type { CurrentCustomer } from '@/lib/auth/session';

const navigation = [
  { href: '/mi-cuenta', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/mi-cuenta/suscripciones', label: 'Mis suscripciones', icon: CreditCard },
  { href: '/mi-cuenta/pedidos', label: 'Mis pedidos', icon: ShoppingBag },
  { href: '/mi-cuenta/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/mi-cuenta/soporte', label: 'Soporte y garantía', icon: CircleHelp },
  { href: '/mi-cuenta/perfil', label: 'Mi perfil', icon: UserRound },
] as const;

export function AccountShell({
  customer,
  unreadCount,
  children,
}: {
  customer: CurrentCustomer;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <main className="account-app">
      <header className="account-topbar">
        <div className="account-topbar__inner">
          <Link className="account-brand" href="/">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span>DoraPass</span>
          </Link>
          <nav className="account-topnav" aria-label="Navegación principal">
            <Link href="/"><BookOpenCheck /> Catálogo</Link>
            <Link className="account-topnav__active" href="/mi-cuenta/suscripciones"><CreditCard /> Mis suscripciones</Link>
          </nav>
          <div className="account-user-menu">
            <Link className="account-notification-trigger" href="/mi-cuenta/notificaciones" aria-label={`${unreadCount} notificaciones sin leer`}>
              <Bell />{unreadCount > 0 ? <span>{unreadCount}</span> : null}
            </Link>
            <Link className="account-user" href="/mi-cuenta/perfil">
              <span className="account-avatar">{customer.initials}</span>
              <span>{customer.firstName}</span>
              <ChevronDown />
            </Link>
          </div>
        </div>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <details className="account-mobile-menu">
            <summary><Menu /> Menú de mi cuenta <ChevronDown /></summary>
            <div className="account-mobile-menu__links">
              {navigation.map((item) => {
                const active = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return <AccountNavLink key={item.href} item={item} active={active} unreadCount={unreadCount} />;
              })}
              <form className="account-mobile-logout" action={logoutAction}>
                <button type="submit"><LogOut /> <span>Cerrar sesión</span></button>
              </form>
            </div>
          </details>
          <nav className="account-side-nav" aria-label="Mi cuenta">
            {navigation.map((item) => {
              const active = 'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return <AccountNavLink key={item.href} item={item} active={active} unreadCount={unreadCount} />;
            })}
          </nav>
          <form className="account-logout" action={logoutAction}>
            <button type="submit"><LogOut /> Cerrar sesión</button>
          </form>
        </aside>
        <section className="account-main">{children}</section>
      </div>
    </main>
  );
}

function AccountNavLink({
  item,
  active,
  unreadCount,
}: {
  item: (typeof navigation)[number];
  active: boolean;
  unreadCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link className={active ? 'account-nav-link account-nav-link--active' : 'account-nav-link'} href={item.href}>
      <Icon /> <span>{item.label}</span>
      {item.href.endsWith('notificaciones') && unreadCount > 0 ? <b>{unreadCount}</b> : null}
    </Link>
  );
}
