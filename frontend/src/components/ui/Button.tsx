import Link from "next/link";
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "hero";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  hero: "btn-hero",
};

const sizeClass: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

function classes(variant: Variant, size: Size, className?: string) {
  return clsx(variantClass[variant], sizeClass[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={classes(variant, size, className)} {...props} />;
}
