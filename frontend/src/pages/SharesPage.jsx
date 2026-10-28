/**
 * ============================================================================
 * TaskFlow - Page Groupes, Projets & Invitations par Email (React 19 + Tailwind)
 * ============================================================================
 * Connectée directement aux nouvelles routes API Backend :
 * - GET / POST /api/groups
 * - GET / POST /api/groups/:groupId/projects
 * - GET / POST / DELETE /api/groups/:groupId/invitations (SMTP Gmail)
 * - POST /api/invitations/:token/accept
 * ============================================================================
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchGroups,
  createGroup,
  deleteGroup,
  updateGroupMemberRole,
  removeGroupMember,
  fetchGroupProjects,
  createGroupProject,
  deleteProject,
  fetchGroupInvitations,
  sendGroupInvitation,
  revokeGroupInvitation,
  acceptInvitationToken,
} from '../services/groupProjectService'

export default function SharesPage({
  currentUser,
  onNavigateToLogin,
  onShowToast,
}) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [projects, setProjects] = useState([])
  const [invitations, setInvitations] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Création rapide de Groupe / Projet
  const [newGroupName, setNewGroupName] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')

  // Formulaire d'invitation par e-mail (SMTP Gmail)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [isSending, setIsSending] = useState(false)

  // Acceptation manuelle d'un jeton d'invitation
  const [manualToken, setManualToken] = useState('')

  useEffect(() => {
    if (!currentUser) return
    let active = true
    async function initGroups() {
      try {
        const data = await fetchGroups()
        if (!active) return
        setGroups(data)
        if (data.length > 0) {
          setSelectedGroupId((prev) => prev || data[0].id)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    initGroups()
    return () => {
      active = false
    }
  }, [currentUser])

  useEffect(() => {
    if (!selectedGroupId) return
    let active = true
    async function initGroupDetails() {
      try {
        const [projs, invs] = await Promise.all([
          fetchGroupProjects(selectedGroupId).catch(() => []),
          fetchGroupInvitations(selectedGroupId).catch(() => []),
        ])
        if (!active) return
        setProjects(projs)
        setInvitations(invs)
      } catch (err) {
        console.error(err)
      }
    }
    initGroupDetails()
    return () => {
      active = false
    }
  }, [selectedGroupId])

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    try {
      const created = await createGroup(newGroupName.trim())
      setGroups((prev) => [created, ...prev])
      setSelectedGroupId(created.id)
      setNewGroupName('')
      onShowToast?.(`Groupe « ${created.name} » créé !`)
    } catch (err) {
      onShowToast?.(err.message || 'Erreur lors de la création du groupe')
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    if (!selectedGroupId || !newProjectName.trim()) return
    try {
      const created = await createGroupProject(selectedGroupId, {
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
      })
      setProjects((prev) => [created, ...prev])
      setNewProjectName('')
      setNewProjectDesc('')
      onShowToast?.(`Projet « ${created.name} » ajouté au groupe !`)
    } catch (err) {
      onShowToast?.(err.message || 'Erreur lors de la création du projet')
    }
  }

  async function handleSendInvitation(e) {
    e.preventDefault()
    if (!selectedGroupId || !recipientEmail.trim() || isSending) return
    setIsSending(true)
    try {
      const created = await sendGroupInvitation(selectedGroupId, {
        email: recipientEmail.trim(),
        role: inviteRole,
      })
      setInvitations((prev) => [created, ...prev])
      setRecipientEmail('')
      onShowToast?.(
        `Invitation envoyée par e-mail à ${created.email} (rôle: ${created.role}) !`
      )
    } catch (err) {
      onShowToast?.(err.message || "Erreur lors de l'envoi de l'invitation")
    } finally {
      setIsSending(false)
    }
  }

  async function handleRevokeInvitation(invitationId) {
    if (!selectedGroupId) return
    try {
      await revokeGroupInvitation(selectedGroupId, invitationId)
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId))
      onShowToast?.('Invitation révoquée')
    } catch (err) {
      onShowToast?.(err.message || 'Impossible de révoquer cette invitation')
    }
  }

  const [updatingMemberId, setUpdatingMemberId] = useState(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)

  async function handleUpdateGroupMemberRole(userId, newRole) {
    if (!selectedGroupId || !userId || !newRole) return
    setUpdatingMemberId(userId)
    try {
      const updatedGroup = await updateGroupMemberRole(
        selectedGroupId,
        userId,
        newRole
      )
      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroupId ? updatedGroup : g))
      )
      onShowToast?.(`Rôle du membre mis à jour (${newRole}) !`)
    } catch (err) {
      onShowToast?.(
        err.message || 'Impossible de modifier le rôle de ce membre'
      )
    } finally {
      setUpdatingMemberId(null)
    }
  }

  async function handleRemoveGroupMember(userId, memberName) {
    if (!selectedGroupId || !userId) return
    setUpdatingMemberId(userId)
    try {
      const updatedGroup = await removeGroupMember(selectedGroupId, userId)
      setGroups((prev) =>
        prev.map((g) => (g.id === selectedGroupId ? updatedGroup : g))
      )
      onShowToast?.(`${memberName || 'Le membre'} a été retiré du groupe`)
    } catch (err) {
      onShowToast?.(err.message || 'Impossible de retirer ce membre du groupe')
    } finally {
      setUpdatingMemberId(null)
    }
  }

  async function handleDeleteActiveGroup() {
    if (!selectedGroupId) return
    try {
      await deleteGroup(selectedGroupId)
      const remaining = groups.filter((g) => g.id !== selectedGroupId)
      setGroups(remaining)
      setSelectedGroupId(remaining[0]?.id || '')
      setConfirmDeleteGroup(false)
      onShowToast?.('Groupe supprimé avec succès')
    } catch (err) {
      onShowToast?.(err.message || 'Impossible de supprimer ce groupe')
    }
  }

  async function handleDeleteProjectFromList(e, projectId, projectName) {
    e.stopPropagation()
    try {
      await deleteProject(projectId)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      onShowToast?.(`Projet « ${projectName} » supprimé`)
    } catch (err) {
      onShowToast?.(err.message || 'Impossible de supprimer ce projet')
    }
  }

  async function handleAcceptToken(e) {
    e.preventDefault()
    const raw = manualToken.trim()
    if (!raw) return
    const tokenMatch = raw.match(/token=([a-f0-9]+)/i)
    const cleanToken = tokenMatch ? tokenMatch[1] : raw
    try {
      const res = await acceptInvitationToken(cleanToken)
      setManualToken('')
      const updatedGroups = await fetchGroups()
      setGroups(updatedGroups)
      if (res.group?.id) setSelectedGroupId(res.group.id)
      onShowToast?.(`Vous avez rejoint le groupe « ${res.group?.name} » !`)
    } catch (err) {
      onShowToast?.(err.message || 'Jeton invalide ou expiré')
    }
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-space-xl my-8 mx-gutter bg-surface-container-lowest rounded-xl border border-outline-variant/15 shadow-xs max-w-xl sm:mx-auto gap-3">
        <span className="material-symbols-outlined text-[32px] text-secondary">
          lock
        </span>
        <h2 className="text-base sm:text-lg font-bold text-on-surface">
          Connectez-vous pour gérer vos Groupes, Projets & Invitations
        </h2>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md">
          La création d'espaces de travail collaboratifs et l'envoi d'invitations
          sécurisées par e-mail nécessitent un compte authentifié.
        </p>
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="mt-2 px-5 py-2.5 bg-primary text-on-primary text-xs sm:text-sm font-semibold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Se connecter / S'inscrire
        </button>
      </div>
    )
  }

  const activeGroup = groups.find((g) => g.id === selectedGroupId)
  const activeGroupMembers = activeGroup?.members || []
  const myGroupMember = activeGroupMembers.find(
    (m) => m.userId === currentUser?.id
  )
  const myGroupRole =
    activeGroup?.myRole ||
    (activeGroup?.ownerId === currentUser?.id
      ? 'owner'
      : myGroupMember?.role || 'member')
  const isGroupOwner = myGroupRole === 'owner'
  const canManageActiveGroup =
    myGroupRole === 'owner' || myGroupRole === 'admin'

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto px-gutter pt-space-md gap-space-lg">
      {/* 1. Header Contextuel */}
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">
              workspaces
            </span>
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">
              Espaces Collaboratifs & SMTP
            </span>
          </div>
          <span className="text-xs text-outline font-medium">
            {groups.length} groupe(s) · {projects.length} projet(s)
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Groupes, Projets & Invitations Email
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant">
          Créez vos groupes et sous-projets, et invitez vos coéquipiers par
          e-mail sécurisé (avec jeton et expiration).
        </p>
      </div>

      {/* 2. Gestion des Groupes */}
      <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
        <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
          <span className="text-xs sm:text-sm font-bold text-on-surface">
            1. Mes Groupes (Espaces de travail)
          </span>
          <span className="text-xs text-outline">
            {isLoading ? 'Chargement...' : `${groups.length} actif(s)`}
          </span>
        </div>

        {groups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const isSelected = g.id === selectedGroupId
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    groups
                  </span>
                  <span>{g.name}</span>
                  <span className="text-[10px] opacity-75">
                    ({g.members?.length || 1})
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nouveau groupe (ex: Promo M1 FullStack, Équipe TechCorp)..."
            className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-transparent focus:border-secondary outline-none"
          />
          <button
            type="submit"
            disabled={!newGroupName.trim()}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            + Créer Groupe
          </button>
        </form>
      </section>

      {/* 3. Sous-Projets du Groupe sélectionné */}
      {activeGroup && (
        <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
            <span className="text-xs sm:text-sm font-bold text-on-surface">
              2. Projets du groupe « {activeGroup.name} »
            </span>
            <span className="text-xs font-semibold text-secondary">
              {projects.length} projet(s)
            </span>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/15 flex flex-col gap-2 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                      {p.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high font-semibold">
                        {p.members?.length || 1} membre(s)
                      </span>
                      {canManageActiveGroup && (
                        <button
                          type="button"
                          onClick={(e) =>
                            handleDeleteProjectFromList(e, p.id, p.name)
                          }
                          className="p-1 rounded-lg text-outline hover:text-secondary hover:bg-surface-container-lowest transition-colors cursor-pointer"
                          title={`Supprimer le projet ${p.name}`}
                          aria-label={`Supprimer le projet ${p.name}`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  {p.description && (
                    <p className="text-xs text-outline truncate">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-secondary">
                    <span>Ouvrir (Matrice · Chat · Fichiers)</span>
                    <span className="material-symbols-outlined text-[15px]">
                      arrow_forward
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-outline italic">
              Aucun sous-projet dans ce groupe pour le moment.
            </p>
          )}

          <form
            onSubmit={handleCreateProject}
            className="flex flex-col sm:flex-row gap-2 pt-1"
          >
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Nom du projet (ex: Sprint 1 Backend)..."
              className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-transparent focus:border-secondary outline-none"
            />
            <input
              type="text"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Description (optionnelle)..."
              className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-transparent focus:border-secondary outline-none"
            />
            <button
              type="submit"
              disabled={!newProjectName.trim()}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
            >
              + Créer Projet
            </button>
          </form>
        </section>
      )}

      {/* 3b. Membres & Rôles du Groupe sélectionné (PATCH & DELETE /api/groups/:groupId/members/:userId) */}
      {activeGroup && (
        <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-on-surface">
                3. Membres & Rôles du groupe « {activeGroup.name} »
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-bold uppercase text-on-surface">
                Mon rôle : {myGroupRole}
              </span>
            </div>

            {isGroupOwner && (
              <div className="flex items-center gap-1.5">
                {confirmDeleteGroup ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteActiveGroup}
                      className="px-2.5 py-1 rounded-lg bg-secondary text-on-secondary text-[11px] font-bold cursor-pointer"
                    >
                      Confirmer suppression
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroup(false)}
                      className="px-2 py-1 rounded-lg bg-surface-container-low text-outline text-[11px] font-semibold cursor-pointer"
                    >
                      Annuler
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteGroup(true)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-secondary-fixed text-secondary text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      delete
                    </span>
                    <span>Supprimer ce groupe</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {activeGroupMembers.map((member) => {
              const isMemberOwner =
                member.role === 'owner' ||
                member.userId === activeGroup.ownerId
              const isBusy = updatingMemberId === member.userId
              const displayMemberName =
                member.name ||
                (member.email ? member.email.split('@')[0] : 'Membre')
              const initials = displayMemberName
                .split(' ')
                .map((w) => w[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)

              return (
                <div
                  key={member.userId}
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {initials || 'MB'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {displayMemberName}
                        </span>
                        {member.userId === currentUser?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-outline font-semibold">
                            Vous
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <span className="text-[11px] text-outline truncate font-mono">
                          {member.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMemberOwner || !canManageActiveGroup ? (
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                          isMemberOwner
                            ? 'bg-secondary text-on-secondary'
                            : member.role === 'admin'
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface'
                        }`}
                      >
                        {isMemberOwner ? 'owner' : member.role}
                      </span>
                    ) : (
                      <>
                        <select
                          aria-label={`Rôle de ${displayMemberName}`}
                          value={member.role}
                          disabled={isBusy}
                          onChange={(e) =>
                            handleUpdateGroupMemberRole(
                              member.userId,
                              e.target.value
                            )
                          }
                          className="bg-surface-container-lowest text-on-surface text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-outline-variant/20 focus:border-secondary outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="admin">admin</option>
                          <option value="member">member</option>
                        </select>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleRemoveGroupMember(
                              member.userId,
                              displayMemberName
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-secondary-fixed text-secondary text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                          title="Retirer ce membre du groupe"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            person_remove
                          </span>
                          <span className="hidden sm:inline">Retirer</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Formulaire d'invitation par e-mail (POST /api/groups/:groupId/invitations) */}
      {activeGroup && (
        <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-md border border-outline-variant/15">
          <div className="flex items-center justify-between border-b border-outline-variant/10 pb-2">
            <span className="text-xs sm:text-sm font-bold text-on-surface">
              4. Inviter un membre par e-mail dans « {activeGroup.name} »
            </span>
            <span className="text-xs font-semibold text-secondary">
              SMTP Gmail Actif
            </span>
          </div>

          <form onSubmit={handleSendInvitation} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="recipient-email"
                className="text-xs font-semibold text-on-surface-variant"
              >
                Email du destinataire
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="collegue@entreprise.fr ou etudiant@ecole.fr"
                  className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-transparent focus:border-secondary outline-none"
                >
                  <option value="member">Rôle : Member</option>
                  <option value="admin">Rôle : Admin</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending || !recipientEmail.trim()}
              className="w-full h-11 bg-secondary hover:bg-[#a01f29] text-on-secondary rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>
                {isSending
                  ? 'Envoi du mail SMTP en cours...'
                  : "Envoyer le lien d'invitation par e-mail"}
              </span>
            </button>
          </form>
        </section>
      )}

      {/* 5. Accepter une invitation avec un jeton */}
      <section className="bg-surface-container-lowest rounded-xl shadow-xs p-space-md flex flex-col gap-space-sm border border-outline-variant/15">
        <span className="text-xs sm:text-sm font-bold text-on-surface">
          Vous avez reçu un jeton ou un lien d'invitation ?
        </span>
        <form onSubmit={handleAcceptToken} className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Collez le token ou l'URL d'invitation reçue par mail..."
            className="flex-1 bg-surface-container-low text-on-surface text-xs sm:text-sm px-3 py-2 rounded-xl border border-transparent focus:border-secondary outline-none"
          />
          <button
            type="submit"
            disabled={!manualToken.trim()}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            Rejoindre
          </button>
        </form>
      </section>

      {/* 6. Historique réel des invitations du groupe */}
      {activeGroup && (
        <section className="flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Invitations envoyées pour « {activeGroup.name} »
            </span>
            <span className="text-[11px] text-outline">
              {invitations.length} invitation(s)
            </span>
          </div>

          {invitations.length > 0 ? (
            <div className="flex flex-col gap-2">
              {invitations.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest rounded-xl shadow-xs p-3 flex items-center justify-between gap-space-sm border border-outline-variant/15"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                      {item.email}
                    </span>
                    <span className="text-xs text-outline">
                      Rôle : {item.role} · Statut :{' '}
                      <strong className="text-on-surface">{item.status}</strong>
                    </span>
                  </div>
                  {item.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleRevokeInvitation(item.id)}
                      className="text-xs text-secondary font-semibold hover:underline cursor-pointer"
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-outline italic px-1">
              Aucune invitation envoyée pour ce groupe.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
