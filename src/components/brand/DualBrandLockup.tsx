type DualBrandLockupProps = {
  variant?: 'color' | 'light';
  className?: string;
  size?: 'sm' | 'md';
};

export function DualBrandLockup({
  variant = 'color',
  className = '',
  size = 'md',
}: DualBrandLockupProps) {
  const heights = size === 'sm' ? 'h-8' : 'h-10';
  const src = variant === 'light' ? '/bs-consulting-logo-on-dark.png?v=1' : '/bs-consulting-logo.png?v=2';

  return (
    <img
      src={src}
      alt="BS-Consulting"
      aria-label="BS Consulting"
      className={`${heights} w-auto max-w-[200px] bg-transparent object-contain object-left ${className}`}
      decoding="async"
    />
  );
}

export function ProductTitle({
  className = '',
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <p className={`font-extrabold tracking-tight ${className}`}>
      <span className={light ? 'text-white' : 'text-[#005DA4]'}>bservice</span>
      <span className={light ? 'text-[#F6A04D]' : 'text-[#F4811F]'}>consulting</span>
    </p>
  );
}
