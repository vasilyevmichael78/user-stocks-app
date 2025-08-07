const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'swc', // Use SWC instead of TSC for faster compilation
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
  cache: {
    type: 'filesystem', // Enable filesystem caching
    buildDependencies: {
      config: [__filename],
    },
  },
  externals: {
    // Don't bundle large dependencies that are available in node_modules
    'class-validator': 'commonjs2 class-validator',
    'class-transformer': 'commonjs2 class-transformer',
    'mongoose': 'commonjs2 mongoose',
    'bcryptjs': 'commonjs2 bcryptjs',
    '@nestjs/common': 'commonjs2 @nestjs/common',
    '@nestjs/core': 'commonjs2 @nestjs/core',
    '@nestjs/mongoose': 'commonjs2 @nestjs/mongoose',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};
