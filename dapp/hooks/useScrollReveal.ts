"use client"

import { useEffect, useRef } from "react"

export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        element.classList.add("is-visible")
        observer.disconnect()
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return ref
}