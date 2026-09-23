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
  const isLight = variant === 'light';
  const heights = size === 'sm' ? 'h-8' : 'h-10';

  return (
    <img
      src={isLight ? '/bs-consulting-logo-light.png' : '/bs-consulting-logo.png'}
      alt="BS-Consulting"
      aria-label="bserviceconsulting"
      className={`${heights} w-auto max-w-[148px] object-contain object-left ${className}`}
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
