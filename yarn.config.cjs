/**
 * List of packages we require to be present in the package.json
 */
const requiredWorkspacesFields = [
  "name",
  "version",
  "author",
  "license",
  "description",
];
/**
 * List of scripts we require to be available for all packages
 */
const requiredScripts = ["build", "start", "lint"];
/**
 * List of dependencies NOT allowed to be used in any package
 * Note: Dependencies are arbitrarily selected - nothing bad about these specific ones
 */
const forbiddenDependencies = ["yup", "lodash", "vega"];

/**
 * Map of ranges we require for specific dependencies
 * (Only use when some min/max version is required)
 */
const allowedRanges = new Map([["expo", "~50.0.0"]]);

module.exports = {
  async constraints(ctx) {
    // validatePresenceOfRequiredFields(ctx, requiredWorkspacesFields);
    // validatePresenceOfRequiredScripts(ctx, requiredScripts);
    // enforcePrivateFlag(ctx);
    // forbidDependencies(ctx, forbiddenDependencies);
    enforceDependencyRanges(ctx, allowedRanges);
  },
};

// function validatePresenceOfRequiredFields({Yarn}, requiredFields) {
//     for (const workspace of Yarn.workspaces()) {
//         const existingKeys = Object.keys(workspace.manifest);
//         requiredFields.forEach((field) => {
//             if (!existingKeys.includes(field)) {
//                 workspace.error(`Missing required field: ${field}`);
//                 // we do want to enforce some specific value, so workspace.set is not an option
//             }
//         });
//     }
// }

// function enforcePrivateFlag({Yarn}) {
//     for (const workspace of Yarn.workspaces()) {
//         workspace.set("private", true);
//     }
// }

// function validatePresenceOfRequiredScripts({Yarn}, requiredScripts) {
//     for (const workspace of Yarn.workspaces()) {
//         if (workspace.manifest.scripts === undefined) {
//             workspace.error(`Missing required field 'scripts'`);
//             return;
//         }
//         const existingScripts = Object.keys(workspace.manifest.scripts);
//         requiredScripts.forEach((script) => {
//             if (!existingScripts.includes(script)) {
//                 workspace.error(`Missing required script: ${script}`);
//             }
//         });
//     }
// }

function enforceDependencyRanges({ Yarn }, allowedRanges) {
  allowedRanges.forEach((range, dependency) => {
    for (const dep of Yarn.dependencies({ ident: dependency })) {
      dep.update(range);
    }
  });
}

// function forbidDependencies({Yarn}, forbiddenDependencies) {
//     forbiddenDependencies.forEach((dependency) => {
//         for (const dep of Yarn.dependencies({ident: dependency})) {
//             dep.delete();
//         }
//     });
// }
