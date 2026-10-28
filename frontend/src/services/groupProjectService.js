/**
 * ============================================================================
 * TaskFlow - Service Groupes, Projets, Invitations, Chat & Fichiers
 * ============================================================================
 */

import { api } from '../api/client'
import { normalizeTaskFromApi } from './taskService'

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

export async function fetchProjectDetails(projectId) {
  return api.get(`/projects/${projectId}`)
}

export async function addOrUpdateProjectMember(projectId, { userId, role }) {
  return api.post(`/projects/${projectId}/members`, { userId, role })
}

export async function removeProjectMember(projectId, userId) {
  return api.delete(`/projects/${projectId}/members/${userId}`)
}

export async function fetchProjectTasks(projectId) {
  const data = await api.get(`/projects/${projectId}/tasks`)
  return Array.isArray(data) ? data.map(normalizeTaskFromApi) : []
}

export async function createProjectTask(projectId, payload) {
  const created = await api.post(`/projects/${projectId}/tasks`, payload)
  return normalizeTaskFromApi(created)
}

export async function updateProjectTask(projectId, taskId, updates) {
  const updated = await api.patch(
    `/projects/${projectId}/tasks/${taskId}`,
    updates
  )
  return normalizeTaskFromApi(updated)
}

export async function deleteProjectTask(projectId, taskId) {
  return api.delete(`/projects/${projectId}/tasks/${taskId}`)
}

export async function fetchProjectMessages(projectId) {
  return api.get(`/projects/${projectId}/messages`)
}

export async function sendProjectMessage(projectId, content) {
  return api.post(`/projects/${projectId}/messages`, { content })
}

export async function fetchProjectFiles(projectId) {
  return api.get(`/projects/${projectId}/files`)
}

export async function uploadProjectFile(projectId, filePayload) {
  return api.post(`/projects/${projectId}/files`, filePayload)
}

export async function deleteProjectFile(projectId, fileId) {
  return api.delete(`/projects/${projectId}/files/${fileId}`)
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

export function getBackendOrigin() {
  const base = api.getBaseUrl() // ex: http://localhost:3000/api
  return base.replace(/\/api\/?$/, '')
}
