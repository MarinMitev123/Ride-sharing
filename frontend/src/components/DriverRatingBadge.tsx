import { StarRating } from './StarRating'

type DriverRatingBadgeProps = {
  rating: number
  size?: number
  showLabel?: boolean
}

export function DriverRatingBadge({ rating, size = 14, showLabel = true }: DriverRatingBadgeProps) {
  return (
    <span className="driver-rating-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <StarRating value={rating} readOnly size={size} />
      {showLabel && (
        <span style={{ fontSize: size >= 16 ? 14 : 13, color: '#475569', fontWeight: 600 }}>
          {Number(rating).toFixed(1)}
        </span>
      )}
    </span>
  )
}
