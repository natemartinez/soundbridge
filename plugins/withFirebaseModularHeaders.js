const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Configures iOS Podfile for Firebase + React Native compatibility.
 *
 * Strategy: Instead of modifying config.build_settings on pod targets in the
 * post_install hook (which has $(inherited) expansion issues), we modify the
 * xcconfig files directly. CocoaPods stores per-pod build settings in xcconfig
 * files at Pods/Target Support Files/{pod_name}/{pod_name}.xcconfig. By
 * modifying these files directly, we avoid the $(inherited) problem entirely
 * because we're working at the xcconfig level — the source of truth.
 *
 * This approach is inspired by React Native's own modify_flags_for_new_architecture
 * which uses aggregate_target.xcconfigs to modify xcconfig files directly.
 *
 * Problem chain:
 * 1. Firebase Swift pods (Auth, Firestore) depend on ObjC pods that don't
 *    define clang modules. Without module maps, Swift can't import them →
 *    pod install fails: "cannot yet be integrated as static libraries".
 * 2. use_frameworks! :static (set via expo-build-properties) builds ALL pods
 *    as static frameworks, which automatically generates module maps. This
 *    makes use_modular_headers! redundant and actually causes conflicts.
 * 3. RNFBApp is built as a static framework module and includes non-modular
 *    React-Core headers. Setting CLANG_ALLOW_NON_MODULAR_INCLUDES=YES resolves.
 * 4. stripe-react-native includes RCTFollyConvert.h which transitively includes
 *    <react/utils/FollyConvert.h>. We add ReactCommon to HEADER_SEARCH_PATHS
 *    in its xcconfig file.
 * 5. RNFBFirestore includes <Firebase/Firebase.h> but only depends on
 *    Firebase/Firestore (subspec). We add Firebase.framework to
 *    FRAMEWORK_SEARCH_PATHS in its xcconfig file.
 */
