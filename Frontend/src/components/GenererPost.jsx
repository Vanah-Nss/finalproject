import { useState, useRef, useEffect } from "react";
import { gql, useMutation } from "@apollo/client";
import {
  FiCheckCircle,
  FiXCircle,
  FiUpload,
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
} from "react-icons/fi";
import ReCAPTCHA from "react-google-recaptcha";
console.log("🔑 VITE_RECAPTCHA_SITE_KEY:", import.meta.env.VITE_RECAPTCHA_SITE_KEY);
console.log("🌐 VITE_API_URL:", import.meta.env.VITE_API_URL);
// GraphQL
const ALL_POSTS = gql`
  query {
    myPosts {
      id
      content
      status
      imageUrl
      createdAt
      scheduledAt
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($content: String!, $imageUrl: String, $scheduledAt: String, $recaptchaToken: String!) {
    createPost(content: $content, imageUrl: $imageUrl, scheduledAt: $scheduledAt, recaptchaToken: $recaptchaToken) {
      post {
        id
        content
        status
        imageUrl
        createdAt
        scheduledAt
      }
    }
  }
`;

const GENERATE_POST = gql`
  mutation GeneratePost(
    $theme: String!
    $tone: String
    $length: String
    $imageUrl: String
    $scheduledAt: String
    $recaptchaToken: String!
  ) {
    generatePost(
      theme: $theme
      tone: $tone
      length: $length
      imageUrl: $imageUrl
      scheduledAt: $scheduledAt
      recaptchaToken: $recaptchaToken
    ) {
      post {
        id
        content
        status
        imageUrl
        createdAt
        scheduledAt
      }
    }
  }
`;

const PUBLISH_POST = gql`
  mutation PublishPost($id: Int!) {
    publishPost(id: $id) {
      post {
        id
        content
        status
        imageUrl
        scheduledAt
      }
    }
  }
`;

const GENERATE_IMAGE = gql`
  mutation GenerateImage($prompt: String!, $recaptchaToken: String!) {
    generateImage(prompt: $prompt, recaptchaToken: $recaptchaToken) {
      success
      message
      imageUrl
    }
  }
`;

