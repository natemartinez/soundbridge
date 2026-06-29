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
 * 5. RNFBFirestore includes <Firebase/Firebase.h> (the umbrella header from
 *    the core Firebase pod) but its podspec only depends on Firebase/Firestore
 *    (a subspec), not Firebase directly. When use_frameworks! :static is set,
 *    Firebase/Firestore creates FirebaseFirestore.framework while Firebase.h
 *    lives in Firebase.framework. Since RNFBFirestore doesn't depend on
 *    Firebase directly, CocoaPods doesn't add Firebase.framework/Headers to
 *    its header search paths. We add it explicitly in the post_install hook.
 * 6. CRITICAL: When modifying FRAMEWORK_SEARCH_PATHS or HEADER_SEARCH_PATHS
 *    via config.build_settings in the post_install hook, we MUST use
 *    $(inherited) as the default when the value is nil. CocoaPods sets these
 *    build settings via xcconfig files, not in the project file's
 *    config.build_settings. If we set config.build_settings without
 *    $(inherited), we override the xcconfig values and lose dependency paths
 *    (e.g., RNFBApp.framework, FirebaseFirestore.framework). This is why
 *    React Native's own update_search_paths and update_header_paths_if_depends_on
 *    both use "$(inherited)" as the default fallback.
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

      // Remove Firebase/CoreOnly header search path fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: add Firebase\/CoreOnly header search path[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove Firebase framework header search path fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: add Firebase framework header search path[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove Firebase framework search path fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: add Firebase framework search path[\s\S]*?    end(?=\n  end\nend)/,
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
      //    IMPORTANT: We use '$(inherited)' as the default when HEADER_SEARCH_PATHS
      //    is nil, to preserve xcconfig values from CocoaPods. Without this, we
      //    override the xcconfig and lose dependency framework search paths.
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
    puts "  [DIAG] ReactCommon path resolved to: \#{react_common_path}"
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
        puts "  [DIAG] Processing \#{pod_name} for React-utils header search path..."
        target_installation_result.native_target.build_configurations.each do |config|
          # HEADER_SEARCH_PATHS may be a string (space-separated) or array.
          # Handle both cases properly.
          # IMPORTANT: Use $(inherited) as default when nil, to preserve xcconfig values.
          # CocoaPods sets FRAMEWORK_SEARCH_PATHS and HEADER_SEARCH_PATHS via xcconfig,
          # not in config.build_settings. If we set config.build_settings without
          # $(inherited), we override the xcconfig values and lose dependency paths.
          current = config.build_settings['HEADER_SEARCH_PATHS']
          puts "  [DIAG]   Config \#{config.name}: current HEADER_SEARCH_PATHS = \#{current.inspect}"
          search_paths = current.is_a?(Array) ? current : (current || '$(inherited)').split
          new_path = "\\"\#{react_common_path}\\""
          unless search_paths.any? { |p| p.include?('ReactCommon') }
            search_paths << new_path
            config.build_settings['HEADER_SEARCH_PATHS'] = search_paths
            puts "  [DIAG]   Added \#{new_path} to HEADER_SEARCH_PATHS"
          else
            puts "  [DIAG]   ReactCommon already in HEADER_SEARCH_PATHS, skipping"
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

      // 3. Add post_install fix: add Firebase framework header search path for
      //    RNFBFirestore. RNFBFirestore.podspec depends on Firebase/Firestore
      //    (a subspec) which depends on Firebase/CoreOnly. The Firebase/CoreOnly
      //    subspec provides the umbrella header Firebase.h. When
      //    use_frameworks! :static is set, CocoaPods builds Firebase as a static
      //    framework (Firebase.framework) with Firebase.h in its Headers dir.
      //    RNFBFirestore includes <Firebase/Firebase.h> which is a framework-style
      //    import that resolves via FRAMEWORK_SEARCH_PATHS. Since RNFBFirestore
      //    depends on Firebase/Firestore (not Firebase directly), CocoaPods only
      //    adds FirebaseFirestore.framework to its framework search paths, not
      //    Firebase.framework. We add it explicitly.
      //    We use FRAMEWORK_SEARCH_PATHS instead of HEADER_SEARCH_PATHS because
      //    <Firebase/Firebase.h> is a framework-style import that resolves via
      //    framework search paths when modules/frameworks are enabled.
      //    IMPORTANT: We use '$(inherited)' as the default when FRAMEWORK_SEARCH_PATHS
      //    or HEADER_SEARCH_PATHS is nil, to preserve xcconfig values from CocoaPods.
      //    Without this, we override the xcconfig and lose dependency framework
      //    search paths (e.g., RNFBApp.framework, FirebaseFirestore.framework).
      const firebaseFrameworkFix = `
    # Fix: add Firebase framework search path for RNFBFirestore.
    # RNFBFirestore depends on Firebase/Firestore (subspec) which depends on
    # Firebase/CoreOnly. When use_frameworks! :static is set, Firebase is built
    # as Firebase.framework with Firebase.h in its Headers directory. Since
    # RNFBFirestore includes <Firebase/Firebase.h> but doesn't directly depend
    # on Firebase, CocoaPods doesn't add Firebase.framework to its framework
    # search paths. We add it explicitly via FRAMEWORK_SEARCH_PATHS.
    firebase_framework_path = "\\"\${PODS_CONFIGURATION_BUILD_DIR}/Firebase\\""
    firebase_headers_path = "\\"\${PODS_CONFIGURATION_BUILD_DIR}/Firebase/Firebase.framework/Headers\\""
    installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|
      if pod_name == 'RNFBFirestore'
        puts "  [DIAG] Found RNFBFirestore target, checking build settings..."
        target_installation_result.native_target.build_configurations.each do |config|
          puts "  [DIAG]   Config: \#{config.name}"
          # Add to FRAMEWORK_SEARCH_PATHS so <Firebase/Firebase.h> resolves
          # IMPORTANT: Use $(inherited) as default when nil, to preserve xcconfig values.
          current_fw = config.build_settings['FRAMEWORK_SEARCH_PATHS']
          puts "  [DIAG]   Current FRAMEWORK_SEARCH_PATHS: \#{current_fw.inspect}"
          fw_search_paths = current_fw.is_a?(Array) ? current_fw : (current_fw || '$(inherited)').split
          unless fw_search_paths.any? { |p| p.include?('Firebase') }
            fw_search_paths << firebase_framework_path
            config.build_settings['FRAMEWORK_SEARCH_PATHS'] = fw_search_paths
            puts "  [DIAG]   Added \#{firebase_framework_path} to FRAMEWORK_SEARCH_PATHS"
          else
            puts "  [DIAG]   Firebase already in FRAMEWORK_SEARCH_PATHS, skipping"
          end
          # Also add to HEADER_SEARCH_PATHS as a fallback (framework headers dir)
          # IMPORTANT: Use $(inherited) as default when nil, to preserve xcconfig values.
          current_hdr = config.build_settings['HEADER_SEARCH_PATHS']
          puts "  [DIAG]   Current HEADER_SEARCH_PATHS: \#{current_hdr.inspect}"
          hdr_search_paths = current_hdr.is_a?(Array) ? current_hdr : (current_hdr || '$(inherited)').split
          unless hdr_search_paths.any? { |p| p.include?('Firebase') }
            hdr_search_paths << firebase_headers_path
            config.build_settings['HEADER_SEARCH_PATHS'] = hdr_search_paths
            puts "  [DIAG]   Added \#{firebase_headers_path} to HEADER_SEARCH_PATHS"
          else
            puts "  [DIAG]   Firebase already in HEADER_SEARCH_PATHS, skipping"
          end
        end
        puts "  - Added Firebase framework search path for RNFBFirestore"
      end
    end`;

      if (!contents.includes('Firebase framework search path for RNFBFirestore')) {
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${firebaseFrameworkFix}$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
