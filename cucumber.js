module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    requireModule: ['dotenv/config', 'ts-node/register'],
    require: ['features/support/**/*.ts', 'features/step-definitions/**/*.ts'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    publishQuiet: true
  }
};
