const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Configures iOS Podfile for Firebase + React Native compatibility.
 *
 * Problem chain:
 * 1. Firebase Swift pods (Auth, Firestore) depend on ObjC pods that don't
 *    define clang modules. Without module maps, Swift can't import them →
 *    pod install fails: "cannot yet be integrated as static libraries".
 * 2. use_modular_headers! generates module maps for ALL pods, fixing (1).
 * 3. But gRPC-C++ (used by Firestore) adds a -fmodule-map-file build flag
 *    pointing to a gRPC-Core.modulemap path that use_modular_headers! puts
 *    in a different location → Xcode fails: "module map file not found".
 * 4. Removing that specific build flag from gRPC-C++ in post_install fixes (3).
 */
module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // --- Clean up previous approaches ---

      // Remove use_modular_headers! if previously added (will re-add below)
      contents = contents.replace(/\n\nuse_modular_headers!\n/g, '\n');

      // Remove selective per-pod modular headers (old approach)
      contents = contents.replace(
        /\n\n  # Firebase pods require modular headers[\s\S]*?RecaptchaInterop.*?(?=\n\n)/g,
        ''
      );

      // Remove CLANG_ALLOW_NON_MODULAR_INCLUDES block (old use_frameworks! approach).
      // Pattern: from the "# Allow react-native-firebase" comment through the outer `    end`,
      // using a lookahead to stop just before `  end\nend` (closing post_install + target).
      contents = contents.replace(
        /\n\n    # Allow react-native-firebase[\s\S]*?    end\n(?=  end\nend)/,
        '\n'
      );

      // Remove gRPC fix if previously added (will re-add below)
      contents = contents.replace(
        /\n\n    # Fix: use_modular_headers![\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // --- Apply fixes ---

      // 1. Add global use_modular_headers! (generates module maps for all pods)
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(
          'prepare_react_native_project!',
          'prepare_react_native_project!\n\nuse_modular_headers!'
        );
      }

      // 2. Add post_install fix: remove broken gRPC-Core modulemap flag from ALL targets.
      // use_modular_headers! injects -fmodule-map-file pointing to a path that doesn't
      // exist, and CocoaPods propagates it to every pod that depends on gRPC-Core
      // (gRPC-C++, FirebaseFirestoreInternal, etc.), not just the root pod.
      const grpcFix = `
    # Fix: use_modular_headers! generates module maps at a different path than
    # CocoaPods injects via -fmodule-map-file for gRPC-Core. This broken flag
    # propagates to ALL pods depending on gRPC-Core, so strip it from every target.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        other_cflags = Array(config.build_settings['OTHER_CFLAGS'])
        config.build_settings['OTHER_CFLAGS'] = other_cflags.reject do |flag|
          flag.to_s.include?('gRPC-Core.modulemap')
        end
      end
    end`;

      if (!contents.includes('gRPC-Core.modulemap')) {
        // Insert just before the closing `  end\nend` (end of post_install + target blocks)
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${grpcFix}$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
