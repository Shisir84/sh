import {
  Coins,
  Crown,
  Gift,
  KeyRound,
  PawPrint,
  Shirt,
  Star,
} from 'lucide-react';

export function CategoryIcon({
  icon,
  className = 'w-4 h-4',
}: {
  icon: string;
  className?: string;
}) {
  switch (icon.toLowerCase()) {
    case 'crown':
      return <Crown className={className} aria-hidden="true" />;
    case 'key':
      return <KeyRound className={className} aria-hidden="true" />;
    case 'gift':
      return <Gift className={className} aria-hidden="true" />;
    case 'paw':
      return <PawPrint className={className} aria-hidden="true" />;
    case 'shirt':
      return <Shirt className={className} aria-hidden="true" />;
    case 'coins':
      return <Coins className={className} aria-hidden="true" />;
    default:
      return <Star className={className} aria-hidden="true" />;
  }
}