module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // --- Clean up previous approaches ---

      // Remove use_modular_headers! if previously added
      contents = contents.replace(/\n\nuse_modular_headers!\n/g, '\n');

      // Remove selective per-pod modular headers (old approach)
      contents = contents.replace(
        /\n\n  # Firebase pods require modular headers[\s\S]*?RecaptchaInterop.*?(?=\n\n)/g,
        ''
      );

      // Remove CLANG_ALLOW_NON_MODULAR_INCLUDES block (old use_frameworks! approach)
      contents = contents.replace(
        /\n\n    # Allow react-native-firebase[\s\S]*?    end\n(?=  end\nend)/,
        '\n'
      );

      // Remove gRPC fix if previously added
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

      // Remove React-utils header search paths fix (OTHER_CFLAGS variant)
      contents = contents.replace(
        /\n\n    # Fix: add React-utils header search paths via OTHER_CFLAGS[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove Firebase/CoreOnly header search path fix
      contents = contents.replace(
        /\n\n    # Fix: add Firebase\/CoreOnly header search path[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove Firebase framework header search path fix
      contents = contents.replace(
        /\n\n    # Fix: add Firebase framework header search path[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove Firebase framework search path fix
      contents = contents.replace(
        /\n\n    # Fix: add Firebase framework search path[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // Remove the old xcconfig-based fix if previously added
      contents = contents.replace(
        /\n\n    # Fix: patch xcconfig files for header and framework search paths[\s\S]*?    end(?=\n  end\nend)/,
        ''
      );

      // --- Apply fixes ---

      // 1. CLANG_ALLOW_NON_MODULAR_INCLUDES for affected pods.
      //    This must use installer.pods_project.targets because it's a per-target
      //    build setting that doesn't appear in xcconfig files.
      const nonModularFix = `
    # Fix: allow non-modular includes in framework modules (RNFBApp, etc.).
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

      // 2. Patch xcconfig files for header and framework search paths.
      //    Instead of modifying config.build_settings (which has $(inherited)
      //    expansion issues), we modify the xcconfig files directly. CocoaPods
      //    stores per-pod build settings in xcconfig files at:
      //      Pods/Target Support Files/{pod_name}/{pod_name}.xcconfig
      //    By modifying these files directly, we avoid $(inherited) issues
      //    because we're working at the xcconfig level — the source of truth.
      //    This is the same approach React Native uses in
      //    modify_flags_for_new_architecture (new_architecture.rb:53-59).
      const xcconfigPatch = `
    # Fix: patch xcconfig files for header and framework search paths.
    # Instead of modifying config.build_settings (which has $(inherited)
    # expansion issues), we modify the xcconfig files directly. CocoaPods
    # stores per-pod build settings in xcconfig files at:
    #   Pods/Target Support Files/{pod_name}/{pod_name}.xcconfig
    # By modifying these files directly, we avoid $(inherited) issues
    # because we're working at the xcconfig level — the source of truth.
    installation_root = installer.config.installation_root
    pods_target_dir = File.join(installation_root, 'Pods', 'Target Support Files')

    # Resolve ReactCommon path for React-utils header fix
    react_common_path = File.join(
      File.dirname(\`node --print "require.resolve('react-native/package.json')"\`),
      'ReactCommon'
    )
    puts "  [DIAG] ReactCommon path: \#{react_common_path}"

    # Paths for Firebase framework fix
    firebase_framework_path = "\\"\${PODS_CONFIGURATION_BUILD_DIR}/Firebase\\""
    firebase_headers_path = "\\"\${PODS_CONFIGURATION_BUILD_DIR}/Firebase/Firebase.framework/Headers\\""

    # Pods that need ReactCommon in HEADER_SEARCH_PATHS
    folly_pods = [
      'stripe-react-native',
      'RNFBApp',
      'RNFBAuth',
      'RNFBFirestore',
      'RNFBSharedUtils',
    ]

    folly_pods.each do |pod_name|
      xcconfig_path = File.join(pods_target_dir, pod_name, "\#{pod_name}.xcconfig")
      if File.exist?(xcconfig_path)
        puts "  [DIAG] Patching \#{pod_name}.xcconfig for ReactCommon header path..."
        xcconfig = Xcodeproj::Config.new(xcconfig_path)
        current = xcconfig.attributes['HEADER_SEARCH_PATHS'] || '$(inherited)'
        unless current.include?('ReactCommon')
          xcconfig.attributes['HEADER_SEARCH_PATHS'] = "\#{current} \\"\#{react_common_path}\\""
          xcconfig.save_as(xcconfig_path)
          puts "  [DIAG]   Added ReactCommon path to HEADER_SEARCH_PATHS"
        else
          puts "  [DIAG]   ReactCommon already in HEADER_SEARCH_PATHS, skipping"
        end
      else
        puts "  [DIAG]   xcconfig not found at \#{xcconfig_path}, skipping"
      end
    end

    # Patch RNFBFirestore.xcconfig for Firebase framework search path
    firestore_xcconfig_path = File.join(pods_target_dir, 'RNFBFirestore', 'RNFBFirestore.xcconfig')
    if File.exist?(firestore_xcconfig_path)
      puts "  [DIAG] Patching RNFBFirestore.xcconfig for Firebase framework path..."
      xcconfig = Xcodeproj::Config.new(firestore_xcconfig_path)

      # Add to FRAMEWORK_SEARCH_PATHS
      current_fw = xcconfig.attributes['FRAMEWORK_SEARCH_PATHS'] || '$(inherited)'
      unless current_fw.include?('Firebase')
        xcconfig.attributes['FRAMEWORK_SEARCH_PATHS'] = "\#{current_fw} \#{firebase_framework_path}"
        puts "  [DIAG]   Added \#{firebase_framework_path} to FRAMEWORK_SEARCH_PATHS"
      else
        puts "  [DIAG]   Firebase already in FRAMEWORK_SEARCH_PATHS, skipping"
      end

      # Also add to HEADER_SEARCH_PATHS as fallback
      current_hdr = xcconfig.attributes['HEADER_SEARCH_PATHS'] || '$(inherited)'
      unless current_hdr.include?('Firebase')
        xcconfig.attributes['HEADER_SEARCH_PATHS'] = "\#{current_hdr} \#{firebase_headers_path}"
        puts "  [DIAG]   Added \#{firebase_headers_path} to HEADER_SEARCH_PATHS"
      else
        puts "  [DIAG]   Firebase already in HEADER_SEARCH_PATHS, skipping"
      end

      xcconfig.save_as(firestore_xcconfig_path)
    else
      puts "  [DIAG]   RNFBFirestore.xcconfig not found, skipping"
    end`;

      if (!contents.includes('patch xcconfig files for header and framework search paths')) {
        contents = contents.replace(
          /(\n  end\nend\s*$)/,
          `\n${xcconfigPatch}$1`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
