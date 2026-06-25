const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Sets CLANG_ALLOW_NON_MODULAR_INCLUDES = YES on the main Xcode project target.
 *
 * Problem: When use_frameworks! :static is enabled, the main app target may
 * also encounter -Wnon-modular-include-in-framework-module errors if any
 * of its source files include headers from pods that aren't modular.
 *
 * This is a safety net — the primary fix is in the Podfile post_install hook
 * (see withFirebaseModularHeaders.js), but setting it on the main target too
 * ensures no build flags leak through from the app target level.
 */
module.exports = function withAllowNonModularIncludes(config) {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;

    // Get the hash of configuration lists (keyed by UUID) — this is a function
    const configLists = xcodeProject.pbxXCConfigurationList();

    // Get the hash of build configurations (keyed by UUID)
    const buildConfigs = xcodeProject.pbxXCBuildConfigurationSection();

    // Iterate over all native targets
    const nativeTargets = xcodeProject.pbxNativeTargetSection();
    for (const target of Object.values(nativeTargets)) {
      if (!target.isa || target.isa !== 'PBXNativeTarget') continue;
      if (!target.buildConfigurationList) continue;

      const configList = configLists[target.buildConfigurationList];
      if (!configList) continue;

      // Iterate over build configurations in this list
      // buildConfigurations is an array of { value: uuid, comment: name }
      for (const configRef of configList.buildConfigurations) {
        const buildConfigUuid = configRef.value || configRef;
        const buildConfig = buildConfigs[buildConfigUuid];
        if (!buildConfig) continue;

        const buildSettings = buildConfig.buildSettings || {};
        if (!buildSettings.CLANG_ALLOW_NON_MODULAR_INCLUDES) {
          buildSettings.CLANG_ALLOW_NON_MODULAR_INCLUDES = 'YES';
        }
      }
    }

    return config;
  });
};
