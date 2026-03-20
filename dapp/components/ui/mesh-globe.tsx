"use client"

import { useEffect, useRef } from "react"

export function MeshGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 400
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = size * 0.38

    let rotation = 0
    let animationId: number

    const drawGlobe = () => {
      ctx.clearRect(0, 0, size, size)

      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.8,
        centerX,
        centerY,
        radius * 1.4
      )
      gradient.addColorStop(0, "rgba(0, 229, 255, 0.05)")
      gradient.addColorStop(0.5, "rgba(124, 77, 255, 0.03)")
      gradient.addColorStop(1, "transparent")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, size, size)

      const latitudeLines = 8
      for (let i = 1; i < latitudeLines; i++) {
        const lat = (i / latitudeLines) * Math.PI - Math.PI / 2
        const y = centerY - Math.sin(lat) * radius
        const lineRadius = Math.cos(lat) * radius

        if (lineRadius > 0) {
          ctx.beginPath()
          ctx.ellipse(centerX, y, lineRadius, lineRadius * 0.3, 0, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(0, 229, 255, ${0.2 + Math.cos(lat) * 0.15})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      const longitudeLines = 12
      for (let i = 0; i < longitudeLines; i++) {
        const lng = (i / longitudeLines) * Math.PI * 2 + rotation

        ctx.beginPath()
        for (let j = 0; j <= 50; j++) {
          const lat = (j / 50) * Math.PI - Math.PI / 2
          const x = centerX + Math.cos(lat) * Math.sin(lng) * radius
          const y = centerY - Math.sin(lat) * radius
          const z = Math.cos(lat) * Math.cos(lng)

          if (z > -0.2) {
            if (j === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
        }
        const opacity = 0.15 + (Math.sin(lng) + 1) * 0.15
        ctx.strokeStyle = `rgba(124, 77, 255, ${opacity})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      const nodeCount = 30
      for (let i = 0; i < nodeCount; i++) {
        const lat = Math.random() * Math.PI - Math.PI / 2
        const lng = Math.random() * Math.PI * 2 + rotation

        const x = centerX + Math.cos(lat) * Math.sin(lng) * radius
        const y = centerY - Math.sin(lat) * radius
        const z = Math.cos(lat) * Math.cos(lng)

        if (z > 0) {
          const nodeGradient = ctx.createRadialGradient(x, y, 0, x, y, 4)
          nodeGradient.addColorStop(0, `rgba(0, 229, 255, ${0.8 * z})`)
          nodeGradient.addColorStop(0.5, `rgba(0, 229, 255, ${0.3 * z})`)
          nodeGradient.addColorStop(1, "transparent")

          ctx.beginPath()
          ctx.arc(x, y, 4, 0, Math.PI * 2)
          ctx.fillStyle = nodeGradient
          ctx.fill()
        }
      }

      const centerGlow = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        0,
        centerX,
        centerY,
        radius
      )
      centerGlow.addColorStop(0, "rgba(255, 255, 255, 0.03)")
      centerGlow.addColorStop(0.5, "transparent")
      ctx.fillStyle = centerGlow
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(0, 229, 255, 0.3)"
      ctx.lineWidth = 2
      ctx.stroke()

      rotation += 0.003
      animationId = requestAnimationFrame(drawGlobe)
    }

    drawGlobe()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan/10 via-purple/5 to-transparent blur-3xl" />
      <canvas
        ref={canvasRef}
        className="relative z-10"
        style={{ width: 400, height: 400 }}
      />
    </div>
  )
}
