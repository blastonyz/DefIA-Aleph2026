import { Navbar } from "@/components/landing/navbar"
import {
  Hero,
  Stats,
  Features,
  CodePreview,
  AgentConsole,
  Tokenomics,
  Roadmap,
  CtaFooter,
} from "@/components/landing/sections"

export default function Home() {
  return (
    <main className="min-h-screen bg-darker-bg">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <CodePreview />
      <AgentConsole />
      <Tokenomics />
      <Roadmap />
      <CtaFooter />
    </main>
  )
}
