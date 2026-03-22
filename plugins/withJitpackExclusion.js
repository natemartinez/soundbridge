const {
  withGradleProperties,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

/**
 * Restricts JitPack to only serve com.github.* packages on EAS Build.
 *
 * Problem: JitPack times out (not 404) on EAS servers when Gradle queries it
 * for version listings of dynamic versions (+). Any non-com.github.* package
 * with a dynamic version (com.stripe:stripe-android:22.8.+, org.jitsi:webrtc:124.+)
 * will hang waiting for JitPack to respond.
 *
 * Solution: Use repositories.all {} with includeGroupByRegex to whitelist
 * JitPack to ONLY serve com.github.* packages (what JitPack actually hosts).
 * All other groups are excluded from JitPack and resolved from Maven Central
 * or Google, which respond properly.
 *
 * Packages that need JitPack (BlurView, Glide) use com.github.* group IDs
 * and continue to work. Non-GitHub packages resolve from their proper repos.
 */
module.exports = function withJitpackExclusion(config) {
  // 1. Ensure JitPack is NOT disabled (needed for com.github.* packages).
  //    Also enforce arm64-v8a only for development builds — modern Android
  //    phones are arm64; building x86/x86_64 (emulator archs) triples APK size.
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) =>
        item.key !== 'react.includeJitpackRepository' &&
        item.key !== 'reactNativeArchitectures'
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a',
    });
    return config;
  });

  // 2. Whitelist JitPack to only serve com.github.* packages.
  //    Uses repositories.all {} so the filter catches repos added LATER
  //    by the RN plugin (not just the static allprojects block).
  config = withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Skip if already applied
    if (contents.includes('includeGroupByRegex')) {
      return config;
    }

    // Insert BEFORE "apply plugin" lines so the callback is registered
    // before the RN plugin adds JitPack via its own allprojects {} block.
    const filterBlock = [
      '',
      '// Restrict JitPack to com.github.* packages only.',
      '// Prevents EAS Build timeouts from dynamic version queries on non-JitPack packages.',
      'allprojects {',
      '  repositories.all { repo ->',
      '    if (repo instanceof MavenArtifactRepository && repo.url.toString().contains("jitpack.io")) {',
      "      repo.content { includeGroupByRegex 'com\\\\.github\\\\..*' }",
      '    }',
      '  }',
      '}',
      '',
    ].join('\n');

    contents = contents.replace(
      'apply plugin: "expo-root-project"',
      filterBlock + 'apply plugin: "expo-root-project"'
    );

    config.modResults.contents = contents;
    return config;
  });

  return config;
};
