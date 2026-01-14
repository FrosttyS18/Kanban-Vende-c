
export const getDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                resolve('#000000');
                return;
            }

            // Resize to small dimensions for faster processing
            canvas.width = 50;
            canvas.height = 50;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0, 50, 50);

            try {
                const imageData = ctx.getImageData(0, 0, 50, 50);
                const data = imageData.data;
                let r = 0, g = 0, b = 0;
                let count = 0;

                for (let i = 0; i < data.length; i += 4) {
                    // Skip transparent pixels
                    if (data[i + 3] < 128) continue;

                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }

                if (count === 0) {
                    resolve('#22272b'); // Default dark
                    return;
                }

                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch (e) {
                console.error("Error getting dominant color", e);
                resolve('#22272b');
            }
        };

        img.onerror = (e) => {
            console.error("Error loading image for color extraction", e);
            resolve('#22272b');
        };
    });
};
