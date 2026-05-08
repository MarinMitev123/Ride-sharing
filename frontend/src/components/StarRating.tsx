import { useState } from 'react'

type StarRatingProps = {
  value: number
  max?: number
  onChange?: (value: number) => void
  /** Ако е true – само показва, без hover/click. */
  readOnly?: boolean
  /** Размер в пиксели на звездата. */
  size?: number
}

export function StarRating({ value, max = 5, onChange, readOnly, size = 20 }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const displayValue = hovered ?? value

  return (
    <div className="star-rating" aria-label="Оценка със звезди">
      {Array.from({ length: max }).map((_, index) => {
        const starValue = index + 1
        const filled = displayValue >= starValue
        return (
          <button
            key={starValue}
            type="button"
            className={`star-rating-star${filled ? ' star-rating-star--filled' : ''}${readOnly ? ' star-rating-star--read-only' : ''}`}
            style={{ width: size, height: size }}
            onMouseEnter={() => !readOnly && setHovered(starValue)}
            onMouseLeave={() => !readOnly && setHovered(null)}
            onClick={() => !readOnly && onChange && onChange(starValue)}
            aria-label={`${starValue} от ${max}`}
            disabled={readOnly}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}

