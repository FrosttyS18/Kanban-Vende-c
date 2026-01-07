import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"
import Board from "@/components/board/Board"

export default function BoardPage() {
  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[260px_1fr] md:grid-rows-[auto_1fr] bg-background">
      <div className="md:col-span-2">
        <Header />
      </div>
      <Sidebar />
      <main className="overflow-hidden">
        <Board />
      </main>
    </div>
  )
}
