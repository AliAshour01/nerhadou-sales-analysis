// Deployment settings are supplied by the operator after checking the live Worker.
// This function never creates databases, activates signup or applies migrations.
export function deploymentConfig(raw) {
  if (!raw) throw Error('NERHADOU_DEPLOYMENT_CONFIG is required. Copy the reviewed live Worker settings; there are no production defaults.');
  let config;
  try { config = JSON.parse(raw); } catch { throw Error('NERHADOU_DEPLOYMENT_CONFIG must be valid JSON.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw Error('Deployment configuration must be an object.');
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.name || '')) throw Error('A valid existing Worker name is required.');
  const vars = config.vars || {};
  if (vars.AUTH_MODE !== 'standalone') throw Error('Independent Workers require standalone authentication.');
  if (vars.AUTH_SETUP_VERIFIED !== 'true' || vars.AUTH_OWNER_SETUP !== 'false') throw Error('Production deployment requires verified setup and disabled owner setup.');
  let origin;
  try { origin = new URL(vars.APP_ORIGIN); } catch { throw Error('A reviewed APP_ORIGIN is required.'); }
  if (origin.protocol !== 'https:' || origin.origin !== vars.APP_ORIGIN || origin.hostname.endsWith('.chatgpt.site')) throw Error('APP_ORIGIN must be an independent HTTPS origin without a path.');
  if (config.services?.length || config.dispatch_namespaces?.length || Object.hasOwn(vars, 'PLATFORM_OWNER_EMAIL')) throw Error('Platform-only configuration cannot be deployed independently.');
  const forbidden = /SECRET|ENCRYPTION_KEY|SERVICE_ROLE|API_TOKEN|API_KEY|PASSWORD|PRIVATE_KEY/i;
  if (Object.keys(vars).some(key => forbidden.test(key))) throw Error('Keep runtime secrets in Cloudflare secrets, not deployment JSON.');
  const db = config.d1_databases?.filter(binding => binding.binding === 'DB');
  if (db?.length !== 1 || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(db[0].database_id || '') || /^00000000-/.test(db[0].database_id)) throw Error('Bind DB to the reviewed existing D1 database.');
  const limiter = config.durable_objects?.bindings?.filter(binding => binding.name === 'AUTH_RATE_LIMITER');
  if (limiter?.length !== 1 || limiter[0].class_name !== 'AuthRateLimiter') throw Error('The existing AuthRateLimiter binding is required.');
  return {
    ...config,
    main: './build/sites-worker.ts',
    compatibility_date: config.compatibility_date || '2026-05-15',
    compatibility_flags: [...new Set([...(config.compatibility_flags || []), 'nodejs_compat'])],
    keep_vars: true,
    assets: { binding: 'ASSETS', run_worker_first: true },
  };
}
