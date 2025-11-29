import { useQuery, useMutation, gql } from "@apollo/client";
import { useState, useEffect } from "react";
import {
  FiEdit,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiInfo,
  FiFileText,
  FiFile,
} from "react-icons/fi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


function Toast({ message, type, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 3500;
    const interval = 50;
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const styles =
    type === "success"
      ? "bg-white border-l-4 border-emerald-500 text-gray-800"
      : type === "error"
      ? "bg-white border-l-4 border-rose-500 text-gray-800"
      : type === "warning"
      ? "bg-white border-l-4 border-amber-500 text-gray-800"
      : "bg-white border-l-4 border-blue-500 text-gray-800";

  const progressColor =
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
      ? "bg-rose-500"
      : type === "warning"
      ? "bg-amber-500"
      : "bg-blue-500";

  return (
    <div className={`${styles} rounded-lg shadow-2xl mb-3 backdrop-blur-sm animate-slideIn overflow-hidden min-w-[320px] max-w-md`}>
      <div className="flex items-center gap-3 px-6 py-4">
        {type === "success" && <FiCheckCircle size={22} className="text-emerald-500" />}
        {type === "error" && <FiXCircle size={22} className="text-rose-500" />}
        {type === "warning" && <FiAlertCircle size={22} className="text-amber-500" />}
        {type === "info" && <FiInfo size={22} className="text-blue-500" />}
        <span className="flex-1 font-medium">{message}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg transition-colors">✕</button>
      </div>
      
      <div className="h-1 bg-gray-200">
        <div
          className={`h-full ${progressColor} transition-all duration-50 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}


const ALL_POSTS = gql`
  query {
    allPosts {
      id
      content
      status
      imageUrl
      createdAt
      scheduledAt
    }
  }
`;

const DELETE_POST = gql`
  mutation DeletePost($id: Int!) {
    deletePost(id: $id) {
      ok
    }
  }
`;

const PUBLISH_POST = gql`
  mutation PublishPost($id: Int!) {
    publishPost(id: $id) {
      post {
        id
        status
      }
    }
  }
`;

const UPDATE_POST = gql`
  mutation UpdatePost($id: Int!, $content: String, $imageUrl: String, $status: String) {
    updatePost(id: $id, content: $content, imageUrl: $imageUrl, status: $status) {
      post {
        id
        content
        status
        imageUrl
      }
    }
  }
`;


const downloadPDF = async (post) => {
  try {
    const tempDiv = document.createElement("div");
    tempDiv.style.width = "600px";
    tempDiv.style.padding = "10px";
    tempDiv.style.background = "white";
    tempDiv.innerHTML = post.content || "";
    document.body.appendChild(tempDiv);

    const canvas = await html2canvas(tempDiv, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    while (heightLeft > 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      if (heightLeft > 0) {
        pdf.addPage();
        position = -pdfHeight + heightLeft;
      }
    }

    pdf.save(`post-${post.id}.pdf`);
    document.body.removeChild(tempDiv);
  } catch (err) {
    console.error(err);
    alert("Erreur lors de la génération du PDF ❌");
  }
};

const downloadFile = (filename, content, type = "text/plain") => {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};


export default function Historique() {
  const { data, loading, error, refetch } = useQuery(ALL_POSTS);
  const [deletePost] = useMutation(DELETE_POST);
  const [publishPost] = useMutation(PUBLISH_POST);
  const [updatePost] = useMutation(UPDATE_POST);

  const [toasts, setToasts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [currentPost, setCurrentPost] = useState(null);

  const [editContent, setEditContent] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifiedPosts, setNotifiedPosts] = useState(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      if (data?.allPosts) {
        data.allPosts.forEach((post) => {
          const scheduleDate = post.scheduledAt ? new Date(post.scheduledAt) : null;
          const isPastDue = scheduleDate && scheduleDate <= now;
          const isNotPublished = !post.status?.toLowerCase().includes("pub");
          
       
          if (isPastDue && isNotPublished && !notifiedPosts.has(post.id)) {
            const contentPreview = post.content 
              ? post.content.replace(/<[^>]*>/g, '').substring(0, 50)
              : 'Contenu visuel';
            addToast(`⏰ Il est temps de publier : "${contentPreview}..."`, "warning");
            setNotifiedPosts(prev => new Set(prev).add(post.id));
          }
        });
      }
    }, 30000); 
    
    return () => clearInterval(interval);
  }, [data, notifiedPosts]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 5000);
  };

  const normalize = (s) => (s ? String(s).toLowerCase() : "");

  const getStatusBadge = (status, scheduledAt, now = new Date()) => {
    const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
    const s = (status || "").toLowerCase();

    if (s.includes("pub")) {
      return (
        <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
          ✅ Publié
        </span>
      );
    }

    if (scheduleDate) {
      const isPastDue = scheduleDate <= now;
      
      if (isPastDue) {
        return (
          <span className="bg-gradient-to-r from-red-200 to-rose-200 text-red-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse">
             À publier maintenant !
          </span>
        );
      } else {
        return (
          <span className="bg-gradient-to-r from-yellow-200 to-amber-200 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
             Programmé
          </span>
        );
      }
    }

    // Brouillon par défaut
    return (
      <span className="bg-gradient-to-r from-blue-900 to-blue-950 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
        Brouillon
      </span>
    );
  };

  const openModal = (post, type) => {
    setCurrentPost(post);
    setModalType(type);
    if (type === "edit") {
      let cleanContent = (post.content || "").replace(/<img[^>]*>/gi, '').trim();
      cleanContent = cleanContent.replace(/(<br\/?>\s*)+$/gi, '');
      setEditContent(cleanContent);
      setEditImageUrl(post.imageUrl || "");
      setEditImageFile(null);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType("");
    setCurrentPost(null);
    setEditContent("");
    setEditImageUrl("");
    setEditImageFile(null);
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImageFile(file);
    const blobUrl = URL.createObjectURL(file);
    setEditImageUrl(blobUrl);
  };

  const handleUpdate = async () => {
    try {
      let finalImageUrl = null;
      
      if (editImageFile) {
        const formData = new FormData();
        formData.append("file", editImageFile);
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/upload-image`, { method: "POST", body: formData });
        const data = await res.json();
        if (!data.url) throw new Error("Erreur upload image");
        finalImageUrl = data.url;
      } else {
        finalImageUrl = currentPost.imageUrl || null;
      }
      
      if (finalImageUrl && finalImageUrl.startsWith('blob:')) {
        console.error('Attempting to send blob URL to server, using original instead');
        finalImageUrl = currentPost.imageUrl || null;
      }
      
      let cleanContent = editContent.replace(/<img[^>]*>/gi, '').trim();
      cleanContent = cleanContent.replace(/(<br\/?>\s*)+$/gi, '');

      const { data: updateData } = await updatePost({
        variables: {
          id: parseInt(currentPost.id),
          content: cleanContent,
          ...(finalImageUrl !== undefined && { imageUrl: finalImageUrl }),
        },
        update: (cache, { data: { updatePost } }) => {
          if (!updatePost?.post) return;
          const existing = cache.readQuery({ query: ALL_POSTS });
          if (!existing) return;
          const updatedPosts = existing.allPosts.map((p) =>
            p.id === updatePost.post.id
              ? { ...p, content: updatePost.post.content, imageUrl: updatePost.post.imageUrl, status: updatePost.post.status }
              : p
          );
          cache.writeQuery({ query: ALL_POSTS, data: { allPosts: updatedPosts } });
        },
      });

      if (updateData?.updatePost?.post) {
        addToast("✅ Post modifié avec succès !", "success");
        refetch();
        closeModal();
      } else addToast("❌ Erreur lors de la modification du post", "error");
    } catch (err) {
      console.error(err);
      addToast("❌ Erreur réseau lors de la modification", "error");
    }
  };

  const handleDelete = async () => {
    try {
      const res = await deletePost({
        variables: { id: parseInt(currentPost.id) },
        update: (cache) => {
          const existing = cache.readQuery({ query: ALL_POSTS });
          if (!existing) return;
          const updatedPosts = existing.allPosts.filter(p => p.id !== currentPost.id);
          cache.writeQuery({ query: ALL_POSTS, data: { allPosts: updatedPosts } });
        },
      });
      if (res?.data?.deletePost?.ok) {
        addToast("🗑️ Post supprimé avec succès", "error");
        refetch();
        closeModal();
      } else addToast("❌ Impossible de supprimer le post", "error");
    } catch (err) {
      console.error(err);
      addToast("❌ Erreur lors de la suppression", "error");
    }
  };
