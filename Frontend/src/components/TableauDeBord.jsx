import { useQuery } from "@apollo/client";
import { gql } from "@apollo/client";
import { useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

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

export default function TableauDeBord() {
  const { data, loading, error } = useQuery(ALL_POSTS);
  const [selectedPost, setSelectedPost] = useState(null);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-blue-900">
        <p className="text-white text-2xl font-bold">Chargement…</p>
      </div>
    );

  if (error)
    return (
      <p className="text-red-500 text-center mt-10 font-bold text-xl">
        Erreur : {error.message}
      </p>
    );

  const posts = data?.allPosts || [];

  const totalPosts = posts.length;
  
  const getRealStatus = (post) => {
 
    if (post.scheduledAt && new Date(post.scheduledAt) > new Date()) {
      return "programmé";
    }
    return post.status.toLowerCase();
  };

  const publishedPosts = posts.filter((p) => {
    const status = getRealStatus(p);
    return status.includes("pub");
  }).length;

  const draftPosts = posts.filter((p) => {
    const status = getRealStatus(p);
    return status.includes("brou");
  }).length;

  const scheduledPosts = posts.filter((p) => {
    const status = getRealStatus(p);
    return status.includes("program");
  }).length;

  const avgLength = posts.length
    ? Math.round(
        posts.reduce((acc, p) => acc + (p.content?.length || 0), 0) / posts.length
      )
    : 0;

  const pieData = [
    { name: "Publié", value: publishedPosts, color: "#22c55e" }, // vert
    { name: "Brouillon", value: draftPosts, color: "#1e3a8a" }, // bleu marine
    { name: "Programmé", value: scheduledPosts, color: "#9333ea" }, // violet
  ];

  const lastPosts = posts.slice(0, 5).map((p) => ({
    name: `Post ${p.id}`,
    length: p.content?.length || 0,
    status: getRealStatus(p),
  }));

  const getBadgeColor = (post) => {
    const status = getRealStatus(post);
    
    if (status.includes("pub")) return "bg-green-500 text-white"; // Publié → vert
    if (status.includes("brou")) return "bg-blue-800 text-white"; // Brouillon → bleu
    if (status.includes("program")) return "bg-purple-700 text-white"; // Programmé → violet
    return "bg-gray-200 text-gray-700";
  };

  const getStatusLabel = (post) => {
    const status = getRealStatus(post);
    
    if (status.includes("pub")) return "Publié";
    if (status.includes("brou")) return "Brouillon";
    if (status.includes("program")) return "Programmé";
    return post.status;
  };

  return ( 
     <div className="space-y-6 p-4">
    

<h2 className="text-4xl font-extrabold tracking-wide bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent">
  Tableau de bord
</h2>


      <div className="flex-1 p-6 space-y-6 overflow-hidden">
     
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            {
              title: "Total",
              value: totalPosts,
              icon: FiTrendingUp,
              color: "text-blue-500",
            },
            {
              title: "Publié",
              value: publishedPosts,
              icon: FiCheckCircle,
              color: "text-green-500",
            },
            {
              title: "Brouillon",
              value: draftPosts,
              icon: FiXCircle,
              color: "text-blue-800",
            },
            {
              title: "Programmé",
              value: scheduledPosts,
              icon: FiClock,
              color: "text-purple-500",
            },
            {
              title: "Longueur Moy.",
              value: avgLength,
              icon: FiTrendingUp,
              color: "text-indigo-500",
            },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="p-5 bg-white rounded-2xl shadow-2xl text-center hover:shadow-3xl transition-shadow border border-blue-200"
              >
                <h3 className="font-bold text-blue-900 text-lg mb-1">
                  {stat.title}
                </h3>
                <p className="text-3xl font-extrabold text-black">
                  {stat.value}
                </p>
                <Icon className={`${stat.color} mx-auto mt-2 text-2xl`} />
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 h-[65%]">
     
          <div className="bg-white p-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow flex flex-col justify-center border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">
              Répartition des statuts
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-3 flex justify-around text-sm font-semibold">
              {pieData.map((entry) => (
                <span key={entry.name} className="flex items-center space-x-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></span>
                  <span>
                    {entry.name} : {entry.value}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Barres */}
          <div className="bg-white p-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow flex flex-col justify-center border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">
              5 derniers posts
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={lastPosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" fontSize={14} stroke="#334155" />
                <YAxis fontSize={14} stroke="#334155" />
                <Tooltip />
                <Bar dataKey="length" fill="#1e3a8a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

       
          <div className="bg-white p-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-shadow overflow-y-auto border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 text-lg dark:text-white">
              Derniers posts
            </h3>
            <ul className="space-y-3 max-h-[180px] overflow-y-auto">
              {posts.slice(0, 10).map((post) => (
                <li
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors text-base bg-white"
                >
                  <span className="truncate">{post.content}</span>
                  <span
                    className={`px-3 py-1 rounded-2xl font-semibold text-sm ${getBadgeColor(
                      post
                    )}`}
                  >
                    {getStatusLabel(post)}
                  </span>
                </li>
              ))}
            </ul>

            {selectedPost && (
              <div className="mt-3 p-3 border border-blue-300 rounded-2xl bg-white text-base">
                <p>
                  <strong>Post #{selectedPost.id}</strong>
                </p>
                <p className="text-sm text-gray-700 mt-1 line-clamp-3">{selectedPost.content}</p>
                <p className="mt-2">
                  <span className="font-semibold">Statut:</span>{" "}
                  <span
                    className={`px-2 py-1 rounded-lg text-sm ${getBadgeColor(
                      selectedPost
                    )}`}
                  >
                    {getStatusLabel(selectedPost)}
                  </span>
                </p>
                {selectedPost.scheduledAt && (
                  <p className="text-purple-600 text-sm mt-1 flex items-center gap-1">
                    <FiClock size={14} />
                    Programmé: {new Date(selectedPost.scheduledAt).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Créé le: {new Date(selectedPost.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}