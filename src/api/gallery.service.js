import api from "./api";

const getAllImages = async () => {
    // Logged-in users see the full "Galerie" folder (/drive-all);
    // anonymous visitors see only the curated "accesslibre" folder (/drive).
    const loggedIn = !!localStorage.getItem('token');
    const primary = loggedIn ? '/gallery/drive-all' : '/gallery/drive';
    try {
        const response = await api.get(primary);
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data;
        }
    } catch (error) {
        // If the authenticated listing failed (e.g. stale token), try the public one
        if (loggedIn) {
            try {
                const pub = await api.get('/gallery/drive');
                if (Array.isArray(pub.data) && pub.data.length > 0) return pub.data;
            } catch (e) { /* fall through */ }
        }
    }
    // Final fallback: DB list
    const response = await api.get('/gallery');
    return response.data;
};

const addImage = async (image) => {
    const response = await api.post('/gallery', image);
    return response.data;
};

const deleteImage = async (id) => {
    await api.delete(`/gallery/${id}`);
};

export const galleryService = {
    getAllImages,
    addImage,
    deleteImage
};
