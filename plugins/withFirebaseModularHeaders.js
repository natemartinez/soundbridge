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
 * 5. RNFBApp (react-native-firebase/app) is built as a static framework module
 *    (due to use_frameworks: "static") and includes non-modular React-Core
 *    headers (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h). This
 *    triggers -Wnon-modular-include-in-framework-module, which is promoted
 *    to an error by -Werror. Setting CLANG_ALLOW_NON_MODULAR_INCLUDES=YES
 *    on the affected Pods targets resolves this.
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

      // Remove CLANG_ALLOW_NON_MODULAR_INCLUDES fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: allow non-modular includes[\s\S]*?    end(?=\n  end\nend)/,
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
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${grpcFix}$1`
        );
      }

      // 3. Add post_install fix: allow non-modular includes in framework modules.
      //    When use_frameworks! :static is set, pods like RNFBApp are built as
      //    framework modules. They include React-Core headers (RCTConvert.h,
      //    RCTBridgeModule.h, RCTEventEmitter.h) which are not modular headers.
      //    With -Werror,-Wnon-modular-include-in-framework-module, this breaks
      //    the build. Setting CLANG_ALLOW_NON_MODULAR_INCLUDES=YES on the
      //    affected targets suppresses this error.
      const nonModularFix = `
    # Fix: allow non-modular includes in framework modules (RNFBApp, etc.).
    # When use_frameworks! :static is set, pods like RNFBApp are built as
    # framework modules but include non-modular React-Core headers. This
    # triggers -Wnon-modular-include-in-framework-module (promoted to error
    # by -Werror). Setting CLANG_ALLOW_NON_MODULAR_INCLUDES=YES resolves it.
    non_modular_targets = [
      'RNFBApp',
      'RNFBAuth',
      'RNFBFirestore',
      'RNFBSharedUtils',
      'hermes-engine',
    ]
    installer.pods_project.targets.each do |target|
      if non_modular_targets.include?(target.name)
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES'] = 'YES'
        end
        puts "  - Enabled CLANG_ALLOW_NON_MODULAR_INCLUDES for #{target.name}"
      end
    end`;

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES')) {
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${nonModularFix}$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
