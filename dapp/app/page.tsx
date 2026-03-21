import { Navbar } from "@/components/landing/navbar"
import {
  Hero,
  Stats,
  Problem,
  HowItWorks,
  Features,
  AgentConsole,
  Market,
  CtaFooter,
} from "@/components/landing/sections"

export default function Home() {
  return (
    <main className="min-h-screen bg-darker-bg">
      <Navbar />
      <Hero />
      <Stats />
      <Problem />
      <HowItWorks />
      <AgentConsole />
      <Market />
      <Features />
      <CtaFooter />
    </main>
  )
}
