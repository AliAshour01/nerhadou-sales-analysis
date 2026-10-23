# Nerhadou Sales Analysis — GitHub migration

Source provenance: saved V32 commit `dd3e4991973fd56ba96b439f96342c626b47edac`; branding changed to Nerhadou Sales Analysis. The local `v32` tag refers to the imported baseline; it has not been published as a GitHub release.

The owner manually deployed and confirmed the renamed application on the existing Worker. Confirmed deployment: `4730a1a5-ffd7-410d-b3ec-06f8eb1c9951`. The repository is private and is now connected to the company Cloudflare Worker.

The current changes complete source building for continuous deployment. See `deployment/CLOUDFLARE-BUILDS.md` for exact settings, provenance, verification and remaining live-build confirmation.

Confidential server-side source baseline inputs are now included as compressed build inputs inside this PRIVATE repository to make builds reproducible. They are not encrypted, public assets, database backups or live overrides. Original bytes and hashes are unchanged. Runtime secrets and historical deployment archives remain excluded.

Publishing this code does not reset/import/restore database records, account approvals or sessions. All remain attached to the same existing production D1 and runtime configuration.
