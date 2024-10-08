const fs = require("fs");
const path = require("path");

/**
 * Load the custom package.json fields
 * @param {string} customPackagePath Path to your custom package.json
 * @returns {Record<string, any>} Fields to enforce on all workspaces
 */
function loadCustomPackageFields(customPackagePath) {
  const packageJsonPath = path.resolve(customPackagePath);
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Custom package.json not found at path: ${packageJsonPath}`
    );
  }

  const customPackageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, "utf-8")
  );

  // Return the fields you want to enforce
  return customPackageJson;
}

/**
 * Ensure all workspaces have the same fields as specified in the custom package.json.
 * @param {Context} context
 * @param {Record<string, any>} fields Fields from custom package.json to enforce
 */
function enforceFieldsFromCustomPackage({ Yarn }, fields) {
  for (const workspace of Yarn.workspaces()) {
    // Skip the root workspace
    if (workspace.cwd === ".") continue;

    for (const [field, value] of Object.entries(fields)) {
      if (
        typeof value === "object" &&
        !Array.isArray(value) &&
        value !== null
      ) {
        // If it's an object, enforce only specified sub-fields, not the entire object
        for (const [subField, subValue] of Object.entries(value)) {
          const currentSubValue = workspace.manifest[field]?.[subField];
          if (currentSubValue !== subValue) {
            workspace.set([field, subField], subValue);
          }
        }
      } else {
        // Otherwise, enforce the entire field as usual
        if (workspace.manifest[field] !== value) {
          workspace.set(field, value);
        }
      }
    }
  }
}
/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require(`@yarnpkg/types`);

/**
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Context} Context
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Workspace} Workspace
 * @typedef {import('@yarnpkg/types').Yarn.Constraints.Dependency} Dependency
 */

const IGNORE_CONSISTENT_DEPENDENCIES_FOR = new Set([
  `.`,
  `packages/docusaurus`,
]);

/**
 * This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
 * We allow Docusaurus to have different dependencies for now; will be addressed later (when we remove Gatsby)
 * @param {Context} context
 */
function enforceConsistentDependenciesAcrossTheProject({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (IGNORE_CONSISTENT_DEPENDENCIES_FOR.has(dependency.workspace.cwd))
      continue;

    if (dependency.type === `peerDependencies`) continue;

    for (const otherDependency of Yarn.dependencies({
      ident: dependency.ident,
    })) {
      if (IGNORE_CONSISTENT_DEPENDENCIES_FOR.has(otherDependency.workspace.cwd))
        continue;

      if (otherDependency.type === `peerDependencies`) continue;

      if (
        (dependency.type === `devDependencies` ||
          otherDependency.type === `devDependencies`) &&
        Yarn.workspace({ ident: otherDependency.ident })
      )
        continue;

      dependency.update(otherDependency.range);
    }
  }
}

/**
 * This rule will enforce that a workspace MUST depend on the same version of a dependency as the one used by the other workspaces
 * We allow Docusaurus to have different dependencies for now; will be addressed later (when we remove Gatsby)
 * @param {Context} context
 */
function enforceWorkspaceDependenciesWhenPossible({ Yarn }) {
  for (const dependency of Yarn.dependencies()) {
    if (!Yarn.workspace({ ident: dependency.ident })) continue;

    dependency.update(`workspace:^`);
  }
}

/**
 * @param {Context} context
 * @param {string} ident
 * @param {string} explanation
 */
function forbidDependency({ Yarn }, ident, explanation) {
  for (const dependency of Yarn.dependencies({ ident })) {
    dependency.error(explanation);
  }
}

/**
 * @param {Context} context
 * @param {Record<string, ((workspace: Workspace) => any) | string>} fields
 */
function enforceFieldsOnAllWorkspaces({ Yarn }, fields) {
  for (const workspace of Yarn.workspaces()) {
    for (const [field, value] of Object.entries(fields)) {
      workspace.set(
        field,
        typeof value === `function` ? value(workspace) : value
      );
    }
  }
}

/**
 * @param {Context} context
 */
function enforceUpdateLocalScripts({ Yarn }) {
  const cli = Yarn.workspace({ ident: `@yarnpkg/cli` });
  if (!cli)
    throw new Error(
      `Assertion failed: We need the @yarnpkg/cli workspace to be present`
    );

  for (const workspace of Yarn.workspaces()) {
    if (!workspace.ident?.startsWith(`@yarnpkg/plugin-`)) continue;

    if (
      cli.manifest[`@yarnpkg/builder`].bundles.standard.includes(
        workspace.ident
      )
    )
      continue;

    if (!workspace.manifest.scripts?.[`update-local`]) {
      workspace.error(`This workspace is missing an update-local script`);
    }
  }
}

/**
 * @param {Context} context
 */
function enforcePrepackScripts({ Yarn }) {
  const OMIT_FROM_PREPACK = new Set([
    // This package is built using Rollup, so we allow it to configure its build scripts itself
    `@yarnpkg/pnp`,
    // Those packages use a different build
    `@yarnpkg/eslint-config`,
    `@yarnpkg/libui`,
  ]);

  for (const workspace of Yarn.workspaces()) {
    if (workspace.manifest.private) continue;

    if (!workspace.ident || OMIT_FROM_PREPACK.has(workspace.ident)) continue;

    workspace.set(`scripts.prepack`, `run build:compile "$(pwd)"`);
    workspace.set(`scripts.postpack`, `rm -rf lib`);
  }
}

/**
 * @param {Context} context
 * @param {string} ident
 * @param {string} otherIdent
 * @param {boolean} mustExist
 */
function enforceDependencyRelationship({ Yarn }, ident, otherIdent, mustExist) {
  for (const dependency of Yarn.dependencies({ ident })) {
    if (dependency.type === `peerDependencies`) continue;

    const hasOtherDependency = Yarn.dependency({
      workspace: dependency.workspace,
      ident: otherIdent,
    });

    if (mustExist) {
      if (hasOtherDependency) continue;

      dependency.error(
        `The presence of ${ident} in ${dependency.type} mandates the presence of ${otherIdent}`
      );
    } else {
      if (!hasOtherDependency) continue;

      dependency.error(
        `The presence of ${ident} in ${dependency.type} forbids the presence of ${otherIdent}`
      );
    }
  }
}

/**
 * Validate that all peer dependencies are provided. If one isn't, the
 * constraint will try to fix it by looking at what's used in the other
 * workspaces of the project. If it doesn't find any way to satisfy the
 * dependency, it will generate an error.
 *
 * @param {Context} context
 */
function enforcePeerDependencyPresence({ Yarn }) {
  for (const workspace of Yarn.workspaces()) {
    // The Gatsby website is pretty much deprecated anyway
    if (workspace.cwd === `packages/gatsby`) continue;

    for (const dependency of Yarn.dependencies({ workspace })) {
      if (dependency.type === `peerDependencies`) continue;

      if (!dependency.resolution) continue;

      for (const peerName of dependency.resolution.peerDependencies.keys()) {
        // Webpack plugins have peer dependencies but don't often need it; weird
        if (peerName === `webpack`) continue;

        if (dependency.resolution.dependencies.has(peerName)) continue;

        const otherDeps = Yarn.dependencies({ ident: peerName }).filter(
          (otherDep) => otherDep.type !== `peerDependencies`
        );

        if (otherDeps.length === 0)
          workspace.error(
            `Missing dependency on ${peerName} (required by ${dependency.ident})`
          );

        // If the workspace has itself a peer dependency of the same name, then
        // we assume that it'll be fulfilled by its ancestors in the dependency
        // tree, so we only need to add the dependency to devDependencies.
        const autofixTarget = Yarn.dependency({
          workspace,
          ident: peerName,
          type: `peerDependencies`,
        })
          ? `devDependencies`
          : `dependencies`;

        for (const otherDep of otherDeps) {
          workspace.set([autofixTarget, peerName], otherDep.range);
        }
      }
    }
  }
}

module.exports = defineConfig({
  constraints: async (ctx) => {
    const customPackageFields = loadCustomPackageFields(
      "./template-package.json"
    );
    enforceFieldsFromCustomPackage(ctx, customPackageFields);
    // enforceConsistentDependenciesAcrossTheProject(ctx);
    // enforceWorkspaceDependenciesWhenPossible(ctx);
    // forbidDependency(
    //   ctx,
    //   `inquirer`,
    //   `Don't depend on inquirer - we use enquirer instead`
    // );
    // enforceDependencyRelationship(ctx, `typescript`, `tslib`, true);
    // enforceUpdateLocalScripts(ctx);
    // enforcePrepackScripts(ctx);
    // enforcePeerDependencyPresence(ctx);
    // enforceFieldsOnAllWorkspaces(ctx, {
    //   license: `BSD-2-Clause`,
    //   // When changing the engines.node value check https://node.green/ for
    //   // which ECMAScript version is fully supported and update the following files as needed:
    //   // - tsconfig.json
    //   // - packages/eslint-config/index.js
    //   // - packages/yarnpkg-builder/sources/commands/new/plugin.ts
    //   [`engines.node`]: `>=18.12.0`,
    //   [`repository.type`]: `git`,
    //   [`repository.url`]: `ssh://git@github.com/yarnpkg/berry.git`,
    //   [`repository.directory`]: (workspace) => workspace.cwd,
    // });
  },
});
