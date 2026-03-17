import { useEffect, useRef, useState } from 'react'

/**
 * Хук за scroll-reveal: добавя клас когато елементът влезе в зоната на видимост.
 * Използвай ref на контейнера и className "scroll-reveal" + "scroll-reveal-visible" при inView.
 */
export function useInView(options?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<HTMLElement | null>(null)
  const [inView, setInView] = useState(false)
  const threshold = options?.threshold ?? 0.1
  const rootMargin = options?.rootMargin ?? '0px 0px -40px 0px'

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setInView(true)
        })
      },
      { threshold, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, inView }
}
