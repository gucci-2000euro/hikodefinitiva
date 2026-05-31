interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <img
      src="/hiko_logo.png"
      alt="Hiko"
      height={size}
      style={{ height: size, width: 'auto' }}
      className={className}
      aria-label="Hiko"
      data-testid="logo-hiko"
    />
  );
}
