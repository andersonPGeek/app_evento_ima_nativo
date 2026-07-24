const { withProjectBuildGradle, createRunOncePlugin } = require('@expo/config-plugins');

const PLUGIN_TAG = '[withSqlite16kb]';

function withSqlite16kb(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      return config;
    }

    if (config.modResults.contents.includes(PLUGIN_TAG)) {
      return config;
    }

    config.modResults.contents += `

// ${PLUGIN_TAG} Force 16KB-page-aligned sqlite-bundled across all subprojects.
allprojects {
  configurations.all {
    resolutionStrategy {
      force 'androidx.sqlite:sqlite-bundled:2.6.2'
    }
  }
}`;

    return config;
  });
}

module.exports = createRunOncePlugin(withSqlite16kb, 'with-sqlite-16kb', '1.0.0');
