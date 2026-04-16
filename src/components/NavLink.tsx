import { Link, type LinkProps } from "@tanstack/react-router";
import { forwardRef } from "react";

export interface NavLinkProps extends Omit<LinkProps, "activeProps" | "inactiveProps"> {
  className?: string;
  children?: React.ReactNode;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(({ className, children, end, ...props }, ref) => {
  return (
    <Link
      ref={ref as any}
      {...(props as any)}
      activeOptions={end ? { exact: true } : undefined}
      className={className}
      activeProps={{ "data-active": "true" } as any}
    >
      {children}
    </Link>
  );
});
NavLink.displayName = "NavLink";
export default NavLink;
