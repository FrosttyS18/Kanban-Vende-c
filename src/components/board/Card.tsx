import { useState } from "react"
import { Paperclip, CheckSquare } from "lucide-react"
import CardModal, { INITIAL_LABELS, INITIAL_ACTIVITIES } from "./CardModal"

type Props = {
  title: string
  cover?: boolean
  labels?: boolean
}

export default function Card({ title, cover, labels }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const modalProps = (labels || cover) ? {
    initialDescription: "Treinamentos para times comerciais",
    initialLabels: labels ? INITIAL_LABELS : [],
    initialActivities: INITIAL_ACTIVITIES,
    initialDate: "18 de Dez",
    initialAttachments: [
        {
          id: '1',
          name: 'cover-image.jpg',
          url: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop',
          date: '16 de dez. às 15:09',
          isCover: true
        }
    ]
  } : {}

  return (
    <>
      <article 
        onClick={() => setIsModalOpen(true)}
        className="group relative flex flex-col rounded-md bg-card text-sm shadow-sm ring-1 ring-white/5 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer overflow-hidden"
      >
        {/* Edge-to-Edge Cover Image */}
        {cover && <div className="h-32 w-full bg-muted/50 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=270&auto=format&fit=crop')] bg-cover bg-center" />}
        
        <div className="p-3 flex flex-col gap-2">
          {/* Labels */}
          {labels && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              <span className="h-2 w-10 rounded-full bg-[#f45aad]" />
              <span className="h-2 w-10 rounded-full bg-[#58e07b]" />
            </div>
          )}

          <div className="font-medium text-card-foreground leading-snug">{title}</div>

          {/* Footer info - Conditional rendering */}
          {(cover || labels) && (
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1 hover:text-muted-foreground transition-colors">
                <Paperclip className="size-3" />
                <span>1</span>
              </span>
              <span className="flex items-center gap-1 hover:text-muted-foreground transition-colors">
                <CheckSquare className="size-3" />
                <span>0/3</span>
              </span>
            </div>
          )}
        </div>
      </article>

      <CardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        hasCover={cover}
        title={title}
        {...modalProps}
      />
    </>
  )
}
