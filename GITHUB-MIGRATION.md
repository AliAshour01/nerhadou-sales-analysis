# V32 source preparation for GitHub

Status: uploaded to the private repository https://github.com/AliAshour01/nerhadou-sales-analysis. All 184 source files were uploaded and the imported tree hash matched the prepared local source. No deployment has been changed.

## Provenance

Source: Nerhadou Commercial Hub saved Version 32.
Original source commit: `dd3e4991973fd56ba96b439f96342c626b47edac`.
Saved version: `appgprj_6acfda6514988191b70ce8587b602beb~appgver_3967dc4ea1f8819197863016fb89227b`.
This identifies the saved V32 source; it does not certify byte-for-byte equality with a later manually configured live Worker.

## Boundaries

- Publish this source only to an explicitly private GitHub repository.
- Private source seed/data JSON, historical deployment ZIPs, Sites hosting identity and local runtime files are excluded from this fresh Git history. Some regression tests and documentation contain business figures; private repository access is still required.
- The existing application imports `private/seed.json` and `private/data.json`. Their original bytes must be supplied locally, or via an approved private build input, before build and data-dependent tests. No replacement data is generated. The protected originals remain in the original checkout.
- Existing database contents, users, approvals, secrets and live settings have not been copied, changed or backed up by this export.
- No automatic Cloudflare deployment is enabled. Before enabling it, reconcile the live Worker configuration with `sales.nerhadou.workers.dev`, preserve its D1 binding and configure secret/private build inputs. The historical standalone preparation script targets staging and must not be used to overwrite production settings.
- README contains historical release notes; current behavior is governed by V32 source and `docs/RELEASES.md`.

## Next steps

1. Completed: GitHub access confirmed and private repository created.
2. Completed: excluded private source files/archives and scanned common credential formats; this is not a full security audit.
3. Completed: uploaded V32 source plus requested branding; provenance retained in this document.
4. Separately verify the live standalone configuration and private build inputs before setting up CI/deployment.

## Unpublished branding update

The requested application name is **Nerhadou Sales Analysis**. The intended private GitHub repository is `AliAshour01/nerhadou-sales-analysis`. Display names and package identity have been updated in this prepared checkout. The `v32` tag still identifies the unchanged imported baseline before this branding commit. No hosted release number or deployment has been created for this change. Production Worker names, origins, database bindings and security configuration are unchanged.
