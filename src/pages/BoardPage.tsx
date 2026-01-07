import { useState } from "react"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import Board from "@/components/board/Board"
import ArchivedBoard from "@/components/board/ArchivedBoard"

export default function BoardPage() {
  const [currentView, setCurrentView] = useState<'board' | 'archived'>('board')

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[260px_1fr] md:grid-rows-[auto_1fr] bg-background">
      <div className="md:col-span-2">
        <Header />
      </div>
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <main className="overflow-hidden relative">
        <div className={`h-full w-full transition-opacity duration-300 ${currentView === 'board' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none absolute inset-0 -z-10'}`}>
           <Board />
        </div>
        
        {currentView === 'archived' && (
          <div className="h-full w-full animate-in fade-in slide-in-from-bottom-4 duration-300 absolute inset-0 z-20 bg-background">
            <ArchivedBoard />
          </div>
        )}
      </main>
    </div>
  )
}
