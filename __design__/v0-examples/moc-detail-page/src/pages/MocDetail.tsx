"use client"
import { useState, useEffect, useCallback } from "react"
import type React from "react"

import { MocCoverCard } from "../components/moc/MocCoverCard"
import { MocMetaCard } from "../components/moc/MocMetaCard"
import { MocPartsListsCardContent } from "../components/moc/MocPartsListsCard"
import { MocInstructionsCardContent } from "../components/moc/MocInstructionsCard"
import { MocGalleryCardContent } from "../components/moc/MocGalleryCard"
import { MocStatsCard } from "../components/moc/MocStatsCard"
import { MocPartsGauge } from "../components/moc/MocPartsGauge"
import { MocOrdersCardContent } from "../components/moc/MocOrdersCard"
import { DashboardCard } from "../components/moc/DashboardCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Moon, Sun, FileText, FileSpreadsheet, ImageIcon, ShoppingCart } from "lucide-react"
import type { Moc } from "../components/moc/mocTypes"

const MOCK_MOC: Moc = {
  id: "moc-001",
  title: "Imperial Star Destroyer",
  description:
    "A highly detailed MOC of the iconic Imperial Star Destroyer from Star Wars. This build features an accurate wedge shape, intricate surface detailing, and a display stand. The model uses over 4,500 pieces and measures approximately 90cm in length. Perfect for advanced builders looking for a challenging and rewarding project.",
  tags: ["Star Wars", "UCS Scale", "Display Model", "Advanced"],
  coverImageUrl: "/lego-star-destroyer-spaceship.jpg",
  instructionsPdfUrls: [
    "https://example.com/instructions/star-destroyer-part1.pdf",
    "https://example.com/instructions/star-destroyer-part2.pdf",
  ],
  partsLists: [
    { id: "pl-1", url: "#", filename: "main-parts.csv" },
    { id: "pl-2", url: "#", filename: "technic-parts.xml" },
  ],
  galleryImages: [
    { id: "img-1", url: "/lego-star-destroyer-front-view.jpg" },
    { id: "img-2", url: "/lego-star-destroyer-side-angle.jpg" },
    { id: "img-3", url: "/lego-star-destroyer-bridge-detail.jpg" },
    { id: "img-4", url: "/lego-star-destroyer-engines-back.jpg" },
    { id: "img-5", url: "/lego-star-destroyer-display-stand.jpg" },
    { id: "img-6", url: "/lego-star-destroyer-scale-comparison.jpg" },
  ],
  updatedAt: "2024-12-15T10:30:00Z",
  publishDate: "2024-06-20T00:00:00Z",
  purchasedDate: "2024-07-01T00:00:00Z",
  author: {
    displayName: "BrickMaster42",
    url: "https://rebrickable.com/users/brickmaster42",
  },
  partsCount: 4523,
  partsOwned: 3412,
  orders: [
    {
      id: "order-1",
      storeName: "BrickLink",
      storeUrl: "https://www.bricklink.com",
      orderDate: "2024-07-15T00:00:00Z",
      status: "delivered",
      partsCount: 1850,
      totalPrice: 245.99,
      currency: "USD",
    },
    {
      id: "order-2",
      storeName: "BrickOwl",
      storeUrl: "https://www.brickowl.com",
      orderDate: "2024-08-02T00:00:00Z",
      status: "delivered",
      partsCount: 962,
      totalPrice: 128.5,
      currency: "USD",
    },
    {
      id: "order-3",
      storeName: "Webrick",
      storeUrl: "https://www.webrick.com",
      orderDate: "2024-09-10T00:00:00Z",
      status: "shipped",
      partsCount: 600,
      totalPrice: 89.0,
      currency: "USD",
      trackingUrl: "https://tracking.example.com/123456",
    },
    {
      id: "order-4",
      storeName: "GoBricks Store",
      orderDate: "2024-10-01T00:00:00Z",
      status: "pending",
      partsCount: 450,
      totalPrice: 62.0,
      currency: "USD",
    },
  ],
}

type DashboardCardId = "orders" | "partsLists" | "instructions" | "gallery"

interface DashboardCardConfig {
  id: DashboardCardId
  title: string
  icon: React.ReactNode
}

const DEFAULT_CARD_ORDER: DashboardCardId[] = ["orders", "partsLists", "instructions", "gallery"]

