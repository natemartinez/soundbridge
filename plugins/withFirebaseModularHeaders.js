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
 * 2. use_frameworks! :static (set via expo-build-properties) builds ALL pods
 *    as static frameworks, which automatically generates module maps. This
 *    makes use_modular_headers! redundant and actually causes conflicts:
 *    - gRPC-Core modulemap path mismatches
 *    - Firebase/Firebase.h header resolution failures
 *    So we do NOT add use_modular_headers! here.
 * 3. RNFBApp (react-native-firebase/app) is built as a static framework module
 *    (due to use_frameworks: "static") and includes non-modular React-Core
 *    headers (RCTConvert.h, RCTBridgeModule.h, RCTEventEmitter.h). This
 *    triggers -Wnon-modular-include-in-framework-module, which is promoted
 *    to an error by -Werror. Setting CLANG_ALLOW_NON_MODULAR_INCLUDES=YES
 *    on the affected Pods targets resolves this.
 * 4. Pods like stripe-react-native include RCTFollyConvert.h which transitively
 *    includes <react/utils/FollyConvert.h> from React-utils. Since these pods
 *    don't depend on React-utils directly, their header search paths don't
 *    include the ReactCommon directory. Adding it to HEADER_SEARCH_PATHS
 *    for affected pods resolves this. We use target_installation_results
 *    (same API as react_native_post_install's update_search_paths) to ensure
 *    our changes survive CocoaPods' xcconfig processing.
 */
module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // --- Clean up previous approaches ---

      // Remove use_modular_headers! if previously added (no longer needed;
      // use_frameworks! :static generates module maps automatically).
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

      // Remove gRPC fix if previously added (no longer needed without use_modular_headers!)
      contents = contents.replace(
        /\n\n    # Fix: use_modular_headers![\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove CLANG_ALLOW_NON_MODULAR_INCLUDES fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: allow non-modular includes[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove React-utils header search paths fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: add React-utils header search paths[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove React-utils header search paths fix (OTHER_CFLAGS variant) if previously added
      contents = contents.replace(
        /\n\n    # Fix: add React-utils header search paths via OTHER_CFLAGS[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // --- Apply fixes ---

      // Note: use_modular_headers! is NOT added here because use_frameworks! :static
      // (set via expo-build-properties) already generates module maps for all pods
      // automatically. Adding use_modular_headers! on top causes:
      //   - gRPC-Core modulemap path conflicts
      //   - Firebase/Firebase.h header resolution failures
      // The gRPC-Core modulemap fix is also not needed since we don't use
      // use_modular_headers!.

      // 1. Add post_install fix: allow non-modular includes in framework modules.
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

      // 2. Add post_install fix: add React-utils header search paths.
      //    Pods like stripe-react-native include RCTFollyConvert.h (from React-Core)
      //    which transitively includes <react/utils/FollyConvert.h> via angle-bracket
      //    imports. Since these pods don't depend on React-utils directly, their
      //    header search paths don't include the ReactCommon directory.
      //    We use target_installation_results (same API as react_native_post_install's
      //    update_search_paths) to ensure our changes are applied at the same level
      //    as React Native's own modifications and survive xcconfig processing.
      const reactUtilsHeadersFix = `
    # Fix: add React-utils header search paths for pods that include RCTFollyConvert.h.
    # Pods like stripe-react-native include RCTFollyConvert.h (from React-Core) which
    # transitively includes <react/utils/FollyConvert.h>. Since these pods don't
    # depend on React-utils directly, their header search paths don't include the
    # ReactCommon directory. We use target_installation_results (same API as
    # react_native_post_install's update_search_paths) to ensure our changes are
    # applied at the same level as React Native's own modifications.
    react_common_path = File.join(
      File.dirname(\`node --print "require.resolve('react-native/package.json')"\`),
      'ReactCommon'
    )
    # Pods known to include RCTFollyConvert.h (directly or transitively)
    folly_pods = [
      'stripe-react-native',
      'RNFBApp',
      'RNFBAuth',
      'RNFBFirestore',
      'RNFBSharedUtils',
    ]
    # Use target_installation_results (same API as update_search_paths) to ensure
    # our changes are applied at the same level as RN's own modifications.
    installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
      if folly_pods.include?(pod_name)
        target_installation_result.native_target.build_configurations.each do |config|
          # HEADER_SEARCH_PATHS may be a string (space-separated) or array.
          # Handle both cases properly.
          current = config.build_settings['HEADER_SEARCH_PATHS']
          search_paths = current.is_a?(Array) ? current : (current || '').split
          new_path = "\\"\#{react_common_path}\\""
          unless search_paths.any? { |p| p.include?('ReactCommon') }
            search_paths << new_path
            config.build_settings['HEADER_SEARCH_PATHS'] = search_paths
          end
        end
        puts "  - Added React-utils header search path for \#{pod_name}"
      end
    end`;

      if (!contents.includes('React-utils header search paths')) {
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${reactUtilsHeadersFix}$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
