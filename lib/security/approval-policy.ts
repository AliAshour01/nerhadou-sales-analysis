import { SecurityError, registrationPolicy } from './config';

// Durable, append-only policy audit in an existing table. Never sales workspace state.
export const policyTarget = 'workspace:auto-approval';
export const policyActions = "'auto-approval-enabled','auto-approval-disabled'";
export const latestPolicySQL = `SELECT * FROM approval_events WHERE target='${policyTarget}' AND action IN (${policyActions}) ORDER BY rowid DESC LIMIT 1`;
export async function autoApprovalPolicy(env: any) {
  const row = await env.DB.prepare(latestPolicySQL).first();
  const owner = row ? await env.DB.prepare("SELECT id FROM app_users WHERE id=? AND role='owner' AND status='active'").bind(row.actor).first() : null;
  return { enabled: !!(row?.action === 'auto-approval-enabled' && owner), revision: row?.id || 'initial', updatedAt: row?.created_at || null, domainOnlyEnrollment: registrationPolicy(env) === 'admin_review' };
}
export async function setAutoApproval(env: any, actor: any, input: {enabled: boolean; revision: string; acknowledgeDomainOnly: boolean}) {
  if (actor.platform || actor.role !== 'owner') throw new SecurityError(403, 'Only the workspace owner can change automatic approval.');
  if (actor.session.created_at < Date.now() - 900000) throw new SecurityError(403, 'Sign in again before changing automatic approval.', 'reauth_required');
  if (input.enabled && registrationPolicy(env) === 'admin_review' && !input.acknowledgeDomainOnly) throw new SecurityError(400, 'Confirm that this workspace does not verify mailbox ownership before enabling automatic approval.');
  const now = Date.now(), id = crypto.randomUUID(), action = input.enabled ? 'auto-approval-enabled' : 'auto-approval-disabled';
  const note = input.enabled ? 'Owner enabled immediate Viewer access for new company accounts only. Existing accounts unchanged.' + (registrationPolicy(env) === 'admin_review' ? ' Owner acknowledged that mailbox ownership is not verified.' : '') : 'Owner restored manual review for new accounts. Existing accounts unchanged.';
  const sql = `INSERT INTO approval_events(id,actor,target,action,note,created_at,target_version) SELECT ?,?,?,?,?,?,COALESCE((SELECT target_version FROM (${latestPolicySQL})),0)+1 WHERE COALESCE((SELECT id FROM (${latestPolicySQL})),'initial')=? AND EXISTS(SELECT 1 FROM app_users WHERE id=? AND role='owner' AND status='active')`;
  const result = await env.DB.prepare(sql).bind(id,actor.id,policyTarget,action,note,now,input.revision,actor.id).run();
  if (!result.meta.changes) throw new SecurityError(409, 'Approval settings changed. Refresh and try again.');
  return { enabled: input.enabled, revision: id, updatedAt: now, domainOnlyEnrollment: registrationPolicy(env) === 'admin_review' };
}
