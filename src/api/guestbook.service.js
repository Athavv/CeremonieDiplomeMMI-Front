import api from "./api";

const getAllMessages = async () => {
    const response = await api.get('/public/guestbook');
    return response.data;
};

const postMessage = async (message) => {
    const response = await api.post('/public/guestbook', message);
    return response.data;
};

const getAllMessagesAdmin = async () => {
    const response = await api.get('/guestbook');
    return response.data;
};

const deleteMessage = async (id) => {
    await api.delete(`/guestbook/${id}`);
};

const submitWithPhotos = async (author, content, rawBlob, templateBlob) => {
    const formData = new FormData();
    formData.append("author", author);
    formData.append("content", content);
    if (rawBlob)      formData.append("photoRaw",      rawBlob,      "photo-raw.jpg");
    if (templateBlob) formData.append("photoTemplate", templateBlob, "photo-template.jpg");
    const response = await api.post("/public/guestbook/submit", formData);
    return response.data;
};

export const guestbookService = {
    getAllMessages,
    postMessage,
    submitWithPhotos,
    getAllMessagesAdmin,
    deleteMessage
};
