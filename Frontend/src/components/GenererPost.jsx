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
  mutation CreatePost($content: String!, $imageUrl: String, $scheduledAt: String) {
    createPost(content: $content, imageUrl: $imageUrl, scheduledAt: $scheduledAt) {
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
  ) {
    generatePost(
      theme: $theme
      tone: $tone
      length: $length
      imageUrl: $imageUrl
      scheduledAt: $scheduledAt
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
  mutation GenerateImage($prompt: String!) {
    generateImage(prompt: $prompt) {
      success
      message
      imageUrl
    }
  }
`;


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

function ImageGenerator({ setImageUrl }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  const onRecaptchaChange = (token) => setRecaptchaToken(token || "");

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
    if (!prompt.trim()) {
      addToast("Le prompt ne peut pas être vide !", "error");
      return;
    }
    setLoading(true);
    generateImageMutation({ variables: { prompt } });
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
        sitekey="6Lengv0rAAAAABSguIrYdR7u1kNTjLQEnYgjo5HT"
        onChange={onRecaptchaChange}
        onExpired={() => setRecaptchaToken("")}
        onErrored={() => { setRecaptchaToken(""); addToast("Erreur reCAPTCHA", "error"); }}
      />
    <p className="text-xs text-gray-500 mt-2">{recaptchaToken ? "✅ reCAPTCHA validé" : "⚠️ Valide le reCAPTCHA avant d'envoyer."}</p>

 
<button 
  onClick={handleGenerate} 
  disabled={loading} 
  className="bg-blue-900 text-white px-5 py-2.5 rounded-xl hover:bg-blue-950 shadow-md font-semibold transition-all duration-200"
>
  {loading ? "⏳ Génération..." : "✨ Générer l'image "}
</button>


    </div>
  );
}


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
    update(cache, { data: { generatePost } }) {
      const newPost = generatePost.post;
      cache.modify({
        fields: {
          allPosts(existingPosts = []) {
            return [newPost, ...existingPosts];
          },
        },
      });
    },
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
    update(cache, { data: { createPost } }) {
      const newPost = createPost.post;
      cache.modify({
        fields: {
          allPosts(existingPosts = []) {
            return [newPost, ...existingPosts];
          },
        },
      });
    },
    onCompleted: (data) => {
      const post = data.createPost.post;
      setPostsHistory((prev) => [post, ...prev]);
      
    
      if (post.scheduledAt) {
        addToast("📅 Post programmé avec succès !", "success");
      } else {
        addToast("📝 Post enregistré comme brouillon !", "success");
      }
      
      if (editorRef.current) editorRef.current.innerHTML = "";
      setImageFile(null);
      setImageUrl("");
      setScheduledDate("");
      setScheduledTime("");
      setScheduled(false);
      setLoading(false);
    },
    onError: (error) => {
      console.error("Erreur createPost:", error);
      addToast(`❌ Impossible d'enregistrer le post: ${error.message}`, "error");
      setLoading(false);
    },
  });

  const handleGenerate = async () => {
     if (!recaptchaToken) {
      addToast("⚠️ Veuillez valider le reCAPTCHA avant de continuer !", "error");
      return;
    }
    
    if (loading) return;
    setLoading(true);

    try {
    
      let scheduledAt = null;
      if (scheduled && scheduledDate && scheduledTime) {
       
        const localDateTime = `${scheduledDate}T${scheduledTime}:00`;
        const dateTime = new Date(localDateTime);
        
        if (isNaN(dateTime.getTime())) {
          addToast("❌ Date ou heure invalide", "error");
          setLoading(false);
          return;
        }
        
        scheduledAt = dateTime.toISOString();
        console.log("Date programmée:", scheduledAt);
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
        if (!data.url) throw new Error("Erreur lors de l'upload de l'image");
        finalImageUrl = data.url;
      }

    
      if (useAIContent) {
        if (useAI) {
      
          if (!theme?.trim()) {
            addToast("Le thème est obligatoire pour l'IA !", "error");
            setLoading(false);
            return;
          }

          const variables = {
            theme: theme.trim(),
            tone: tone || "",
            length: length || "court",
            imageUrl: finalImageUrl,
            scheduledAt,
          };
          
          console.log("Variables GeneratePost (IA):", variables);
          await generatePostMutation({ variables });

        } else {
        
          if (!editorRef.current) {
            addToast("Erreur : éditeur non disponible", "error");
            setLoading(false);
            return;
          }
          
          const rawContent = editorRef.current.innerHTML;
          const textOnly = editorRef.current.textContent?.trim();
          
          if (!textOnly) {
            addToast("Le texte manuel ne peut pas être vide !", "error");
            setLoading(false);
            return;
          }

          const variables = {
            content: rawContent,
            imageUrl: finalImageUrl,
            scheduledAt,
          };
          
          console.log("Variables CreatePost (manuel):", variables);
          await createPostMutation({ variables });
        }
      } else {
      
        if (!finalImageUrl) {
          addToast("⚠️ Vous devez générer ou uploader une image avant !", "error");
          setLoading(false);
          return;
        }

        const variables = {
          content: "",
          imageUrl: finalImageUrl,
          scheduledAt,
        };

        console.log("Variables CreatePost (visuel):", variables);
        await createPostMutation({ variables });
      }

    } catch (err) {
      console.error("Erreur handleGenerate:", err);
      addToast(`❌ ${err.message || "Impossible de générer le post."}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let content = "";
    const finalImageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

    if (useAIContent) {
      if (useAI) {
        content = `<p><strong>Thème :</strong> ${theme || "—"}</p>
                   <p><strong>Ton :</strong> ${tone || "—"}</p>
                   <p><strong>Longueur :</strong> ${length}</p>`;
      } else if (editorRef.current) {
        content = editorRef.current.innerHTML || "";
      }
    } else {
      content = imageUrl ? `<p>🖼️ Image URL : ${imageUrl}</p>` : "";
    }

    if (finalImageUrl) {
      content += `<br/><img src="${finalImageUrl}" alt="Image" style="max-width:100%; height:auto; border-radius:8px;" />`;
    }

    setPreviewContent(content);

    return () => {
      if (imageFile && finalImageUrl) {
        URL.revokeObjectURL(finalImageUrl);
      }
    };
  }, [theme, tone, length, imageFile, imageUrl, useAIContent, useAI]);

  const copyContent = (content) => {
    navigator.clipboard.writeText(content);
    addToast("📋 Contenu copié !", "success");
  };

 const handlePublish = async (id, content, imageUrl) => {
  try {
    
    const textOnly = content.replace(/<[^>]*>?/gm, "").trim();
    
 
    let linkedInUrl = "";
    if (textOnly) {
      linkedInUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(textOnly)}`;
    } else if (imageUrl) {
     
      linkedInUrl = "https://www.linkedin.com/feed/";
    } else {
      linkedInUrl = "https://www.linkedin.com/feed/";
    }
    
   
    window.open(linkedInUrl, "_blank", "width=800,height=600");
    
   
    const { data } = await publishPostMutation({ 
      variables: { id: parseInt(id) },
      update: (cache, { data: { publishPost } }) => {
        if (!publishPost?.post) return;
        
        const existing = cache.readQuery({ query: ALL_POSTS });
        if (!existing) return;
        
        const updatedPosts = existing.allPosts.map((p) =>
          p.id === publishPost.post.id 
            ? { ...p, status: publishPost.post.status }
            : p
        );
        
        cache.writeQuery({ 
          query: ALL_POSTS, 
          data: { allPosts: updatedPosts } 
        });
      }
    });
    

    const updatedPost = data?.publishPost?.post;
    if (updatedPost) {
      setPostsHistory((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? { ...p, status: "publié" } : p))
      );
     
    }
  } catch (err) {
    console.error("Erreur lors de la publication:", err);
    addToast("❌ Erreur lors de la publication", "error");
  }
};
  return (  <div className="space-y-6 p-4">
      <div className="fixed top-5 right-5 left-5 md:left-auto md:w-96 flex flex-col items-stretch z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
<div>
  <h2 className="text-4xl font-extrabold tracking-wide text-black">
    Générateur de post
  </h2>
  <p className="text-sm text-gray-600 mt-1">
    Générer vos contenus textuels et visuels à l'aide de l'IA ou sans IA.
  </p>
</div>



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

      {useAIContent && (
        <div className="mt-6">
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

          {useAI && (
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
          )}

          {!useAI && (
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
                onInput={() => {
                  if (editorRef.current) {
                    setPreviewContent(editorRef.current.innerHTML);
                  }
                }}
              />
            </>
          )}
        </div>
      )}

      {!useAIContent && (
        <div className="mt-6 space-y-6">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-8 rounded-2xl shadow-sm border border-blue-200">
            <label className="block text-lg font-semibold text-gray-800 mb-4 tracking-wide">🎨 Générateur d'image IA</label>
            <ImageGenerator setImageUrl={setImageUrl} />
          </div>

          <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-8 rounded-2xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-4">
              <input 
                type="checkbox" 
                id="schedule-visual"
                checked={scheduled} 
                onChange={() => setScheduled(!scheduled)}
                className="w-5 h-5 text-blue-900 rounded focus:ring-2 focus:ring-blue-400"
              />
              <label htmlFor="schedule-visual" className="text-lg font-semibold text-gray-800 cursor-pointer tracking-wide">
                📅 Programmer la publication
              </label>
            </div>

            {scheduled && (
              <div className="flex flex-col md:flex-row gap-4 mt-6">
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 tracking-wide">📆 Date</label>
                  <input 
                    type="date" 
                    value={scheduledDate} 
                    onChange={(e) => setScheduledDate(e.target.value)} 
                    className="border border-gray-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white" 
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 tracking-wide">⏰ Heure</label>
                  <input 
                    type="time" 
                    value={scheduledTime} 
                    onChange={(e) => setScheduledTime(e.target.value)} 
                    className="border border-gray-300 p-3 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white" 
                  />
                </div>
              </div>
            )}
          </div>
       
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 tracking-wide">
              👁️ Prévisualisation
            </h3>
            {imageUrl ? (
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <p className="text-gray-700 mb-3 leading-relaxed"><strong className="font-semibold">Image générée :</strong></p>
                <img 
                  src={imageUrl} 
                  alt="Image générée" 
                  className="w-full max-w-sm h-auto rounded-lg shadow-sm mb-3 border border-gray-200"
                />
                {scheduled && scheduledDate && scheduledTime && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    📅 Programmé pour le {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400 italic text-center py-12">Aucune image générée</p>
            )}
          </div>

          <div className="flex justify-center mt-6">
            <button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="bg-blue-900 text-white px-8 py-3 rounded-xl hover:bg-blue-950 shadow-lg font-semibold"
            >
              {loading ? "⏳ Enregistrement..." : "💾 Enregistrer le contenu visuel"}
            </button>
          </div>
        </div>
      )}

      {useAIContent && (
        <>
          <div className="flex flex-col md:flex-row gap-3 items-center mt-4">
            <input 
              type="text" 
              placeholder="URL de l'image (optionnel)" 
              value={imageUrl} 
              onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); }} 
              className="border border-gray-300 p-3 rounded-xl flex-1 shadow-sm" 
            />
            <label className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm">
              <FiUpload size={18} /> Upload
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => { 
                  if (e.target.files[0]) { 
                    setImageFile(e.target.files[0]); 
                    setImageUrl(""); 
                  } 
                }} 
              />
            </label>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={scheduled} 
                onChange={() => setScheduled(!scheduled)} 
              />
              <span className="font-medium">📅 Programmer la publication</span>
            </label>
          </div>

          {scheduled && (
            <div className="flex flex-col md:flex-row gap-4 mt-3">
              <div className="flex flex-col flex-1">
                <label className="text-sm text-gray-600 mb-1">Date de publication</label>
                <input 
                  type="date" 
                  value={scheduledDate} 
                  onChange={(e) => setScheduledDate(e.target.value)} 
                  className="border border-gray-300 p-3 rounded-xl shadow-sm" 
                />
              </div>
              <div className="flex flex-col flex-1">
                <label className="text-sm text-gray-600 mb-1">Heure de publication</label>
                <input 
                  type="time" 
                  value={scheduledTime} 
                  onChange={(e) => setScheduledTime(e.target.value)} 
                  className="border border-gray-300 p-3 rounded-xl shadow-sm" 
                />
              </div>
            </div>
          )}
   
     <ReCAPTCHA
        ref={recaptchaRef}
        sitekey="6Lengv0rAAAAABSguIrYdR7u1kNTjLQEnYgjo5HT"
        onChange={onRecaptchaChange}
        onExpired={() => setRecaptchaToken("")}
        onErrored={() => { setRecaptchaToken(""); addToast("Erreur reCAPTCHA", "error"); }}
      />
    <p className="text-xs text-gray-500 mt-2">{recaptchaToken ? "✅ reCAPTCHA validé" : "⚠️ Valide le reCAPTCHA avant d'envoyer."}</p>

          <div className="flex justify-center mt-6">
            <button 
              onClick={handleGenerate} 
              disabled={loading} 
              className="bg-blue-900 text-white px-8 py-3 rounded-xl hover:bg-blue-950 shadow-lg font-semibold"
            >
              {loading ? " Génération..." : " Générer / Enregistrer"}
            </button>
          </div>

          <div className="mt-8 p-4 border border-gray-200 rounded-2xl bg-gray-50 shadow-sm">
            <h3 className="font-semibold mb-3">Prévisualisation :</h3>
            <div dangerouslySetInnerHTML={{ __html: previewContent }} />
          </div>
        </>
      )}

      <div className="mt-8 space-y-4">
        <h3 className="font-semibold text-lg"> Historique des posts :</h3>
        {postsHistory.map((post) => {
       
          const now = new Date();
          const scheduledDate = post.scheduledAt ? new Date(post.scheduledAt) : null;
          const isPublished = post.status?.toLowerCase().includes("pub");
          const isPastDue = scheduledDate && scheduledDate <= now && !isPublished;
          const isFuture = scheduledDate && scheduledDate > now;
          
          return (
            <div key={post.id} className="p-4 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
              <div className="flex-1">
                {post.content && post.content.trim() !== "" && (
                  <div dangerouslySetInnerHTML={{ __html: post.content }} />
                )}
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post" 
                    className="w-full max-w-xs h-auto rounded-lg mt-2 border border-gray-200"
                  />
                )}
                {post.scheduledAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    📅 {isPastDue ? "À publier maintenant" : isFuture ? "Programmé pour le" : "Publié le"} : {new Date(post.scheduledAt).toLocaleString('fr-FR')}
                  </p>
                )}
              
                <div className="mt-2">
                  {isPastDue ? (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold animate-pulse">
                      ⏰ À publier maintenant !
                    </span>
                  ) : isFuture ? (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
                      📅 Programmé
                    </span>
                  ) : isPublished ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      ✅ Publié
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                      📝 Brouillon
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2 md:mt-0">
                <button 
                  onClick={() => copyContent(post.content)} 
                  className="px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 text-blue-900"
                >
                  📋 Copier
                </button>
                {!isPublished && (
                  <button 
                    onClick={() => handlePublish(post.id, post.content, post.imageUrl)} 
                    className={`px-4 py-2 text-white rounded-lg ${
                      isPastDue 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-blue-900 hover:bg-blue-950'
                    }`}
                  >
                    Publier sur LInkedin
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}