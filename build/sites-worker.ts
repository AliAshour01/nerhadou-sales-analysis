import {deliverNotifications,cleanupSecurity} from '../lib/security/notifications';
import {edgeGate,securityHeaders} from '../lib/security/edge';
export {AuthRateLimiter} from '../lib/security/rate-limit';
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async scheduled(_controller:any,env:any,ctx:any){ctx.waitUntil(Promise.all([deliverNotifications(env),cleanupSecurity(env)]))},
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const denied=await edgeGate(request,env);if(denied)return securityHeaders(denied,request,env);
    if(!new URL(request.url).pathname.startsWith('/api/')&&(env as any).ASSETS){const asset=await (env as any).ASSETS.fetch(request);if(asset.status!==404)return securityHeaders(asset,request,env)}
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return securityHeaders(await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx)),request,env);
  },
};
