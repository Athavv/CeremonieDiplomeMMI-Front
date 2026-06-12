import api from "./api";

const getAllImages = async () => {
    // Read images directly from the Drive "Galerie" folder (includes ones
    // added manually). Falls back to the DB list if Drive is unavailable.
    try {
        const response = await api.get('/gallery/drive');
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data;
        }
    } catch (error) {
        // fall through to DB
    }
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
