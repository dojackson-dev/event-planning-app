#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Post-install: Fixing Expo SDK 50 CocoaPods compatibility...');

// Fix Expo.podspec to remove get_folly_config dependency
const expoPodspecPath = path.join(__dirname, '..', 'node_modules', 'expo', 'Expo.podspec');

if (fs.existsSync(expoPodspecPath)) {
  let podspecContent = fs.readFileSync(expoPodspecPath, 'utf8');
  
  // Replace get_folly_config() call with hardcoded flags
  if (podspecContent.includes('get_folly_config')) {
    podspecContent = podspecContent.replace(
      /compiler_flags\s*=\s*get_folly_config\(\)\[:compiler_flags\]/g,
      'compiler_flags = "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -Wno-comma -Wno-shorten-64-to-32"'
    );
    
    fs.writeFileSync(expoPodspecPath, podspecContent);
    console.log('✅ Fixed Expo.podspec - removed get_folly_config dependency');
  } else {
    console.log('✅ Expo.podspec does not use get_folly_config');
  }
} else {
  console.log('⚠️  Expo.podspec not found');
}

console.log('Post-install completed');
