// import path from 'path';

import * as karma from 'karma';

module.exports = (config: karma.Config & { debug?: boolean }) => {
    config.set({
        frameworks: ['mocha', 'karma-typescript'],
        files: [
            // { pattern: 'test/common/**/*.ts', included: false },
            // { pattern: 'test/worker/**/*.ts', included: false },
            'src/lib/**/*.ts',
            'test/**/*.ts',
            { pattern: 'test/data/**/*', watched: false, included: false, served: true },
        ],
        proxies:  {
            '/test/data/': '/base/test/data/',
        },
        preprocessors: {
            '**/*.ts': 'karma-typescript',
        },
        reporters: ['mocha'],
        browsers: [ config.debug ? 'ChromeInsecure' : 'ChromeHeadless'],
        karmaTypescriptConfig: {
            tsconfig: './tsconfig.tests.json',
            coverageOptions: {
                instrumentation: false,
              },
        },
        mochaReporter: {
            showDiff: true,
          },
        client: {
            captureConsole: config.debug,
            mocha: {
               reporter: 'html',
            },
        },
        singleRun: !config.debug,
        customLaunchers: {
            'ChromeInsecure': {
                'base': 'Chrome',
                'flags': ['--disable-web-security'],
            },
        },
    } as unknown as karma.ConfigOptions);
}
