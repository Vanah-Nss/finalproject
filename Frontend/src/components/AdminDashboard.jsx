import React, { useState } from 'react';
import { useQuery, gql, useMutation } from '@apollo/client';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Shield, Users, Check, X, Trash2, AlertCircle, Crown, FileText, Edit, LogOut } from 'lucide-react';
import Toast from './Toast';

const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers {
      id
      email
      username
      isActive
      isAdmin
      dateJoined
    }
    me {
      id
      isAdmin
      username
    }
  }
`;

const GET_ADMIN_DATA = gql`
  query GetAdminData {
    allUsers {
      id
      email
      username
      isActive
      isAdmin
      dateJoined
    }
    allPostsAdmin {
      id
      content
      status
      createdAt
      updatedAt
      scheduledAt
      imageUrl
      user {
        id
        username
        email
      }
    }
    me {
      id
      isAdmin
      username
    }
  }
`;

const UPDATE_USER_STATUS = gql`
  mutation UpdateUserStatus($userId: ID!, $isActive: Boolean!) {
    updateUserStatus(userId: $userId, isActive: $isActive) {
      success
      message
      user {
        id
        isActive
      }
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId) {
      success
      message
    }
  }
`;

const PROMOTE_TO_ADMIN = gql`
  mutation PromoteToAdmin($userId: ID!) {
    promoteToAdmin(userId: $userId) {
      success
      message
      user {
        id
        isAdmin
      }
    }
  }
`;

const GET_ALL_POSTS_ADMIN = gql`
  query GetAllPostsAdmin {
    allPostsAdmin {
      id
      content
      status
      createdAt
      updatedAt
      scheduledAt
      imageUrl
      user {
        id
        username
      }
    }
  }
`;

const DELETE_POST_ADMIN = gql`
  mutation DeletePostAdmin($postId: ID!) {
    deletePostAdmin(postId: $postId) {
      success
      message
    }
  }
`;

const UPDATE_POST_STATUS_ADMIN = gql`
  mutation UpdatePostStatusAdmin($postId: ID!, $status: String!) {
    updatePostStatusAdmin(postId: $postId, status: $status) {
      success
      message
      post {
        id
        status
      }
    }
  }
