'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  BookOpenCheck,
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MonitorCog,
  PackageSearch,
  Settings,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';

import { logoutAction } from '@/app/actions/auth';
import type { CurrentCustomer } from '@/lib/auth/session';

const navigation = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/inventario', label: 'Inventario', icon: Boxes },
  { href: '/admin/solicitudes', label: 'Solicitudes de stock', icon: PackageSearch },
  { href: '/admin/promociones', label: 'Promociones', icon: Megaphone },
  { href: '/admin/asignaciones', label: 'Asignaciones', icon: UserRoundCheck },
  { href: '/admin/suscripciones', label: 'Suscripciones', icon: CreditCard },
  { href: '/admin/clientes', label: 'Clientes', icon: UsersRound },
  { href: '/admin/incidencias', label: 'Incidencias', icon: ShieldAlert },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
] as const;

export function AdminShell({
  admin,
  children,
}: {
  admin: CurrentCustomer;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <main className="account-app admin-app">
      <header className="account-topbar">
        <div className="account-topbar__inner">
          <Link className="account-brand" href="/">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span>DoraPass</span>
          </Link>
          <nav className="account-topnav" aria-label="Navegación administrativa">
            <Link className="account-topnav__active" href="/admin"><MonitorCog /> Panel administrador</Link>
            <Link href="/"><BookOpenCheck /> Catálogo</Link>
          </nav>
          <div className="account-user-menu">
            <Link className="account-user" href="/admin">
              <span className="account-avatar">{admin.initials}</span>
              <span>Administrador</span>
              <ChevronDown />
            </Link>
          </div>
        </div>
      </header>

      <div className="account-layout">
        <aside className="account-sidebar">
          <details className="account-mobile-menu">
            <summary><Menu /> Menú administrador <ChevronDown /></summary>
            <div className="account-mobile-menu__links">
              {navigation.map((item) => (
                <AdminNavLink
                  key={item.href}
                  item={item}
                  active={'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)}
                />
              ))}
              <form className="account-mobile-logout" action={logoutAction}>
                <button type="submit"><LogOut /> <span>Cerrar sesión</span></button>
              </form>
            </div>
          </details>

          <nav className="account-side-nav" aria-label="Panel administrador">
            {navigation.map((item) => (
              <AdminNavLink
                key={item.href}
                item={item}
                active={'exact' in item && item.exact ? pathname === item.href : pathname.startsWith(item.href)}
              />
            ))}
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

function AdminNavLink({
  item,
  active,
}: {
  item: (typeof navigation)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      className={active ? 'account-nav-link account-nav-link--active' : 'account-nav-link'}
      href={item.href}
    >
      <Icon /> <span>{item.label}</span>
    </Link>
  );
}