export default function MocDetail() {
  const moc = MOCK_MOC
  const [isDark, setIsDark] = useState(false)
  const [cardOrder, setCardOrder] = useState<DashboardCardId[]>(DEFAULT_CARD_ORDER)
  const [draggedCardId, setDraggedCardId] = useState<DashboardCardId | null>(null)
  const [dragOverCardId, setDragOverCardId] = useState<DashboardCardId | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(stored === "dark" || (!stored && prefersDark))
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark])

  useEffect(() => {
    const savedOrder = localStorage.getItem("mocDashboardCardOrder")
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder)
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CARD_ORDER.length) {
          setCardOrder(parsed)
        }
      } catch {
        // Ignore invalid JSON
      }
    }
  }, [])

  const handleDragStart = useCallback(
    (cardId: DashboardCardId) => (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = "move"
      setDraggedCardId(cardId)
    },
    [],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedCardId(null)
    setDragOverCardId(null)
  }, [])

  const handleDragOver = useCallback(
    (cardId: DashboardCardId) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      setDragOverCardId(cardId)
    },
    [],
  )

  const handleDrop = useCallback(
    (dropCardId: DashboardCardId) => (e: React.DragEvent) => {
      e.preventDefault()
      if (!draggedCardId || draggedCardId === dropCardId) {
        setDragOverCardId(null)
        return
      }

      setCardOrder((prev) => {
        const newOrder = [...prev]
        const draggedIndex = newOrder.indexOf(draggedCardId)
        const dropIndex = newOrder.indexOf(dropCardId)
        newOrder.splice(draggedIndex, 1)
        newOrder.splice(dropIndex, 0, draggedCardId)
        // Persist to localStorage
        localStorage.setItem("mocDashboardCardOrder", JSON.stringify(newOrder))
        return newOrder
      })

      setDraggedCardId(null)
      setDragOverCardId(null)
    },
    [draggedCardId],
  )

  const cardConfigs: Record<DashboardCardId, DashboardCardConfig> = {
    orders: {
      id: "orders",
      title: "Parts Orders",
      icon: <ShoppingCart className="h-4 w-4 text-primary" />,
    },
    partsLists: {
      id: "partsLists",
      title: "Parts Lists",
      icon: <FileSpreadsheet className="h-4 w-4 text-primary" />,
    },
    instructions: {
      id: "instructions",
      title: "Instructions",
      icon: <FileText className="h-4 w-4 text-rose-500" />,
    },
    gallery: {
      id: "gallery",
      title: "Gallery",
      icon: <ImageIcon className="h-4 w-4 text-primary" />,
    },
  }

  const renderCardContent = (cardId: DashboardCardId) => {
    switch (cardId) {
      case "orders":
        return (
          <DashboardCard
            id="orders"
            title="Parts Orders"
            titleIcon={<ShoppingCart className="h-4 w-4 text-primary" />}
            badge={
              moc.orders && moc.orders.length > 0 ? (
                <Badge variant="secondary" className="text-xs animate-in fade-in duration-300">
                  {moc.orders.length}
                </Badge>
              ) : null
            }
            actions={
              <Button size="sm" className="gap-1.5 transition-all hover:scale-105 active:scale-95">
                Add Order
              </Button>
            }
            onDragStart={handleDragStart("orders")}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver("orders")}
            onDrop={handleDrop("orders")}
            isDragging={draggedCardId === "orders"}
            isDragOver={dragOverCardId === "orders"}
          >
            <MocOrdersCardContent orders={moc.orders ?? []} />
          </DashboardCard>
        )
      case "partsLists":
        return (
          <DashboardCard
            id="partsLists"
            title="Parts Lists"
            titleIcon={<FileSpreadsheet className="h-4 w-4 text-primary" />}
            onDragStart={handleDragStart("partsLists")}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver("partsLists")}
            onDrop={handleDrop("partsLists")}
            isDragging={draggedCardId === "partsLists"}
            isDragOver={dragOverCardId === "partsLists"}
          >
            <MocPartsListsCardContent partsLists={moc.partsLists} />
          </DashboardCard>
        )
      case "instructions":
        return (
          <DashboardCard
            id="instructions"
            title="Instructions"
            titleIcon={<FileText className="h-4 w-4 text-rose-500" />}
            onDragStart={handleDragStart("instructions")}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver("instructions")}
            onDrop={handleDrop("instructions")}
            isDragging={draggedCardId === "instructions"}
            isDragOver={dragOverCardId === "instructions"}
          >
            <MocInstructionsCardContent instructionsPdfUrls={moc.instructionsPdfUrls} />
          </DashboardCard>
        )
      case "gallery":
        return (
          <DashboardCard
            id="gallery"
            title="Gallery"
            titleIcon={<ImageIcon className="h-4 w-4 text-primary" />}
            badge={
              <span className="text-sm font-normal text-primary animate-in fade-in duration-300">
                ({moc.galleryImages.length}/50)
              </span>
            }
            onDragStart={handleDragStart("gallery")}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver("gallery")}
            onDrop={handleDrop("gallery")}
            isDragging={draggedCardId === "gallery"}
            isDragOver={dragOverCardId === "gallery"}
          >
            <MocGalleryCardContent galleryImages={moc.galleryImages} />
          </DashboardCard>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">MOC Library</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="transition-all hover:scale-110 active:scale-95"
          >
            {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 xl:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
          {/* Left column: Cover + Metadata (sticky on desktop) */}
          <aside className="xl:col-span-4 2xl:col-span-3 space-y-6 xl:sticky xl:top-20 xl:self-start">
            <MocCoverCard coverImageUrl={moc.coverImageUrl} title={moc.title} />
            <MocMetaCard
              title={moc.title}
              author={moc.author}
              description={moc.description}
              tags={moc.tags}
              updatedAt={moc.updatedAt}
              publishDate={moc.publishDate}
              purchasedDate={moc.purchasedDate}
            />
          </aside>

          {/* Right column: Dashboard cards */}
          <main className="xl:col-span-8 2xl:col-span-9 space-y-6">
            <MocStatsCard
              partsCount={moc.partsCount}
              galleryCount={moc.galleryImages.length}
              instructionsCount={moc.instructionsPdfUrls.length}
              partsListsCount={moc.partsLists.length}
            />
            <MocPartsGauge partsOwned={moc.partsOwned ?? 0} partsTotal={moc.partsCount ?? 0} />

            {cardOrder.map((cardId) => (
              <div key={cardId} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderCardContent(cardId)}
              </div>
            ))}
          </main>
        </div>
      </div>
    </div>
  )
}
