import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2, MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { type Attachment } from "@/types"

type Props = {
    images: Attachment[]
    initialIndex: number
    isOpen: boolean
    onClose: () => void
    onMakeCover: (id: string) => void
    onDelete: (id: string) => void
}

export default function ImageLightbox({ 
    images, 
    initialIndex, 
    isOpen, 
    onClose,
    onMakeCover,
    onDelete
}: Props) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex)

    useEffect(() => {
        setCurrentIndex(initialIndex)
    }, [initialIndex])

    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft') handlePrev()
            if (e.key === 'ArrowRight') handleNext()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, currentIndex])

    const handlePrev = () => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
    }

    const handleNext = () => {
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
    }

    if (!isOpen || images.length === 0) return null
    
    const currentImage = images[currentIndex]

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50">
                <X className="size-6" />
            </button>

            {/* Navigation */}
            {images.length > 1 && (
                <>
                    <button onClick={handlePrev} className="absolute left-4 text-white/70 hover:text-white p-2 z-50">
                        <ChevronLeft className="size-8" />
                    </button>
                    <button onClick={handleNext} className="absolute right-4 text-white/70 hover:text-white p-2 z-50">
                        <ChevronRight className="size-8" />
                    </button>
                </>
            )}

            {/* Main Content */}
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
                <img 
                    src={currentImage.url} 
                    alt={currentImage.name} 
                    className="max-h-[80vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
                />
                
                {/* Info & Actions */}
                <div className="mt-4 flex flex-col items-center gap-2 text-white/90">
                    <p className="text-sm font-medium">{currentImage.name}</p>
                    <div className="flex items-center gap-4 mt-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-white/10 hover:bg-white/20 text-white border-none h-8 gap-2"
                            onClick={() => onMakeCover(currentImage.id)}
                        >
                            <ImageIcon className="size-4" />
                            {currentImage.isCover ? "Remover Capa" : "Tornar Capa"}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white/70 hover:text-white h-8 gap-2"
                        >
                            <MessageSquare className="size-4" />
                            Comentar
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 gap-2"
                            onClick={() => {
                                onDelete(currentImage.id)
                                if (images.length === 1) onClose()
                                else if (currentIndex === images.length - 1) setCurrentIndex(prev => prev - 1)
                            }}
                        >
                            <Trash2 className="size-4" />
                            Excluir
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