const downloadImage = async (url, filename) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur récupération image");

    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  } catch (err) {
    console.error(err);
    alert("Impossible de télécharger l'image ❌");
  }
};

  const handlePublishLinkedIn = async () => {
    if (!currentPost) return;
    
    const textOnly = (currentPost.content || "").replace(/<[^>]*>?/gm, "").trim();
    const linkedInUrl = textOnly 
      ? `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textOnly)}`
      : "https://www.linkedin.com/feed/";

    window.open(linkedInUrl, "_blank", "width=800,height=600");

    try {
     
      await publishPost({
        variables: { id: parseInt(currentPost.id) },
        update: (cache, { data: { publishPost } }) => {
          if (!publishPost?.post) return;
          
          const existing = cache.readQuery({ query: ALL_POSTS });
          if (!existing) return;
          
          const updatedPosts = existing.allPosts.map((p) =>
            p.id === publishPost.post.id 
              ? { ...p, status: "publié" }
              : p
          );
          
          cache.writeQuery({ 
            query: ALL_POSTS, 
            data: { allPosts: updatedPosts } 
          });
        },
      });

      await refetch();
      closeModal();
    } catch (err) {
      console.error("Erreur publication:", err);
    }
  };

  if (loading) return <p className="p-8 text-center">Chargement...</p>;
  if (error) return <p className="text-red-500 p-8">Erreur : {error.message}</p>;

  const filteredPosts = (data?.allPosts || []).filter((post) =>
    (post.content || "").toLowerCase().includes(searchText.toLowerCase())
  );

  const renderActionButton = (post) => {
    const sNorm = normalize(post.status);
    const isPublished = sNorm.includes("pub");
    const scheduleDate = post.scheduledAt ? new Date(post.scheduledAt) : null;
    const isScheduled = scheduleDate && scheduleDate > currentTime;
    const isPastDue = scheduleDate && scheduleDate <= currentTime && !isPublished;

    if (isPastDue) {
      return (
        <button
          onClick={() => openModal(post, "publish")}
          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-transform hover:scale-110 shadow-md animate-pulse"
          title="⏰ L'heure est arrivée ! Publier maintenant"
        >
          <FiCheckCircle size={20} />
        </button>
      );
    }
    if (isScheduled) {
      return (
        <button
          onClick={() => openModal(post, "publish")}
          className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-full transition-transform hover:scale-110 shadow-md"
          title="Post programmé - Publier en avance"
        >
          <FiUpload />
        </button>
      );
    }

   
    if (isPublished) {
      return (
        <button
          onClick={() => openModal(post, "publish")}
          className="bg-[#0A66C2] hover:bg-[#004182] text-white p-2 rounded-full transition-transform hover:scale-110 shadow-md"
          title="Republier sur LinkedIn"
        >
          <FiUpload />
        </button>
      );
    }

 
    return (
      <button
        onClick={() => openModal(post, "publish")}
        className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-transform hover:scale-110 shadow-md"
        title="Publier sur LinkedIn"
      >
        <FiCheckCircle />
      </button>
    );
  };

  return (
    <div className="space-y-6 p-4">

        <h1 className="text-3xl font-extrabold tracking-wide">📜 Historique des posts</h1>
    

      <div className="fixed top-5 right-5 z-50 flex flex-col items-end space-y-2">
        {toasts.map((t) => (
          <Toast 
            key={t.id} 
            message={t.message} 
            type={t.type} 
            onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} 
          />
        ))}
      </div>

      <div className="mb-4 relative w-full max-w-md">
        <input
          type="text"
          placeholder="🔍 Rechercher par contenu..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border border-gray-300 rounded-xl p-3 pl-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          aria-label="Rechercher par contenu"
        />
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        {searchText && (
          <button
            onClick={() => setSearchText("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX />
          </button>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">📭 Aucun post correspondant</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white shadow-lg rounded-xl p-5 border border-blue-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              {post.content && post.content.trim() !== "" && (
                <div className="text-gray-800 font-medium mb-3 line-clamp-4" dangerouslySetInnerHTML={{ __html: post.content }} />
              )}
              
              {post.imageUrl && (
                <div className="mt-3 mb-3">
                  <img 
                    src={post.imageUrl} 
                    alt="Post image" 
                    className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow" 
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-500">📅 {new Date(post.createdAt).toLocaleDateString('fr-FR')}</p>
                  {post.scheduledAt && new Date(post.scheduledAt) > currentTime && (
                    <p className="text-xs text-purple-600 font-medium mt-1">
                      ⏰ {new Date(post.scheduledAt).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(post.status, post.scheduledAt, currentTime)}
                </div>
              </div>

             <div className="flex gap-3 flex-wrap">


  <FiEdit 
    size={22} 
    className="text-green-600 hover:text-green-500 cursor-pointer transition-colors" 
    title="Modifier"
    onClick={() => openModal(post, "edit")}
  />


  <FiTrash2 
    size={22} 
    className="text-red-600 hover:text-red-500 cursor-pointer transition-colors" 
    title="Supprimer"
    onClick={() => openModal(post, "delete")}
  />


  {renderActionButton(post)} 


  {post.imageUrl ? (
    
      <FiFile 
    size={22} 
    className="text-purple-600 hover:text-purple-500 cursor-pointer transition-colors" 
    title="Télécharger l'image"
    onClick={() => downloadImage(post.imageUrl, `post-${post.id}.jpg`)}
  />
  ) : (
    
    <>
      <FiFileText 
        size={22} 
        className="text-blue-600 hover:text-blue-500 cursor-pointer transition-colors" 
        title="Télécharger en TXT"
        onClick={() => downloadFile(`post-${post.id}.txt`, post.content || "")}
      />

      <FiFile 
        size={22} 
        className="text-red-600 hover:text-red-500 cursor-pointer transition-colors" 
        title="Télécharger en PDF"
        onClick={() => downloadPDF(post)}
      />
    </>
  )}
</div>

            </div>
          ))}
        </div>
      )}

      {modalOpen && (
<div className="fixed inset-0 bg-white bg-opacity-40 flex justify-center items-center z-50 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 w-[92%] max-w-lg relative shadow-2xl animate-scaleIn">
            <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"><FiX size={22} /></button>

            {modalType === "edit" && (
              <>
                <h3 className="text-2xl font-bold mb-5 text-gray-800">✏️ Modifier le post</h3>
                <textarea
                  className="w-full border border-gray-300 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 shadow-sm"
                  rows={6}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Contenu du post..."
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleEditImageUpload} 
                  className="mb-4 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {editImageUrl && <img src={editImageUrl} alt="Preview" className="w-full h-48 object-cover rounded-xl mb-4 shadow-md" />}
                <button onClick={handleUpdate} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl transition-all hover:scale-105 font-semibold shadow-md">💾 Enregistrer</button>
              </>
            )}

            {modalType === "delete" && (
              <>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">🗑️ Supprimer le post ?</h3>
                <p className="mb-6 text-gray-600">Cette action est <strong>irréversible</strong>.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors font-medium">Annuler</button>
                  <button onClick={handleDelete} className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors font-medium shadow-md">Supprimer</button>
                </div>
              </>
            )}

            {modalType === "publish" && (
              <>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">
                  {currentPost?.scheduledAt && new Date(currentPost.scheduledAt) <= currentTime && !currentPost.status?.toLowerCase().includes("pub")
                    ? "⏰ L'heure est arrivée ! Publier maintenant ?"
                    : currentPost?.status?.toLowerCase().includes("pub") 
                    ? "Republier sur LinkedIn ?" 
                    : "Publier sur LinkedIn ?"}
                </h3>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={closeModal} className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors font-medium">Annuler</button>
                  <button onClick={handlePublishLinkedIn} className="px-5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white transition-colors font-medium shadow-md">
                    {currentPost?.status?.toLowerCase().includes("pub") ? "Republier" : "Publier"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}