// Toast
function Toast({ message, type, onClose }) {
  const styles =
    type === "success"
      ? "bg-white border-l-4 border-emerald-500 text-gray-800"
      : type === "error"
      ? "bg-white border-l-4 border-rose-500 text-gray-800"
      : "bg-white border-l-4 border-blue-500 text-gray-800";

  return (
    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl ${styles} mb-3 backdrop-blur-sm animate-slideDown`}>
      {type === "success" && <FiCheckCircle size={22} className="text-emerald-500" />}
      {type === "error" && <FiXCircle size={22} className="text-rose-500" />}
      <span className="flex-1 font-medium">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">✕</button>
    </div>
  );
}

// Image Generator
function ImageGenerator({ setImageUrl }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  const addToast = (message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const [generateImageMutation] = useMutation(GENERATE_IMAGE, {
    onCompleted: (data) => {
      if (data.generateImage.success) {
        setImageUrl(data.generateImage.imageUrl);
        addToast("🖼️ Image générée avec succès !", "success");
      } else {
        addToast(`❌ ${data.generateImage.message}`, "error");
      }
      setLoading(false);
    },
    onError: (err) => {
      console.error(err);
      addToast("❌ Erreur lors de la génération de l'image.", "error");
      setLoading(false);
    },
  });

  const handleGenerate = () => {
    if (!recaptchaToken) {
      addToast("⚠️ Valide le reCAPTCHA avant de générer !", "error");
      return;
    }
    if (!prompt.trim()) {
      addToast("Le prompt ne peut pas être vide !", "error");
      return;
    }
    setLoading(true);
    generateImageMutation({ variables: { prompt, recaptchaToken } });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="fixed top-5 right-5 left-5 md:left-auto md:w-96 flex flex-col items-stretch z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Tape ton prompt ici"
        className="border p-3 rounded-2xl shadow-sm w-full"
      />

      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
        onChange={(token) => setRecaptchaToken(token || "")}
      />
      <p className="text-xs text-gray-500 mt-2">{recaptchaToken ? "✅ reCAPTCHA validé" : "⚠️ Valide le reCAPTCHA avant d'envoyer."}</p>

      <button 
        onClick={handleGenerate} 
        disabled={loading} 
        className="bg-blue-900 text-white px-5 py-2.5 rounded-xl hover:bg-blue-950 shadow-md font-semibold transition-all duration-200"
      >
        {loading ? "⏳ Génération..." : "✨ Générer l'image"}
      </button>
    </div>
  );
}


// Main Component
export default function GenererPost() {
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  const [useAIContent, setUseAIContent] = useState(true);
  const [useAI, setUseAI] = useState(true);
  const [theme, setTheme] = useState("");
  const [tone, setTone] = useState("");
  const [length, setLength] = useState("court");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [postsHistory, setPostsHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const editorRef = useRef();

  const addToast = (message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const onRecaptchaChange = (token) => setRecaptchaToken(token || "");

  const [generatePostMutation] = useMutation(GENERATE_POST, {
    onCompleted: (data) => {
      const post = data.generatePost.post;
      setPostsHistory((prev) => [post, ...prev]);
      addToast("✨ Post IA généré avec succès !", "success");
      setLoading(false);
    },
    onError: (error) => {
      console.error("Erreur generatePost:", error);
      addToast(`❌ Impossible de générer le post: ${error.message}`, "error");
      setLoading(false);
    },
  });

  const [publishPostMutation] = useMutation(PUBLISH_POST, {
    onCompleted: (data) => {
      const updatedPost = data.publishPost.post;
      setPostsHistory((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
      );
    },
    onError: (error) => {
      console.error("Erreur publication:", error);
      addToast(`❌ Erreur: ${error.message}`, "error");
    },
  });

  const [createPostMutation] = useMutation(CREATE_POST, {
    onCompleted: (data) => {
      const post = data.createPost.post;
      setPostsHistory((prev) => [post, ...prev]);
      addToast(post.scheduledAt ? "📅 Post programmé !" : "📝 Post enregistré !", "success");
      if (editorRef.current) editorRef.current.innerHTML = "";
      setImageFile(null);
      setImageUrl("");
      setScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      setLoading(false);
    },
    onError: (error) => {
      console.error("Erreur createPost:", error);
      addToast(`❌ Impossible d'enregistrer le post: ${error.message}`, "error");
      setLoading(false);
    },
  });

  // Gestion de génération / sauvegarde
  const handleGenerate = async () => {
    if (!recaptchaToken) {
      addToast("⚠️ Valide le reCAPTCHA avant d'envoyer !", "error");
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      let scheduledAt = null;
      if (scheduled && scheduledDate && scheduledTime) {
        const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
        if (isNaN(dateTime.getTime())) {
          addToast("❌ Date ou heure invalide", "error");
          setLoading(false);
          return;
        }
        scheduledAt = dateTime.toISOString();
      }

      let finalImageUrl = imageUrl || null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/upload-image`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!data.url) throw new Error("Erreur upload image");
        finalImageUrl = data.url;
      }

      if (useAIContent) {
        if (useAI) {
          if (!theme?.trim()) {
            addToast("Le thème est obligatoire pour l'IA !", "error");
            setLoading(false);
            return;
          }
          await generatePostMutation({ variables: { theme, tone, length, imageUrl: finalImageUrl, scheduledAt, recaptchaToken } });
        } else {
          const rawContent = editorRef.current?.innerHTML;
          if (!rawContent?.trim()) {
            addToast("Le texte manuel ne peut pas être vide !", "error");
            setLoading(false);
            return;
          }
          await createPostMutation({ variables: { content: rawContent, imageUrl: finalImageUrl, scheduledAt, recaptchaToken } });
        }
      } else {
        if (!finalImageUrl) {
          addToast("⚠️ Vous devez générer ou uploader une image !", "error");
          setLoading(false);
          return;
        }
        await createPostMutation({ variables: { content: "", imageUrl: finalImageUrl, scheduledAt, recaptchaToken } });
      }

    } catch (err) {
      console.error("Erreur handleGenerate:", err);
      addToast(`❌ ${err.message || "Impossible de générer le post."}`, "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log("🔑 reCAPTCHA key:", import.meta.env.VITE_RECAPTCHA_SITE_KEY);
    console.log("🌐 API URL:", import.meta.env.VITE_API_URL);
  }, []);
  // Prévisualisation
  useEffect(() => {
    let content = "";
    const finalImageUrl = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

    if (useAIContent) {
      if (useAI) {
        content = `<p><strong>Thème :</strong> ${theme || "—"}</p>
                   <p><strong>Ton :</strong> ${tone || "—"}</p>
                   <p><strong>Longueur :</strong> ${length}</p>`;
      } else if (editorRef.current) {
        content = editorRef.current.innerHTML || "";
      }
    } else {
      content = finalImageUrl ? `<p>🖼️ Image :</p><img src="${finalImageUrl}" style="max-width:100%; border-radius:8px;" />` : "";
    }

    setPreviewContent(content);

    return () => {
      if (imageFile && finalImageUrl) URL.revokeObjectURL(finalImageUrl);
    };
  }, [theme, tone, length, imageFile, imageUrl, useAIContent, useAI]);

  const copyContent = (content) => {
    navigator.clipboard.writeText(content);
    addToast("📋 Contenu copié !", "success");
  };

  const handlePublish = async (id, content, imageUrl) => {
    try {
      const textOnly = content.replace(/<[^>]*>?/gm, "").trim();
      const linkedInUrl = textOnly 
        ? `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textOnly)}`
        : "https://www.linkedin.com/feed/";
      window.open(linkedInUrl, "_blank", "width=800,height=600");
      await publishPostMutation({ variables: { id: parseInt(id) } });
    } catch (err) {
      console.error("Erreur publication:", err);
      addToast("❌ Erreur lors de la publication", "error");
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="fixed top-5 right-5 left-5 md:left-auto md:w-96 flex flex-col items-stretch z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>

      <h2 className="text-4xl font-extrabold tracking-wide text-black">Générateur de post</h2>
      <p className="text-sm text-gray-600 mt-1">Générer vos contenus textuels et visuels à l'aide de l'IA ou sans IA.</p>

      {/* Choix contenu */}
      <div className="flex gap-4 mt-4 justify-center">
        <button
          className={`px-6 py-3 rounded-xl font-semibold shadow-sm transition-all ${useAIContent ? "bg-blue-900 text-white" : "bg-blue-50 text-blue-900 hover:bg-blue-100"}`}
          onClick={() => setUseAIContent(true)}
        >
          Contenu Textuel
        </button>
        <button
          className={`px-6 py-3 rounded-xl font-semibold shadow-sm transition-all ${!useAIContent ? "bg-blue-900 text-white" : "bg-blue-50 text-blue-900 hover:bg-blue-100"}`}
          onClick={() => setUseAIContent(false)}
        >
          Contenu Visuel
        </button>
      </div>

      {/* Contenu textuel */}
      {useAIContent && (
        <div className="mt-6">
          {/* IA ou manuel */}
          <div className="flex gap-6 mt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={useAI} onChange={() => setUseAI(true)} />
              <span className="font-medium">Avec IA</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!useAI} onChange={() => setUseAI(false)} />
              <span className="font-medium">Texte manuel</span>
            </label>
          </div>

          {useAI ? (
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <input type="text" placeholder="Thème" value={theme} onChange={(e) => setTheme(e.target.value)} className="border border-gray-300 p-3 rounded-xl flex-1 shadow-sm" />
              <select value={tone} onChange={(e) => setTone(e.target.value)} className="border border-gray-300 p-3 rounded-xl flex-1 shadow-sm">
                <option value="">-- Choisir le ton --</option>
                <option value="professionnel">Professionnel</option>
                <option value="amical">Amical</option>
                <option value="humoristique">Humoristique</option>
                <option value="motivant">Motivant</option>
              </select>
              <select value={length} onChange={(e) => setLength(e.target.value)} className="border border-gray-300 p-3 rounded-xl flex-1 shadow-sm">
                <option value="court">Court</option>
                <option value="moyen">Moyen</option>
                <option value="long">Long</option>
              </select>
            </div>
          ) : (
            <>
              <div className="flex gap-3 mt-4">
                <button onClick={() => document.execCommand("bold")} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><FiBold /></button>
                <button onClick={() => document.execCommand("italic")} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><FiItalic /></button>
                <button onClick={() => document.execCommand("underline")} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><FiUnderline /></button>
                <button onClick={() => document.execCommand("insertUnorderedList")} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"><FiList /></button>
              </div>
              <div 
                ref={editorRef} 
                contentEditable 
                suppressContentEditableWarning 
                className="border border-gray-300 p-4 rounded-xl min-h-[150px] text-lg shadow-sm focus:ring-2 focus:ring-gray-400 mt-4"
                onInput={() => setPreviewContent(editorRef.current?.innerHTML)}
              />
            </>
          )}
        </div>
      )}

      {/* Contenu visuel */}
      {!useAIContent && <ImageGenerator setImageUrl={setImageUrl} />}

      {/* Planification */}
      <div className="flex items-center gap-3 mt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
          Programmer le post
        </label>
        {scheduled && (
          <>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="border border-gray-300 p-2 rounded-xl" />
            <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="border border-gray-300 p-2 rounded-xl" />
          </>
        )}
      </div>

      <button onClick={handleGenerate} disabled={loading} className="bg-blue-900 text-white px-6 py-3 rounded-xl mt-4 font-bold shadow-md hover:bg-blue-950 transition-all duration-200">
        {loading ? "⏳ Génération..." : "Générer / Enregistrer le post"}
      </button>

      {/* Prévisualisation */}
      {previewContent && (
        <div className="mt-6 p-4 border border-gray-300 rounded-xl shadow-sm">
          <h3 className="font-bold mb-2">Prévisualisation</h3>
          <div dangerouslySetInnerHTML={{ __html: previewContent }} />
          <button onClick={() => copyContent(previewContent)} className="mt-2 text-sm text-blue-900 font-semibold">📋 Copier</button>
        </div>
      )}

      {/* Historique */}
      {postsHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold mb-2">Historique des posts</h3>
          <div className="space-y-3">
            {postsHistory.map((p) => (
              <div key={p.id} className="border p-3 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div dangerouslySetInnerHTML={{ __html: p.content }} className="flex-1" />
                {p.imageUrl && <img src={p.imageUrl} alt="" className="max-w-[150px] rounded-xl" />}
                <div className="flex gap-2 mt-2 md:mt-0">
                  {p.status !== "published" && <button onClick={() => handlePublish(p.id, p.content, p.imageUrl)} className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-sm font-semibold hover:bg-emerald-600">Publier</button>}
                  <button onClick={() => copyContent(p.content)} className="bg-blue-50 text-blue-900 px-3 py-1 rounded-xl text-sm font-semibold hover:bg-blue-100">Copier</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
