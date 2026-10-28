/**
 * ============================================================================
 * TaskFlow - Service Groupes, Projets & Invitations (API Service Layer)
 * ============================================================================
 * Connecté aux endpoints réels du backend Express / MongoDB :
 * - GET / POST / DELETE /api/groups
 * - GET / POST /api/groups/:groupId/projects
 * - GET / POST / DELETE /api/groups/:groupId/invitations
 * - GET / POST /api/invitations/:token(/accept)
 * - GET /api/projects
 * ============================================================================
 */

import { api } from '../api/client'

export async function fetchGroups() {
  return api.get('/groups')
}

export async function createGroup(name) {
  return api.post('/groups', { name })
}

export async function deleteGroup(groupId) {
  return api.delete(`/groups/${groupId}`)
}

export async function fetchGroupProjects(groupId) {
  return api.get(`/groups/${groupId}/projects`)
}

export async function createGroupProject(groupId, { name, description = '' }) {
  return api.post(`/groups/${groupId}/projects`, { name, description })
}

export async function fetchMyProjects() {
  return api.get('/projects')
}

export async function fetchGroupInvitations(groupId) {
  return api.get(`/groups/${groupId}/invitations`)
}

export async function sendGroupInvitation(groupId, { email, role = 'member' }) {
  return api.post(`/groups/${groupId}/invitations`, { email, role })
}

export async function revokeGroupInvitation(groupId, invitationId) {
  return api.delete(`/groups/${groupId}/invitations/${invitationId}`)
}

export async function checkInvitationToken(token) {
  return api.get(`/invitations/${token}`)
}

export async function acceptInvitationToken(token) {
  return api.post(`/invitations/${token}/accept`, {})
}
