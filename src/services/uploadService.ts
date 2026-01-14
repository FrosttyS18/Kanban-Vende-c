import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

// Helper para converter File em Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const uploadFile = async (file: File): Promise<string> => {
    try {
        // Tenta fazer o upload para o Firebase Storage
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.warn("Firebase upload failed, falling back to Base64:", error);
        
        // Se falhar (ex: erro de permissão/plano), usa Base64 como fallback
        // Isso garante que o usuário consiga usar o app mesmo com problemas no Firebase
        try {
            return await fileToBase64(file);
        } catch (base64Error) {
            console.error("Base64 conversion failed:", base64Error);
            throw error;
        }
    }
};
