import { VaporwaveCounterSimple } from "@/components/vaporwave-counter-simple"
import { VaporwaveCounterRatio } from "@/components/vaporwave-counter-ratio"
import { Package, Hammer } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-vaporwave-bg to-background p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-4xl font-bold text-vaporwave-text font-mono [text-shadow:0_0_30px_rgba(0,255,255,0.5)]">
          Set Collection Dashboard
        </h1>
        <div className="grid gap-6 md:grid-cols-2">
          <VaporwaveCounterSimple
            title="Total Sets Owned"
            initialValue={25}
            icon={<Package className="h-4 w-4 text-vaporwave-cyan" />}
            step={1}
          />
          <VaporwaveCounterRatio
            title="Sets Built"
            initialValue={18}
            total={25}
            icon={<Hammer className="h-4 w-4 text-vaporwave-pink" />}
            step={1}
          />
        </div>
      </div>
    </div>
  )
}