`;

export default function AdminDashboard() {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState('users');
  const [modal, setModal] = useState({ show: false, type: '', data: {} });
  const [toasts, setToasts] = useState([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { loading, error, data, refetch } = useQuery(GET_ADMIN_DATA);
  const [updateStatus] = useMutation(UPDATE_USER_STATUS);
  const [deleteUser] = useMutation(DELETE_USER);
  const [promoteToAdmin] = useMutation(PROMOTE_TO_ADMIN);
  const [deletePostAdmin] = useMutation(DELETE_POST_ADMIN);
  const [updatePostStatusAdmin] = useMutation(UPDATE_POST_STATUS_ADMIN);

  // Vérification admin côté frontend
  const isAdmin = data?.me?.isAdmin;

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const result = await updateStatus({
        variables: { userId, isActive: !currentStatus }
      });

      if (result.data?.updateUserStatus?.success) {
        addToast(result.data.updateUserStatus.message || '✅ Statut mis à jour', 'success');
        refetch();
      }
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const result = await deleteUser({ variables: { userId } });

      if (result.data?.deleteUser?.success) {
        addToast(result.data.deleteUser.message || '✅ Utilisateur supprimé', 'success');
        refetch();
      }
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const handlePromoteToAdmin = async (userId) => {
    try {
      const result = await promoteToAdmin({ variables: { userId } });

      if (result.data?.promoteToAdmin?.success) {
        addToast(result.data.promoteToAdmin.message || '✅ Utilisateur promu admin', 'success');
        refetch();
      }
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const handleDeletePostAdmin = async (postId) => {
    try {
      const result = await deletePostAdmin({ variables: { postId } });

      if (result.data?.deletePostAdmin?.success) {
        addToast(result.data.deletePostAdmin.message || '✅ Post supprimé', 'success');
        refetch();
      }
    } catch (err) {
      alert('❌ Erreur : ' + err.message);

    }
  };

  const handleUpdatePostStatusAdmin = async (postId, newStatus) => {
    try {
      const result = await updatePostStatusAdmin({ variables: { postId, status: newStatus } });

      if (result.data?.updatePostStatusAdmin?.success) {
        addToast(result.data.updatePostStatusAdmin.message || '✅ Statut mis à jour', 'success');
        refetch();
      }
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const handleConfirm = async () => {
    const { type, data } = modal;
    setModal({ show: false, type: '', data: {} });
    if (type === 'toggleStatus') {
      await handleToggleStatus(data.userId, data.currentStatus);
    } else if (type === 'deleteUser') {
      await handleDeleteUser(data.userId);
    } else if (type === 'deletePost') {
      await handleDeletePostAdmin(data.postId);
    } else if (type === 'promote') {
      await handlePromoteToAdmin(data.userId);
    }
  };

  const addToast = (message, type) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    addToast("Déconnecté avec succès !", "success");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Erreur d'accès</h3>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès Refusé</h2>
          <p className="text-gray-600">Vous n'avez pas les permissions administrateur.</p>
        </div>
      </div>
    );
  }

  const users = data?.allUsers || [];
  const posts = data?.allPostsAdmin || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-4 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Espace Admin</h1>
                <p className="text-gray-600 mt-1">Gestion des utilisateurs</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Connecté en tant que</div>
                <div className="font-semibold text-gray-800">{clerkUser?.emailAddresses[0]?.emailAddress}</div>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Total Utilisateurs</div>
                <div className="text-3xl font-bold text-gray-800 mt-1">{users.length}</div>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Actifs</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {users.filter(u => u.isActive).length}
                </div>
              </div>
              <Check className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Désactivés</div>
                <div className="text-3xl font-bold text-red-600 mt-1">
                  {users.filter(u => !u.isActive).length}
                </div>
              </div>
              <X className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Total Posts</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">{posts.length}</div>
              </div>
              <FileText className="w-12 h-12 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Publiés</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {posts.filter(p => p.status === 'Publié').length}
                </div>
              </div>
              <Check className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Brouillons</div>
                <div className="text-3xl font-bold text-yellow-600 mt-1">
                  {posts.filter(p => p.status === 'Brouillon').length}
                </div>
              </div>
              <Edit className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">Erreurs</div>
                <div className="text-3xl font-bold text-red-600 mt-1">
                  {posts.filter(p => p.status === 'Erreur').length}
                </div>
              </div>
              <X className="w-12 h-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users className="w-5 h-5" />
              Utilisateurs ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'posts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-5 h-5" />
              Posts ({posts.length})
            </button>
          </div>
        </div>

        {/* Tables */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Utilisateur</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rôle</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Inscription</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {user.username?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="font-medium text-gray-800">{user.username || 'Sans nom'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{user.email || 'Aucun email'}</td>
                      <td className="px-6 py-4">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            <Shield className="w-3 h-3" />
                            Admin
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                            Utilisateur
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            <Check className="w-3 h-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            <X className="w-3 h-3" />
                            Inactif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(user.dateJoined).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!user.isAdmin && (
                            <button
                              onClick={() => setModal({ show: true, type: 'promote', data: { userId: user.id } })}
                              className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                              title="Promouvoir admin"
                            >
                              <Crown className="w-4 h-4" />
                              Admin
                            </button>
                          )}
                          <button
                            onClick={() => setModal({ show: true, type: 'toggleStatus', data: { userId: user.id, currentStatus: user.isActive } })}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                              user.isActive
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Désactiver' : 'Activer'}
                          </button>
                          {!user.isAdmin && (
                            <button
                              onClick={() => setModal({ show: true, type: 'deleteUser', data: { userId: user.id } })}
                              className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contenu</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Auteur</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Statut</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Créé</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="max-w-xs truncate text-gray-800">
                          {post.content.substring(0, 50)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {post.user.username}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={post.status}
                          onChange={(e) => handleUpdatePostStatusAdmin(post.id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="Brouillon">Brouillon</option>
                          <option value="Publié">Publié</option>
                          <option value="Erreur">Erreur</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setModal({ show: true, type: 'deletePost', data: { postId: post.id } })}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <div className="fixed top-4 right-4 z-50">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              Voulez-vous vraiment vous déconnecter ?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Toutes les sessions non sauvegardées seront perdues.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 rounded-lg ring-1 ring-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modal.type === 'toggleStatus' ? `Confirmer ${modal.data.currentStatus ? 'désactivation' : 'activation'}` :
               modal.type === 'deleteUser' ? 'Confirmer suppression' :
               modal.type === 'deletePost' ? 'Confirmer suppression du post' :
               modal.type === 'promote' ? 'Confirmer promotion' : ''}
            </h3>
            <p className="text-gray-600 mb-6">
              {modal.type === 'toggleStatus' ? `Voulez-vous ${modal.data.currentStatus ? 'désactiver' : 'activer'} cet utilisateur ?` :
               modal.type === 'deleteUser' ? '⚠️ ATTENTION : Supprimer définitivement cet utilisateur ?' :
               modal.type === 'deletePost' ? '⚠️ ATTENTION : Supprimer définitivement ce post ?' :
               modal.type === 'promote' ? '⚠️ Promouvoir cet utilisateur au rang d\'administrateur ?' : ''}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal({ show: false, type: '', data: {} })} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Annuler</button>
              <button onClick={handleConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}